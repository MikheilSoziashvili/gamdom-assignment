# Complex Scenario Analysis — Live Crash Game (Gamdom.com)

**Prepared by:** Senior QA Engineer
**Date:** 2026-02-25
**Game Type:** Multiplayer Provably Fair Crash Game
**Scope:** Functional, Integration, Performance, and Security testing of the Crash game lifecycle

---

## 1. Scenario Description

### What Is the Crash Game?

The Crash game is a provably fair, multiplayer betting game where a multiplier begins at **1.00x** and climbs continuously until the game "crashes" at a randomly predetermined point. Players place bets before each round begins, then decide when to cash out during the ascending multiplier. If a player cashes out before the crash, they receive their stake multiplied by the cashout multiplier. If the game crashes before they cash out, they lose their stake.

### Round Lifecycle

```
[Betting Phase]  →  [Round Start]  →  [Multiplier Ascending]  →  [Crash Event]  →  [Settlement]
   (5–10 s)              │                 (variable duration)            │              │
                         │                                                │              │
                   All bets locked                              Players who         Payouts
                                                               did not cash         distributed
                                                               out lose stake
```

### Key Characteristics

- **Provably fair**: The crash point is derived from a server seed committed before the round; players can verify after the fact.
- **Real-time multiplayer**: All connected players see the same multiplier simultaneously via WebSocket.
- **Timing-critical**: A cash-out request at 2.50x must be honoured if received by the server before the crash occurs at 2.51x, even with millisecond margins.
- **Concurrent state**: Dozens to hundreds of players interact with shared round state simultaneously.
- **Auto-cashout**: Players may set a target multiplier; the server automatically cashes them out when reached.

---

## 2. Technical Challenges

### 2.1 WebSocket State Management

The game depends entirely on a persistent WebSocket connection. The server broadcasts a continuous stream of state events:

```
game:waiting      → betting window open
game:starting     → bets locked, round about to begin
game:tick         → current multiplier value (emitted ~10× per second)
game:crash        → crash multiplier, round over
game:cashout      → individual player cashout event
game:bet_confirm  → server acknowledgement of a placed bet
```

**Challenges:**
- The client must reconcile its local multiplier display with server ticks; any lag creates a misleading UI.
- Connection drops during an active round must trigger a reconnection that re-synchronises the client to the current round state without treating it as a new round.
- Multiple WebSocket events may arrive in a burst; the client must process them in order and not drop events.
- If the client sends a `cashout` message while disconnected (e.g., queued offline), the server must reject it if the round has already ended.

### 2.2 Race Conditions

The most commercially significant race condition: **a player's cash-out request arriving at the server within milliseconds of the crash point**.

```
Timeline:
  T=0ms    Server calculates crash at multiplier 3.14x
  T=1ms    Server emits game:crash event
  T=2ms    Player's cashout request (for 3.10x auto-cashout) arrives at server
```

The server must evaluate whether the cashout request was received before the crash was finalised. The decision boundary must be deterministic, auditable, and consistent across all concurrent requests.

Additional race conditions:
- Two tabs from the same account both submitting bets for the same round.
- An auto-cashout and a manual cashout arriving simultaneously for the same player in the same round.
- A bet placed while the server transitions from `waiting` to `starting` (round boundary).

### 2.3 Multiplier Precision

The multiplier is a floating-point value that increases non-linearly (typically exponential). Precision issues arise when:

- Displaying the multiplier (e.g., 1.00x vs 1.001x at the very start).
- Computing payouts: `stake × cashout_multiplier` must not accumulate floating-point error.
- Determining auto-cashout trigger: `if (current_multiplier >= target)` comparisons on floats are unreliable without epsilon handling.
- The provably fair verification formula must produce identical results server-side and client-side.

### 2.4 Concurrent Users

Under load, a Crash round may have hundreds of simultaneous participants:
- Every cashout event is broadcast to all connected clients (leaderboard update).
- A burst of cashouts near a popular multiplier (e.g., 2.00x) creates a fan-out of N×N events.
- Settlement must complete for all players atomically — partial settlement creates inconsistent balance states.
- The betting phase with many concurrent bet placements creates contention on the round's participant list.

