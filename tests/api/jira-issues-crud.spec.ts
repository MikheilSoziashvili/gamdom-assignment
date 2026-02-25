import { test, expect } from '../../src/fixtures/api.fixtures';
import { IssueFactory } from '../../src/data/factories/issue.factory';

const PROJECT_KEY = process.env.JIRA_PROJECT_KEY || 'DEV';

test.describe.serial('JIRA Issue CRUD Lifecycle', () => {
  let issueKey: string;

  test('Create — POST new issue returns valid key', async ({ jiraClient }) => {
    const payload = IssueFactory.createTask(PROJECT_KEY);
    const created = await jiraClient.createIssue(payload);

    expect(created.key).toMatch(new RegExp(`^${PROJECT_KEY}-\\d+$`));
    expect(created.id).toBeTruthy();
    issueKey = created.key;
  });

  test('Read — GET issue returns matching fields', async ({ jiraClient }) => {
    const issue = await jiraClient.getIssue(issueKey);

    expect(issue.key).toBe(issueKey);
    expect(issue.fields.summary).toContain('[Auto] Test Task');
    expect(issue.fields.issuetype.name).toBe('Task');
  });

  test('Update — PUT issue summary and verify change', async ({ jiraClient }) => {
    const updatedSummary = `[Auto] Updated Task ${Date.now()}`;
    await jiraClient.updateIssue(issueKey, { summary: updatedSummary });

    const issue = await jiraClient.getIssue(issueKey);
    expect(issue.fields.summary).toBe(updatedSummary);
  });

  test('Search — GET search with JQL finds the issue', async ({ jiraClient }) => {
    const result = await jiraClient.searchIssues(`key = ${issueKey}`);

    expect(result.total).toBe(1);
    expect(result.issues[0].key).toBe(issueKey);
  });

  test('Delete — DELETE issue and verify 404 on GET', async ({ jiraClient }) => {
    await jiraClient.deleteIssue(issueKey);

    await expect(async () => {
      await jiraClient.getIssue(issueKey);
    }).rejects.toThrow(/404/);
  });
});
