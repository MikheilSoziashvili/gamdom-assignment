import { test as base } from '@playwright/test';
import { JiraApiClient } from '../api/jira-api-client';

type ApiFixtures = {
  jiraClient: JiraApiClient;
};

export const test = base.extend<ApiFixtures>({
  jiraClient: async ({ request }, use) => {
    await use(new JiraApiClient(request));
  },
});

export { expect } from '@playwright/test';