### 2.5 Timing-Critical Cash-Outs

A cash-out request travels: browser → network → WebSocket server → game engine → database. Each hop introduces latency. The game must define and implement a clear policy:

- **Server-time wins**: the timestamp is recorded when the message arrives at the game engine, not when it leaves the browser.
- The UI must clearly communicate that displayed multiplier is the server's value, and any client-side rendering lag does not advantage or disadvantage the player.
- Auto-cashout target multipliers must be checked server-side, not client-side, to prevent manipulation.

---

## 3. Testing Strategy

### 3.1 State Machine Testing

Model the Crash game as a finite state machine and verify every valid and invalid transition:

```
States:    WAITING → STARTING → IN_PROGRESS → CRASHED → SETTLING → WAITING
```

For each state, test:
- Valid transitions (the happy path).
- Attempting disallowed actions in each state (e.g., placing a bet while `IN_PROGRESS`).
- Interrupting a transition (network drop mid-transition).
- Re-entering a state from an unexpected direction.

### 3.2 WebSocket Mocking and Interception

Use Playwright's `page.on('websocket', ...)` API to intercept and inspect all WebSocket frames. For targeted unit-level integration tests, mock the WebSocket server to emit controlled event sequences:

- Emit a `game:crash` event with no preceding ticks to test empty-round handling.
- Emit `game:tick` events with a non-monotonic multiplier (e.g., 2.50 → 2.40) to test display resilience.
- Delay `game:bet_confirm` beyond a threshold to test timeout handling in the UI.
- Drop the connection mid-round and immediately reconnect; verify the client requests current round state.

### 3.3 Race Condition Simulation

To test the cash-out/crash race condition without access to the server internals:

- Use Playwright to send a cashout WebSocket message and simultaneously trigger the server to crash (in a test environment with a controllable crash point).
- Verify the server's decision is logged, consistent with its declared policy, and matches the settlement outcome.
- Run this scenario thousands of times in a load test harness to confirm no inconsistency exists at the margin.

### 3.4 Provably Fair Verification

- Record the server seed commitment shown before a round.
- After the round, use the revealed server seed and client seed to independently compute the crash point.
- Compare independently computed crash point to the round's recorded crash point.
- Automate this as a regression test across a sample of historical rounds.

### 3.5 Balance Integrity Under Load

- Use a custom load testing harness (k6 or Artillery) to simulate N players all betting on the same round, all cashing out simultaneously.
- After the round, sum all deducted stakes and credited payouts; verify the net matches expected house edge within tolerance.
- Verify no player account ends up with a negative balance.

---

## 4. Key Test Cases

| # | Test Case | Precondition | Steps | Expected Result |
|---|-----------|-------------|-------|-----------------|
| TC-01 | Happy path: bet and manual cashout | Logged in, funded | Place bet during WAITING phase; observe multiplier; click Cashout at ~2.00x | Bet confirmed; payout = stake × cashout multiplier; balance updated correctly |
| TC-02 | Happy path: auto-cashout | Logged in, funded | Place bet with auto-cashout set to 3.00x; do not interact | Server cashes out automatically at ≥3.00x; payout correct |
| TC-03 | Crash before manual cashout | Logged in, funded | Place bet; do not cashout; wait for crash | Stake lost; bet shown as lost in history; balance decreased by stake amount |
| TC-04 | Bet rejected after round starts | Logged in, funded | Attempt to place bet during IN_PROGRESS state (simulate via direct WebSocket message) | Server rejects bet with appropriate error; balance unchanged |
| TC-05 | Cash-out/crash boundary — cashout wins | Test env with controlled crash point | Place bet; send cashout at multiplier M; configure server crash at M+0.01x | Cashout honoured; payout at M; verified in server log |
| TC-06 | Cash-out/crash boundary — crash wins | Test env with controlled crash point | Place bet; send cashout at multiplier M; configure server crash at M−0.01x | Cashout rejected (too late); stake lost; verified in server log |
| TC-07 | WebSocket reconnect mid-round | Active round in progress | Forcibly close WebSocket connection; wait 2 s; reconnect | Client re-synchronises to current multiplier; existing bet preserved; no duplicate bet |
| TC-08 | Concurrent bets from same account | Logged in from two tabs | Place bet from Tab A and Tab B in the same round | Both bets accepted (if within policy), OR second rejected with clear error; no balance corruption |
| TC-09 | Auto-cashout and manual cashout race | Logged in; auto-cashout set | Send manual cashout at same tick auto-cashout would trigger | Only one cashout processed; payout issued once; no duplicate credit |
| TC-10 | Provably fair verification | Complete a round | Note committed server seed; record crash point; compute independently | Computed crash point matches recorded crash point exactly |
| TC-11 | Balance settlement under load | 100 test accounts | All 100 bet on the same round; 50 cashout at 2.00x; 50 do not | All 50 cashouts credited correctly; 50 losses debited; no orphaned transactions |
| TC-12 | Minimum bet boundary | Logged in | Place bet at exactly minimum stake | Bet accepted; full lifecycle completes normally |
| TC-13 | Maximum bet boundary | Logged in | Place bet at maximum stake + 1 unit | Bet rejected at submission; error message shown; balance unchanged |
| TC-14 | Network throttle during active round | Active round, bet placed | Throttle to 2G during multiplier ascent | Multiplier display may lag; auto-cashout still executes server-side at correct value; no lost cashout |
| TC-15 | Round history accuracy | Multiple completed rounds | Compare displayed round history (crash point, player payouts) against server audit log | 100% match across all fields for all rounds in sample |

