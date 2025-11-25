const GITHUB_API_BASE = 'https://api.github.com';

interface GitHubApiError extends Error {
  status?: number;
  response?: Response;
}

/**
 * GitHub API Service
 * Handles all GitHub API interactions including repository details and branch comparison
 */
class GitHubApiService {
  private token: string;
  private headers: Record<string, string>;

  constructor(token: string) {
    this.token = token;
    this.headers = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
    };
  }

  /**
   * Make a GET request to GitHub API
   */
  async get(endpoint: string, params: Record<string, string | number> = {}) {
    const url = new URL(`${GITHUB_API_BASE}${endpoint}`);
    Object.keys(params).forEach(key => url.searchParams.append(key, String(params[key])));

    const response = await fetch(url.toString(), {
      headers: this.headers,
    });

    if (!response.ok) {
      const error: GitHubApiError = new Error(`GitHub API error: ${response.status}`);
      error.status = response.status;
      error.response = response;
      throw error;
    }

    return await response.json();
  }

  /**
   * Validate the token by making a test API call
   */
  async validateToken() {
    try {
      const user = await this.get('/user');
      return { valid: true, user };
    } catch (error) {
      console.warn('Token validation failed:', error);
      return { valid: false, error: (error as Error).message };
    }
  }

  /**
   * Get all organizations the user has access to
   */
  async getUserOrganizations() {
    return await this.get('/user/orgs');
  }

  /**
   * Get organization details
   */
  async getOrganization(org) {
    return await this.get(`/orgs/${org}`);
  }

  /**
   * Get all repositories for an organization
   */
  async getOrgRepositories(org) {
    let allRepos = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const repos = await this.get(`/orgs/${org}/repos`, {
        per_page: 100,
        page,
      });

      allRepos = allRepos.concat(repos);
      hasMore = repos.length === 100;
      page++;
    }

    return allRepos;
  }

  /**
   * Get all members of an organization
   */
  async getOrgMembers(org) {
    let allMembers = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const members = await this.get(`/orgs/${org}/members`, {
        per_page: 100,
        page,
      });

      allMembers = allMembers.concat(members);
      hasMore = members.length === 100;
      page++;
    }

    return allMembers;
  }

  /**
   * Get pending invitations for an organization
   */
  async getOrgInvitations(org: string) {
    let allInvitations = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      try {
        const invitations = await this.get(`/orgs/${org}/invitations`, {
          per_page: 100,
          page,
        });

        allInvitations = allInvitations.concat(invitations);
        hasMore = invitations.length === 100;
        page++;
      } catch (error) {
        console.warn(`Failed to get invitations for org ${org}:`, error);
        hasMore = false;
      }
    }

    return allInvitations;
  }

  /**
   * Get the most recent pull request for a repository
   */
  async getLastPullRequest(owner, repo) {
    try {
      const prs = await this.get(`/repos/${owner}/${repo}/pulls`, {
        state: 'all',
        sort: 'updated',
        direction: 'desc',
        per_page: 1,
      });
      return prs.length > 0 ? prs[0] : null;
    } catch (error) {
      console.warn(`Failed to get latest PR for ${owner}/${repo}:`, error);
      return null;
    }
  }

  /**
   * Get all branches for a repository
   */
  async getRepoBranches(owner, repo) {
    let allBranches = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      try {
        const branches = await this.get(`/repos/${owner}/${repo}/branches`, {
          per_page: 100,
          page,
        });

        allBranches = allBranches.concat(branches);
        hasMore = branches.length === 100;
        page++;
      } catch (error) {
        console.warn(`Failed to get branches for ${owner}/${repo}:`, error);
        hasMore = false;
      }
    }

    return allBranches;
  }

  /**
   * Get detailed information about a specific branch
   */
  async getBranchDetails(owner, repo, branch) {
    try {
      return await this.get(`/repos/${owner}/${repo}/branches/${branch}`);
    } catch (error) {
      console.warn(`Failed to get branch details for ${owner}/${repo}/${branch}:`, error);
      return null;
    }
  }

  /**
   * Get all open pull requests for a repository
   */
  async getOpenPullRequests(owner, repo) {
    let allPRs = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      try {
        const prs = await this.get(`/repos/${owner}/${repo}/pulls`, {
          state: 'open',
          per_page: 100,
          page,
        });

        allPRs = allPRs.concat(prs);
        hasMore = prs.length === 100;
        page++;
      } catch (error) {
        console.warn(`Failed to get open PRs for ${owner}/${repo}:`, error);
        hasMore = false;
      }
    }

    return allPRs;
  }

  /**
   * Check if a branch has protection rules enabled
   */
  async isBranchProtected(owner, repo, branch) {
    try {
      await this.get(`/repos/${owner}/${repo}/branches/${branch}/protection`);
      return true; // 200 response means protected
    } catch (error) {
      if ((error as GitHubApiError).status === 404) {
        return false; // 404 means not protected
      }
      console.warn(`Failed to check branch protection for ${owner}/${repo}/${branch}:`, error);
      throw error; // Other errors should be re-thrown
    }
  }

  /**
   * Get all collaborators for a repository
   */
  async getRepoCollaborators(owner, repo) {
    let allCollaborators = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      try {
        const collaborators = await this.get(`/repos/${owner}/${repo}/collaborators`, {
          per_page: 100,
          page,
        });

        allCollaborators = allCollaborators.concat(collaborators);
        hasMore = collaborators.length === 100;
        page++;
      } catch (error) {
        console.warn(`Failed to get collaborators for ${owner}/${repo}:`, error);
        hasMore = false;
      }
    }

    return allCollaborators;
  }

  /**
   * Get app details by slug
   */
  async getAppBySlug(slug) {
    try {
      return await this.get(`/apps/${slug}`);
    } catch (error) {
      // 404 is expected for private/internal apps - don't warn
      if ((error as GitHubApiError).status !== 404) {
        console.warn(`Failed to get app by slug ${slug}:`, error);
      }
      return null;
    }
  }

  /**
   * Get all installed apps for an organization
   */
  async getOrgInstalledApps(org) {
    try {
      const response = await this.get(`/orgs/${org}/installations`);
      return response.installations || [];
    } catch (error) {
      console.warn(`Failed to get installed apps for org ${org}:`, error);
      return [];
    }
  }

  /**
   * Get all outside collaborators for an organization
   */
  async getOutsideCollaborators(org) {
    let allCollaborators = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      try {
        const collaborators = await this.get(`/orgs/${org}/outside_collaborators`, {
          per_page: 100,
          page,
        });

        allCollaborators = allCollaborators.concat(collaborators);
        hasMore = collaborators.length === 100;
        page++;
      } catch (error) {
        console.warn(`Failed to get outside collaborators for org ${org}:`, error);
        hasMore = false;
      }
    }

    return allCollaborators;
  }

  /**
   * Get repositories accessible by an outside collaborator
   */
  async getCollaboratorRepos(_org: string, _username: string) {
    // Note: This requires checking each repo's collaborators
    // This is done in the component logic to avoid redundant API calls
    return [];
  }

  /**
   * Get user details by username
   */
  async getUser(username) {
    try {
      return await this.get(`/users/${username}`);
    } catch (error) {
      console.warn(`Failed to get user ${username}:`, error);
      return null;
    }
  }

  /**
   * Get organization members with admin role
   */
  async getOrgAdmins(org) {
    let allAdmins = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      try {
        const admins = await this.get(`/orgs/${org}/members`, {
          role: 'admin',
          per_page: 100,
          page,
        });

        allAdmins = allAdmins.concat(admins);
        hasMore = admins.length === 100;
        page++;
      } catch (error) {
        console.warn(`Failed to get admins for org ${org}:`, error);
        hasMore = false;
      }
    }

    return allAdmins;
  }

  /**
   * Get all teams with access to a repository
   */
  async getRepoTeams(owner, repo) {
    let allTeams = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      try {
        const teams = await this.get(`/repos/${owner}/${repo}/teams`, {
          per_page: 100,
          page,
        });

        allTeams = allTeams.concat(teams);
        hasMore = teams.length === 100;
        page++;
      } catch (error) {
        console.warn(`Failed to get teams for ${owner}/${repo}:`, error);
        hasMore = false;
      }
    }

    return allTeams;
  }

  /**
   * Get direct/outside collaborators for a repository
   * Uses affiliation=direct to get only explicitly added collaborators
   */
  async getRepoDirectCollaborators(owner, repo) {
    let allCollaborators = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      try {
        const collaborators = await this.get(`/repos/${owner}/${repo}/collaborators`, {
          affiliation: 'direct',
          per_page: 100,
          page,
        });

        allCollaborators = allCollaborators.concat(collaborators);
        hasMore = collaborators.length === 100;
        page++;
      } catch (error) {
        console.warn(`Failed to get direct collaborators for ${owner}/${repo}:`, error);
        hasMore = false;
      }
    }

    return allCollaborators;
  }

  /**
   * Get full repository details (includes source info for forks)
   */
  async getRepository(owner, repo) {
    try {
      return await this.get(`/repos/${owner}/${repo}`);
    } catch (error) {
      console.warn(`Failed to get repository ${owner}/${repo}:`, error);
      return null;
    }
  }

  /**
   * Get languages used in a repository
   * Returns object with language names as keys and byte counts as values
   */
  async getRepoLanguages(owner, repo) {
    try {
      return await this.get(`/repos/${owner}/${repo}/languages`);
    } catch (error) {
      console.warn(`Failed to get languages for ${owner}/${repo}:`, error);
      return {};
    }
  }

  /**
   * Compare two branches to get commits behind/ahead
   */
  async compareBranches(owner, repo, base, head) {
    try {
      return await this.get(`/repos/${owner}/${repo}/compare/${base}...${head}`);
    } catch (error) {
      console.warn(`Failed to compare branches ${base}...${head} for ${owner}/${repo}:`, error);
      return null;
    }
  }

  // ============================================
  // SECURITY API METHODS
  // ============================================

  /**
   * Get open Dependabot alerts for a repository
   * Returns array of open vulnerability alerts
   * Note: Dependabot API uses cursor pagination, not page-based
   */
  async getDependabotAlerts(owner, repo, state = 'open') {
    try {
      // Fetch up to 100 alerts (API max per request)
      // Most repos won't have more than 100 open alerts
      const alerts = await this.get(`/repos/${owner}/${repo}/dependabot/alerts`, {
        state,
        per_page: 100,
      });

      return Array.isArray(alerts) ? alerts : [];
    } catch (error) {
      console.warn(`Failed to get Dependabot alerts for ${owner}/${repo}:`, error);
      return [];
    }
  }

  /**
   * Check if Dependabot/vulnerability alerts are enabled for a repository
   * Returns true if enabled, false if disabled
   */
  async isDependabotEnabled(owner, repo) {
    try {
      const response = await fetch(
        `${GITHUB_API_BASE}/repos/${owner}/${repo}/vulnerability-alerts`,
        {
          method: 'GET',
          headers: this.headers,
        },
      );
      // 204 = enabled, 404 = disabled
      return response.status === 204;
    } catch (error) {
      console.warn(`Failed to check Dependabot status for ${owner}/${repo}:`, error);
      return true; // Assume enabled on error to avoid false positives
    }
  }

  // ============================================
  // BILLING API METHODS
  // ============================================

  /**
   * Get billing usage for an organization (new billing platform)
   * Returns detailed usage data for all products
   */
  async getBillingUsageDetails(org: string, options: { year?: number; month?: number } = {}) {
    try {
      const params: Record<string, string | number> = {};
      if (options.year) params.year = options.year;
      if (options.month) params.month = options.month;
      // Use the new billing platform endpoint format
      return await this.get(`/organizations/${org}/settings/billing/usage`, params);
    } catch (error) {
      console.warn(`Failed to get billing usage for org ${org}:`, error);
      return null;
    }
  }

  /**
   * Get Copilot billing for an organization
   * Returns seat allocation and usage
   */
  async getCopilotBilling(org: string) {
    try {
      return await this.get(`/orgs/${org}/copilot/billing`);
    } catch (error) {
      console.warn(`Failed to get Copilot billing for org ${org}:`, error);
      return null;
    }
  }

  /**
   * Get all budgets for an organization
   */
  async getBudgets(org) {
    try {
      // Use new billing platform endpoint format
      const response = await this.get(`/organizations/${org}/settings/billing/budgets`);
      return response.budgets || response || [];
    } catch (error) {
      console.warn(`Failed to get budgets for org ${org}:`, error);
      return [];
    }
  }
}

export default GitHubApiService;
