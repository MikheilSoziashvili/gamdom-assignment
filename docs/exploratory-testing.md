# Exploratory Testing Charter — Gamdom.com

**Platform:** Gamdom.com (iGaming / Casino)
**Prepared by:** Senior QA Engineer
**Date:** 2026-02-25
**Session Type:** Structured Exploratory Testing

---

## Overview

This document defines exploratory testing charters for five critical business areas of the Gamdom.com platform. Each charter provides scope, targeted test ideas, identified risks, and a priority rating. The goal is to uncover defects, usability issues, and edge-case failures that scripted test suites typically miss.

Exploratory testing here follows the **SBTM (Session-Based Test Management)** approach: time-boxed sessions with defined charters, real-time note-taking, and a debrief artifact (this document). Each area should be explored in a dedicated 60–90 minute session.

---

## Area 1 — User Registration & Authentication

### Scope

All flows relating to creating a new account, authenticating an existing account, securing the account (2FA), managing active sessions, connecting social login providers, and recovering access to a locked or forgotten account.

### Test Charter

> Explore the registration and authentication flows on Gamdom.com to discover usability defects, security weaknesses, edge-case validation failures, and session management issues, with particular attention to boundary conditions and unexpected input sequences.

### Key Test Ideas

| # | Test Idea | Technique | Notes |
|---|-----------|-----------|-------|
| 1 | Submit registration with an email already in use — expect duplicate error, not a 500 | Boundary / Error handling | Check error message leaks no internal detail |
| 2 | Use disposable/temporary email addresses (e.g., mailinator.com) | Policy validation | Platform may block them; verify the error is clear |
| 3 | Submit usernames with special characters: `admin'--`, `<script>alert(1)</script>`, emoji | Input attack | Confirm sanitisation and no XSS reflection |
| 4 | Attempt login with correct password but wrong case (case-sensitivity) | Boundary | Passwords should be case-sensitive |
| 5 | Rapid-fire login attempts — check rate limiting / CAPTCHA trigger | Security | Brute-force protection must activate |
| 6 | Enable TOTP 2FA, log in from a new browser without TOTP code | Security | Access should be blocked pending 2FA |
| 7 | Use an expired/invalid TOTP code — verify rejection | Security | Replay-attack protection |
| 8 | Disable 2FA without re-authenticating — expect re-auth challenge | Security | Disabling 2FA must require password confirmation |
| 9 | Open the same account in two browser tabs — modify session in one, check the other | Session management | Session invalidation must propagate |
| 10 | Disconnect social login provider mid-session (revoke OAuth token externally) | Social auth | App should degrade gracefully |
| 11 | Connect a social account that is already linked to a different Gamdom account | Edge case | Expect a clear conflict error, not a silent merge |
| 12 | Initiate password reset and let the link expire, then attempt to use it | Expiry | Should be cleanly rejected |
| 13 | Initiate two password-reset emails — use the older link after the newer link was used | Token invalidation | Older token should be invalidated immediately |
| 14 | Log in on mobile viewport and desktop simultaneously — check session limits | Multi-device | Verify behaviour matches documented session policy |
| 15 | Complete registration but abandon before email verification — attempt login | Incomplete flow | Should present clear verification prompt |

### Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Stored XSS via unsanitised username field | Medium | Critical | Input sanitisation + CSP headers |
| Brute-force login with no rate limiting | High | Critical | Rate limiting / CAPTCHA |
| Session token not invalidated on logout | Medium | High | Server-side session invalidation |
| Expired reset tokens accepted | Low | High | Token TTL enforcement |
| Social OAuth token reuse after revocation | Low | Medium | Token introspection on each request |
| Email enumeration via distinct error messages | High | Medium | Normalise error messages |

### Priority

**P0 — Critical.** Authentication is the security boundary of the entire platform. Any weakness here exposes player funds and personal data.

---

## Area 2 — Deposit / Withdrawal (Cashier)

### Scope

All cashier functionality: initiating and completing crypto deposits, initiating withdrawals, observing wallet balance updates in real time, viewing transaction history, enforcing minimum/maximum amounts, and expected processing timelines.

### Test Charter

> Explore the cashier module to uncover issues with balance accuracy, transaction state transitions, edge-case amount handling, and the reliability of deposit/withdrawal flows under normal and degraded network conditions.

