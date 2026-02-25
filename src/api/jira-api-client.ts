import { APIRequestContext } from '@playwright/test';

export interface JiraIssue {
  id: string;
  key: string;
  self: string;
  fields: {
    summary: string;
    description?: string;
    issuetype: { name: string };
    status: { name: string };
    project: { key: string };
    [key: string]: unknown;
  };
}

export interface CreateIssuePayload {
  fields: {
    project: { key: string };
    summary: string;
    description?: string;
    issuetype: { name: string };
    [key: string]: unknown;
  };
}

export interface SearchResult {
  issues: JiraIssue[];
  total: number;
}

export class JiraApiClient {
  constructor(private request: APIRequestContext) {}

  async createIssue(payload: CreateIssuePayload): Promise<JiraIssue> {
    const response = await this.request.post('/rest/api/2/issue', { data: payload });
    if (!response.ok()) {
      const body = await response.text();
      throw new Error(`Failed to create issue: ${response.status()} ${body}`);
    }
    return response.json();
  }

  async getIssue(issueKey: string): Promise<JiraIssue> {
    const response = await this.request.get(`/rest/api/2/issue/${issueKey}`);
    if (!response.ok()) {
      throw new Error(`Failed to get issue ${issueKey}: ${response.status()}`);
    }
    return response.json();
  }

  async updateIssue(issueKey: string, fields: Record<string, unknown>): Promise<void> {
    const response = await this.request.put(`/rest/api/2/issue/${issueKey}`, {
      data: { fields },
    });
    if (!response.ok()) {
      const body = await response.text();
      throw new Error(`Failed to update issue ${issueKey}: ${response.status()} ${body}`);
    }
  }

  async searchIssues(jql: string): Promise<SearchResult> {
    const response = await this.request.get('/rest/api/2/search', {
      params: { jql },
    });
    if (!response.ok()) {
      throw new Error(`Failed to search issues: ${response.status()}`);
    }
    return response.json();
  }

  async deleteIssue(issueKey: string): Promise<void> {
    const response = await this.request.delete(`/rest/api/2/issue/${issueKey}`);
    if (!response.ok()) {
      throw new Error(`Failed to delete issue ${issueKey}: ${response.status()}`);
    }
  }
}
