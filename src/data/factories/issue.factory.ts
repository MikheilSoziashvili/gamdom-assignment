import { CreateIssuePayload } from '../../api/jira-api-client';

const timestamp = () => Date.now();

export const IssueFactory = {
  createTask(projectKey: string, overrides?: Partial<CreateIssuePayload['fields']>): CreateIssuePayload {
    return {
      fields: {
        project: { key: projectKey },
        summary: `[Auto] Test Task ${timestamp()}`,
        description: 'Automated test task created by Playwright',
        issuetype: { name: 'Task' },
        ...overrides,
      },
    };
  },

  createBug(projectKey: string, overrides?: Partial<CreateIssuePayload['fields']>): CreateIssuePayload {
    return {
      fields: {
        project: { key: projectKey },
        summary: `[Auto] Test Bug ${timestamp()}`,
        description: 'Automated test bug created by Playwright',
        issuetype: { name: 'Bug' },
        ...overrides,
      },
    };
  },
};
