export interface Env {
  ASSETS: Fetcher;
  ADMIN_STATE: DurableObjectNamespace;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  GITHUB_OWNER: string;
  GITHUB_REPOSITORY: string;
  GITHUB_DEFAULT_BRANCH: string;
  GITHUB_ALLOWED_USER: string;
  GITHUB_ALLOWED_USER_ID: string;
  SESSION_SECRET: string;
  ADMIN_ORIGIN: string;
  PUBLIC_SITE_ORIGIN: string;
  ADMIN_DEV_ORIGIN?: string;
}

export interface AppConfig {
  clientId: string;
  clientSecret: string;
  owner: string;
  repository: string;
  branch: string;
  allowedUser: string;
  allowedUserId: number;
  sessionSecret: string;
  adminOrigin: string;
  publicSiteOrigin: string;
  devOrigin?: string;
}

export interface SessionRecord {
  id: string;
  userId: number;
  login: string;
  tokenCipher: string;
  csrfHash: string;
  csrfToken: string;
  expiresAt: number;
}
