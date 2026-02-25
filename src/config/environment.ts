import dotenv from 'dotenv';

dotenv.config();

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const env = {
  BASE_URL: process.env.BASE_URL || 'https://gamdom.com',
  JIRA_BASE_URL: requireEnv('JIRA_BASE_URL'),
  JIRA_EMAIL: requireEnv('JIRA_EMAIL'),
  JIRA_API_TOKEN: requireEnv('JIRA_API_TOKEN'),
  JIRA_PROJECT_KEY: process.env.JIRA_PROJECT_KEY || 'DEV',
} as const;
