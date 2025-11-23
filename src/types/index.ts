// GitHub API Types
export interface GitHubOrganization {
  login: string;
  id: number;
  avatar_url: string;
  name: string | null;
  description: string | null;
  blog: string | null;
  html_url: string;
  followers: number;
  twitter_username: string | null;
  public_repos: number;
}

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  fork: boolean;
  private: boolean;
  archived: boolean;
  language: string | null;
  topics: string[];
  pushed_at: string;
  default_branch: string;
  visibility: string;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
}

export interface GitHubMember {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
}

export interface GitHubBranch {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
  protected: boolean;
}

export interface GitHubPullRequest {
  id: number;
  number: number;
  html_url: string;
  title: string;
  state: string;
  created_at: string;
  updated_at: string;
  user: {
    login: string;
    avatar_url: string;
  };
  head: {
    ref: string;
  };
}

export interface GitHubCollaborator {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
  permissions?: {
    admin: boolean;
    push: boolean;
    pull: boolean;
  };
}

export interface GitHubTeam {
  id: number;
  name: string;
  slug: string;
  permission: string;
}

export interface GitHubApp {
  id: number;
  slug: string;
  name: string;
  description: string;
  html_url: string;
}

export interface DependabotAlert {
  number: number;
  state: string;
  security_advisory: {
    severity: string;
    summary: string;
  };
  security_vulnerability: {
    package: {
      name: string;
    };
  };
}

export interface CopilotBilling {
  seat_breakdown: {
    total: number;
    active_this_cycle: number;
    inactive_this_cycle: number;
  };
}

export interface BillingUsage {
  usageItems: BillingUsageItem[];
}

export interface BillingUsageItem {
  date: string;
  product: string;
  sku: string;
  quantity: number;
  unitType: string;
  pricePerUnit: number;
  grossAmount: number;
  discountAmount: number;
  netAmount: number;
}

// Component Props Types
export interface GitHubApiService {
  getOrganization: (org: string) => Promise<GitHubOrganization>;
  getOrgRepositories: (org: string) => Promise<GitHubRepository[]>;
  getOrgMembers: (org: string) => Promise<GitHubMember[]>;
  getUserOrganizations: () => Promise<GitHubOrganization[]>;
  validateToken: () => Promise<{ valid: boolean; user?: { login: string }; error?: string }>;
  getLastPullRequest: (owner: string, repo: string) => Promise<GitHubPullRequest | null>;
  getRepoBranches: (owner: string, repo: string) => Promise<GitHubBranch[]>;
  getBranchDetails: (owner: string, repo: string, branch: string) => Promise<GitHubBranch | null>;
  getOpenPullRequests: (owner: string, repo: string) => Promise<GitHubPullRequest[]>;
  isBranchProtected: (owner: string, repo: string, branch: string) => Promise<boolean>;
  getRepoCollaborators: (owner: string, repo: string) => Promise<GitHubCollaborator[]>;
  getRepoTeams: (owner: string, repo: string) => Promise<GitHubTeam[]>;
  getRepoDirectCollaborators: (owner: string, repo: string) => Promise<GitHubCollaborator[]>;
  getOutsideCollaborators: (org: string) => Promise<GitHubCollaborator[]>;
  getOrgAdmins: (org: string) => Promise<GitHubMember[]>;
  getOrgInstalledApps: (org: string) => Promise<GitHubApp[]>;
  getRepository: (owner: string, repo: string) => Promise<GitHubRepository | null>;
  getRepoLanguages: (owner: string, repo: string) => Promise<Record<string, number>>;
  compareBranches: (
    owner: string,
    repo: string,
    base: string,
    head: string,
  ) => Promise<{ ahead_by: number; behind_by: number } | null>;
  getDependabotAlerts: (owner: string, repo: string, state?: string) => Promise<DependabotAlert[]>;
  getBillingUsageDetails: (
    org: string,
    options?: { year?: number; month?: number },
  ) => Promise<BillingUsage | null>;
  getCopilotBilling: (org: string) => Promise<CopilotBilling | null>;
  getBudgets: (org: string) => Promise<unknown[]>;
}

export interface BaseComponentProps {
  apiService: GitHubApiService | null;
  orgName: string;
  isActive: boolean;
}

// Config Types
export interface AppConfig {
  appearance: {
    defaultDarkMode: boolean;
  };
  thresholds: {
    inactiveRepoMonths: number;
    staleBranchDays: number;
    oldPRDays: number;
    branchCountWarning: number;
  };
  billing: {
    pricePerUserMonth: number;
    includedActionsMinutes: number;
  };
  cache: {
    ttlHours: number;
  };
}

// Table Column Type
export interface TableColumn<T = unknown> {
  id: string;
  label: string;
  minWidth?: number;
  align?: 'left' | 'center' | 'right';
  format?: (row: T) => string | React.ReactNode;
  sortable?: boolean;
  tooltip?: string;
}

// Data Table Props
export interface DataTableProps<T = Record<string, unknown>> {
  columns: TableColumn<T>[];
  rows: T[];
  defaultSortColumn?: string;
  defaultSortDirection?: 'asc' | 'desc';
  rowsPerPageOptions?: number[];
  defaultRowsPerPage?: number;
}