### Key Test Ideas

| # | Test Idea | Technique | Notes |
|---|-----------|-----------|-------|
| 1 | Initiate a deposit and monitor balance — verify it updates only after required blockchain confirmations | State transition | Balance must not credit before confirmation threshold |
| 2 | Send a deposit that is exactly at the minimum threshold | Boundary value | Should be accepted |
| 3 | Send a deposit 1 satoshi below the minimum | Boundary value | Should be handled — either rejected or held pending |
| 4 | Initiate a withdrawal and immediately close the browser — reopen and check status | Interruption | Transaction must persist; no phantom deductions |
| 5 | Request withdrawal for an amount exactly equal to available balance | Boundary value | Full-balance withdrawal must be supported |
| 6 | Attempt two simultaneous withdrawals from two browser tabs | Race condition | Only one should succeed or both should be queued correctly |
| 7 | Withdraw while a deposit is unconfirmed (pending) | Concurrent state | Pending balance should not be counted as available |
| 8 | Check transaction history pagination for accuracy with many transactions | Data integrity | Page boundaries must not skip or duplicate records |
| 9 | Filter transaction history by type (deposit / withdrawal) — cross-check totals | Filtering | Totals in filtered view must match full-history totals |
| 10 | Observe balance update latency after a confirmed deposit | Performance | Define an acceptable SLA (e.g., < 30 s) |
| 11 | Check that wallet address for a deposit is unique per session/request | Security | Address reuse can cause attribution errors |
| 12 | Submit a withdrawal to a wallet address with an invalid checksum | Validation | Must be rejected with a clear error before broadcast |
| 13 | Trigger a withdrawal when account KYC is incomplete | Compliance | Withdrawal must be blocked and user directed to KYC |
| 14 | Check for bonus wagering requirements blocking withdrawal | Business rules | Error message must clearly state unmet requirements |
| 15 | Verify fiat conversion rates displayed vs. executed | Accuracy | Rate should be locked or clearly labelled as indicative |

### Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Double-spend from concurrent withdrawal requests | Low | Critical | Database-level transaction locks |
| Balance credited before blockchain confirmation | Low | Critical | Confirmation count enforcement |
| Withdrawal to invalid address without validation | Medium | High | Client + server-side address validation |
| Transaction history gaps under load | Medium | High | Paginated queries with consistent cursors |
| Conversion rate mismatch (displayed vs. executed) | Medium | Medium | Lock rate at submission or display disclaimer |
| KYC bypass enabling withdrawal | Low | Critical | Server-side KYC gate, not only UI |

### Priority

**P0 — Critical.** Financial transactions directly impact player funds and company liability. Errors here are irreversible.

---

## Area 3 — Game Lobby & Game Launch

### Scope

The game lobby interface including search, category/provider filtering, game card display, favourite functionality, game loading (both real-money and demo modes), provider SDK integration, and error handling when a game fails to load.

### Test Charter

> Explore the game lobby and game launch flows to identify usability issues, incorrect filtering results, broken game loads, provider integration failures, and inconsistencies between demo and real-money modes.

### Key Test Ideas

| # | Test Idea | Technique | Notes |
|---|-----------|-----------|-------|
| 1 | Search for a game by exact title — verify it appears first | Relevance | Exact match should rank above partial matches |
| 2 | Search for a game using partial name, accented characters, or alternate spelling | Fuzzy search | Platform should tolerate minor spelling variation |
| 3 | Apply multiple filters simultaneously (provider + category + feature) | Combined filtering | Results must satisfy all active filters |
| 4 | Clear all filters — verify lobby returns to unfiltered state | State reset | No ghost filters should persist |
| 5 | Launch a game and immediately navigate back — return to lobby, relaunch | Navigation | Game should relaunch cleanly without stale state |
| 6 | Launch a game in demo mode while logged out | Guest access | Demo mode should be accessible without an account |
| 7 | Launch a real-money game while logged out — expect redirect to login | Auth gate | Should not silently fail or show a broken game frame |
| 8 | Launch a game on mobile viewport — check responsive layout of game frame | Responsive | iFrame must resize correctly; controls must be reachable |
| 9 | Launch a game and throttle network to 3G mid-session | Network degradation | Game should handle gracefully; not corrupt game state |
| 10 | Search for a non-existent game — verify empty-state messaging | Empty state | Must show informative message, not a blank page |
| 11 | Add games to favourites and verify persistence across sessions | Persistence | Favourites must be user-scoped and survive logout/login |
| 12 | Observe game card thumbnails on slow connection — check for missing images | Asset loading | Broken images must show placeholder, not broken icon |
| 13 | Launch a game from a provider currently in maintenance | Provider error | Clear error message, not an infinite spinner |
| 14 | Switch between real-money and demo mode without relaunching | Mode switching | Balance context must update correctly |
| 15 | Check recently played section updates after each game session | Recency tracking | Last played game must appear first after session ends |

### Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Real-money game accessible without authentication | Low | Critical | Server-side auth check before game token issuance |
| Game state corruption on network interruption | Medium | High | Provider SDK reconnection logic |
| Demo mode inadvertently using real balance | Low | Critical | Strict mode parameter in game launch URL |
| Filter state persisting between user sessions | Medium | Low | Clear filter state on session end |
| Provider downtime shows unhandled error | High | Medium | Global error boundary with maintenance message |
| Game card images from CDN failing silently | Medium | Low | Fallback placeholder assets |

### Priority

**P1 — High.** The game lobby is the primary revenue-generating surface. A broken game launch is a direct loss of player engagement and revenue.

---

## Area 4 — Sports / Esports Betting

### Scope

Sports and esports event browsing, bet slip construction, live in-play betting, real-time odds update handling, bet placement end-to-end, settlement accuracy, and access to bet history.

### Test Charter

> Explore the sports and esports betting flows to uncover issues with odds accuracy, bet slip state management, live betting race conditions, settlement errors, and edge-case bet amounts near limits.

### Key Test Ideas

| # | Test Idea | Technique | Notes |
|---|-----------|-----------|-------|
| 1 | Add a selection to the bet slip and observe odds — do they update live? | Real-time | Odds change must be reflected in slip immediately |
| 2 | Add a selection, odds change, attempt to confirm — check for odds-changed warning | Race condition | Platform should warn and require re-acceptance |
| 3 | Place a bet at exactly the minimum stake | Boundary value | Must be accepted |
| 4 | Place a bet at exactly the maximum stake | Boundary value | Must be accepted; above maximum must be rejected |
| 5 | Place an accumulator (parlay) with 2, 5, and 10 selections | Combination | Combined odds must be mathematically correct |
| 6 | Add a selection to a bet slip, the event goes live — check slip behaviour | State transition | Pre-match odds vs live odds distinction must be clear |
| 7 | Place a bet on a live event during a break in play | Edge case | Betting should be suspended; clear messaging required |
| 8 | Place a bet and immediately check bet history — latency of record appearance | Latency | Bet must appear in history within an acceptable window |
| 9 | Check that settled bets show correct return amount (stake × odds) | Calculation | Manually verify payout arithmetic |
| 10 | Void a selection in an accumulator mid-event — check slip recalculation | Void handling | Remaining legs should recalculate correctly |
| 11 | Attempt to bet on an event that has already started (clock drift) | Timing | Server-side event-start validation must prevent late bets |
| 12 | Place a bet and navigate away before confirmation — confirm bet status | Interruption | Bet must not be placed without explicit confirmation |
| 13 | Filter bet history by sport/esport, date range, and status | Filtering | All filter combinations must return accurate results |
| 14 | Check esports-specific data: map scores, player kill counts for in-play | Data accuracy | Esports data feed must update correctly and match source |
| 15 | Test on mobile: add selections, adjust stake on virtual keyboard | Mobile UX | Keyboard overlap must not obscure confirm button |

### Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Bet accepted after event start due to clock drift | Medium | High | Server-side timestamp validation |
| Odds update race condition allows advantaged bet | Low | High | Accept/reject at confirmed odds; warn on change |
| Incorrect accumulator payout calculation | Low | Critical | Server-side payout calculation; UI is display only |
| Bet slip state lost on page refresh | Medium | Medium | LocalStorage or server-side slip persistence |
| Live data feed outage shows stale odds | Medium | High | Feed health monitoring; suspend betting on gap |
| Settled bets show wrong status | Low | Critical | Settlement reconciliation job with audit log |

### Priority

**P1 — High.** Betting is a core revenue stream. Settlement errors and race conditions carry both financial and regulatory risk.

---

