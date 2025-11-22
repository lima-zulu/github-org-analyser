const GITHUB_API_BASE = 'https://api.github.com';

/**
 * GitHub API Service
 * Handles all GitHub API interactions including repository details and branch comparison
 */
class GitHubApiService {
  constructor(token) {
    this.token = token;
    this.headers = {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json'
    };
  }

  /**
   * Make a GET request to GitHub API
   */
  async get(endpoint, params = {}) {
    const url = new URL(`${GITHUB_API_BASE}${endpoint}`);
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

    const response = await fetch(url, {
      headers: this.headers
    });

    if (!response.ok) {
      const error = new Error(`GitHub API error: ${response.status}`);
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
      return { valid: false, error: error.message };
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
        page
      });

      allRepos = allRepos.concat(repos);
      hasMore = repos.length === 100;
      page++;
    }

    return allRepos;
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
        per_page: 1
      });
      return prs.length > 0 ? prs[0] : null;
    } catch (error) {
      // If error (e.g., repo has no PRs), return null
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
          page
        });

        allBranches = allBranches.concat(branches);
        hasMore = branches.length === 100;
        page++;
      } catch (error) {
        // If error, stop pagination
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
          page
        });

        allPRs = allPRs.concat(prs);
        hasMore = prs.length === 100;
        page++;
      } catch (error) {
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
      if (error.status === 404) {
        return false; // 404 means not protected
      }
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
          page
        });

        allCollaborators = allCollaborators.concat(collaborators);
        hasMore = collaborators.length === 100;
        page++;
      } catch (error) {
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
      // If error or no access, return empty array
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
          page
        });

        allCollaborators = allCollaborators.concat(collaborators);
        hasMore = collaborators.length === 100;
        page++;
      } catch (error) {
        hasMore = false;
      }
    }

    return allCollaborators;
  }

  /**
   * Get repositories accessible by an outside collaborator
   */
  async getCollaboratorRepos(org, username) {
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
          page
        });

        allAdmins = allAdmins.concat(admins);
        hasMore = admins.length === 100;
        page++;
      } catch (error) {
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
          page
        });

        allTeams = allTeams.concat(teams);
        hasMore = teams.length === 100;
        page++;
      } catch (error) {
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
          page
        });

        allCollaborators = allCollaborators.concat(collaborators);
        hasMore = collaborators.length === 100;
        page++;
      } catch (error) {
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
      return null;
    }
  }

  /**
   * Compare two branches to get commits behind/ahead
   */
  async compareBranches(owner, repo, base, head) {
    try {
      return await this.get(`/repos/${owner}/${repo}/compare/${base}...${head}`);
    } catch (error) {
      return null;
    }
  }

  // ============================================
  // BILLING API METHODS
  // ============================================

  /**
   * Get GitHub Actions billing for an organization
   * Returns minutes used by OS and included minutes
   */
  async getActionsBilling(org) {
    try {
      return await this.get(`/orgs/${org}/settings/billing/actions`);
    } catch (error) {
      return null;
    }
  }

  /**
   * Get GitHub Packages billing for an organization
   * Returns storage and bandwidth usage
   */
  async getPackagesBilling(org) {
    try {
      return await this.get(`/orgs/${org}/settings/billing/packages`);
    } catch (error) {
      return null;
    }
  }

  /**
   * Get shared storage billing for an organization
   * Returns combined Actions and Packages storage
   */
  async getSharedStorageBilling(org) {
    try {
      return await this.get(`/orgs/${org}/settings/billing/shared-storage`);
    } catch (error) {
      return null;
    }
  }

  /**
   * Get Copilot billing for an organization
   * Returns seat allocation and usage
   */
  async getCopilotBilling(org) {
    try {
      return await this.get(`/orgs/${org}/copilot/billing`);
    } catch (error) {
      return null;
    }
  }

  /**
   * Get all budgets for an organization
   */
  async getBudgets(org) {
    try {
      const response = await this.get(`/orgs/${org}/settings/billing/budgets`);
      return response.budgets || response || [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Get Advanced Security active committers for an organization
   */
  async getAdvancedSecurityCommitters(org) {
    try {
      return await this.get(`/orgs/${org}/settings/billing/advanced-security`);
    } catch (error) {
      return null;
    }
  }

  /**
   * Get billing usage report for an organization
   * Requires the new billing platform
   */
  async getBillingUsage(org, options = {}) {
    try {
      const params = {};
      if (options.year) params.year = options.year;
      if (options.month) params.month = options.month;
      if (options.day) params.day = options.day;
      return await this.get(`/orgs/${org}/settings/billing/usage`, params);
    } catch (error) {
      return null;
    }
  }
}

export default GitHubApiService;