---

## 5. Tools & Approach

### 5.1 Playwright — WebSocket Interception

```typescript
// Capture and assert WebSocket traffic
test('emits game:tick events during active round', async ({ page }) => {
  const tickMessages: string[] = [];

  page.on('websocket', ws => {
    ws.on('framereceived', frame => {
      if (frame.payload.includes('game:tick')) {
        tickMessages.push(frame.payload);
      }
    });
  });

  await page.goto('https://gamdom.com/crash');
  // Wait for at least one full round cycle
  await page.waitForTimeout(15_000);

  expect(tickMessages.length).toBeGreaterThan(0);
  // Verify monotonic multiplier increase
  const multipliers = tickMessages.map(m => JSON.parse(m).multiplier);
  for (let i = 1; i < multipliers.length; i++) {
    expect(multipliers[i]).toBeGreaterThanOrEqual(multipliers[i - 1]);
  }
});
```

### 5.2 Custom WebSocket Test Harness

For race condition and boundary testing, a custom Node.js harness using the `ws` library connects directly to the game's WebSocket endpoint and sends timed messages with millisecond precision — bypassing browser rendering latency.

```typescript
import WebSocket from 'ws';

class CrashGameClient {
  private ws: WebSocket;

  connect(endpoint: string): Promise<void> { ... }
  placeBet(stake: number): Promise<BetConfirmation> { ... }
  cashOut(): Promise<CashoutResult> { ... }
  onCrash(handler: (multiplier: number) => void): void { ... }
}
```

This harness enables:
- Precise timing measurement of server response latency.
- Scripted concurrent clients for load scenarios.
- Injection of malformed messages to test server-side validation.

### 5.3 Load Testing — k6

```javascript
// k6 load test: 100 concurrent players, same round
import ws from 'k6/ws';
import { check } from 'k6';

export let options = { vus: 100, duration: '5m' };

export default function () {
  const url = 'wss://gamdom.com/crash-ws';
  const res = ws.connect(url, {}, function (socket) {
    socket.on('message', (data) => {
      const event = JSON.parse(data);
      if (event.type === 'game:waiting') {
        socket.send(JSON.stringify({ action: 'bet', stake: 1.00 }));
      }
      if (event.type === 'game:tick' && event.multiplier >= 2.0) {
        socket.send(JSON.stringify({ action: 'cashout' }));
      }
    });
  });
  check(res, { 'Connected successfully': (r) => r && r.status === 101 });
}
```

### 5.4 Playwright Component Isolation

For UI-layer tests that do not require a live WebSocket, mock the WebSocket server using `msw` (Mock Service Worker) or a local `ws` server to feed deterministic event sequences to the game UI:

- Test multiplier display format at boundary values (1.00x, 99.99x, 1000.00x).
- Test crash animation trigger.
- Test cashout button state (enabled/disabled) per game state.
- Test bet history display after a round concludes.

### 5.5 Database / Audit Log Assertions

For end-to-end financial integrity tests (in a staging environment with DB access):

- Query the `rounds` table after each test round to verify recorded crash point.
- Query `bets` and `transactions` tables to verify all settlements are present and arithmetically correct.
- Run cross-table reconciliation queries to detect orphaned bets or unmatched transactions.

---

## 6. Risk Assessment

| Risk Area | Description | Likelihood | Impact | Priority |
|-----------|-------------|-----------|--------|----------|
| Cash-out/crash race condition exploitable | Player consistently receives cashout credit after the crash point due to timing flaw in server validation | Low | Critical | P0 |
| Auto-cashout not triggered at target | Server-side auto-cashout fires at wrong multiplier due to float comparison error | Medium | Critical | P0 |
| Duplicate payout on reconnect | WebSocket reconnect triggers re-processing of a pending cashout, crediting twice | Low | Critical | P0 |
| Round settlement incomplete under load | High concurrent settlement causes partial DB write; some players neither win nor lose | Low | Critical | P0 |
| Client multiplier display lags server | Displayed multiplier is behind server truth; player cashes out believing M but server is already at M+0.5 | High | Medium | P1 |
| Provably fair formula mismatch | Client verification formula differs from server implementation; players cannot independently verify fairness | Low | High | P1 |
| WebSocket connection not restored | After network drop, client does not reconnect; player misses round end; auto-cashout never fires on client | Medium | High | P1 |
| Bet accepted after round start | Clock skew between client and server allows late bets to be accepted for a round already in progress | Medium | High | P1 |
| Bet history data loss | Crash rounds not recorded in history during high-traffic events | Low | Medium | P2 |
| UI crash on extreme multiplier | Frontend rendering fails for multipliers > 1000x (display overflow or animation break) | Low | Low | P3 |

### Highest-Risk Scenario: The Cash-Out/Crash Boundary

This is the single highest-risk scenario because:

1. It is timing-dependent and therefore non-deterministic in production.
2. An exploitable flaw allows a player to reliably profit from late cashouts.
3. It is difficult to reproduce in a standard testing environment without controlled crash points.
4. Financial impact scales linearly with the number of players who discover it.

**Mitigation verification steps:**
- Confirm server records the WebSocket message receipt timestamp, not the game-engine processing timestamp.
- Confirm the crash point is finalised atomically before any cashout requests for that round are processed.
- Confirm the decision log is immutable and auditable per round.
- Run 10,000+ boundary iterations in a load test environment and verify zero inconsistencies.

---

## Appendix: Crash Game State Machine Diagram

```
                          ┌──────────┐
                 ┌───────►│ WAITING  │◄────────────┐
                 │        └────┬─────┘             │
                 │             │ betting_open       │
                 │             ▼                    │
                 │        ┌──────────┐              │
                 │        │ STARTING │              │
                 │        └────┬─────┘              │
                 │             │ all_bets_locked     │
                 │             ▼                    │
                 │       ┌───────────┐              │
                 │       │IN_PROGRESS│              │
                 │       └─────┬─────┘             │
                 │             │ crash_point_hit    │
                 │             ▼                    │
                 │        ┌─────────┐               │
                 │        │ CRASHED │               │
                 │        └────┬────┘               │
                 │             │ settlement_begin   │
                 │             ▼                    │
                 │        ┌──────────┐              │
                 └────────│SETTLING  │──────────────┘
                          └──────────┘
                            settlement_complete
```

Valid player actions per state:

| Action | WAITING | STARTING | IN_PROGRESS | CRASHED | SETTLING |
|--------|---------|----------|-------------|---------|----------|
| Place Bet | YES | NO | NO | NO | NO |
| Cash Out | NO | NO | YES | NO | NO |
| View History | YES | YES | YES | YES | YES |
| Verify Provably Fair | YES (prev rounds) | YES | YES | YES | YES |