## Area 5 — Responsible Gaming & Compliance

### Scope

All responsible gaming tools: voluntary self-exclusion, deposit limit setting and enforcement, session time reminders, reality checks, age verification gating, and any regulatory compliance overlays required for the platform's licensed jurisdictions.

### Test Charter

> Explore responsible gaming and compliance features to verify that all player-protection controls are enforced server-side, cannot be bypassed by UI manipulation, apply immediately as required by regulation, and that age verification gates are robust against circumvention.

### Key Test Ideas

| # | Test Idea | Technique | Notes |
|---|-----------|-----------|-------|
| 1 | Set a deposit limit and attempt to deposit above it | Enforcement | Must be blocked; not merely warned |
| 2 | Set a deposit limit, then immediately try to increase it | Cool-off period | Increases must be subject to regulatory cool-off (e.g., 24 h) |
| 3 | Attempt to decrease a deposit limit — check if it takes effect immediately | Immediacy | Decreases must apply immediately per regulation |
| 4 | Initiate self-exclusion and attempt to log back in before period ends | Enforcement | Login must be blocked with clear message |
| 5 | Initiate self-exclusion and attempt account creation with same email | Circumvention | New account under same email/identity must be blocked |
| 6 | Set a session time reminder and play past the reminder threshold | Trigger | Reminder overlay must appear on schedule |
| 7 | Dismiss the session reminder and check if it re-triggers correctly | Re-trigger | Must re-trigger per the configured interval |
| 8 | Modify the deposit limit via direct API call (bypass UI) | API security | Server must enforce limits regardless of UI |
| 9 | Inspect localStorage/cookies for limit values — attempt to tamper | Client-side bypass | Limits must be server-enforced, not client-stored |
| 10 | Check that age verification is required before first deposit | Compliance gate | KYC/age gate must precede any financial transaction |
| 11 | Submit age verification with a document showing under-18 | Rejection | Account must be suspended, not just flagged |
| 12 | Check responsible gaming links appear in footer and cashier | Discoverability | Regulatory requirement in most jurisdictions |
| 13 | Verify that self-exclusion confirmation email is sent immediately | Communication | Regulatory requirement; must not be delayed |
| 14 | Set a loss limit and verify it is applied across all game types | Cross-product | Limit must apply to casino, sports, and live casino |
| 15 | Check that excluded players cannot be targeted by promotional emails | Marketing compliance | CRM must honour exclusion status |

### Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Self-exclusion bypassable via API | Low | Critical | Server-side enforcement, not UI-only |
| Deposit limit increase without cool-off period | Medium | Critical | Cool-off enforced in backend logic |
| Session reminders suppressed by browser focus loss | Medium | Medium | Time-based trigger independent of focus events |
| Age verification accepted for under-18 documents | Low | Critical | Manual review + automated ID check integration |
| Loss limits not applied cross-product | Medium | High | Unified limit service across all verticals |
| Excluded player receives marketing communication | Medium | High | Exclusion status propagated to CRM in real time |

### Priority

**P0 — Critical.** Responsible gaming failures carry regulatory sanction risk including licence revocation, substantial fines, and reputational damage. These features must be treated as hard requirements.

---

## Summary Table

| Area | Priority | Session Time | Primary Risk Category |
|------|----------|-------------|----------------------|
| User Registration & Authentication | P0 | 90 min | Security / Account takeover |
| Deposit / Withdrawal (Cashier) | P0 | 90 min | Financial integrity |
| Game Lobby & Game Launch | P1 | 60 min | Revenue / UX |
| Sports / Esports Betting | P1 | 60 min | Financial / Data accuracy |
| Responsible Gaming & Compliance | P0 | 90 min | Regulatory / Legal |

---

## Notes on Tooling for Sessions

- **Browser DevTools** — Network tab for API call inspection, Application tab for storage tampering tests, Console for XSS reflection checks.
- **Burp Suite / OWASP ZAP** — Intercept and replay requests for server-side enforcement checks (deposit limits, self-exclusion bypass).
- **Multiple browser profiles** — Simulate concurrent sessions without sharing cookies.
- **Throttling profiles** — Chrome DevTools network presets (3G, Offline) for degraded-network scenarios.
- **Test accounts** — Maintain a set of accounts in known states: unverified, KYC-complete, self-excluded, limit-set.
