const GITHUB_API = "https://api.github.com";

interface GithubUserResponse {
  login: string;
  html_url: string;
  name: string | null;
  bio: string | null;
  company: string | null;
  blog: string | null;
  location: string | null;
  avatar_url: string | null;
  followers: number;
  following: number;
  public_repos: number;
}

interface GithubRepoResponse {
  name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  html_url: string;
  topics: string[];
}

export interface GithubProfileData {
  username: string;
  profileUrl: string;
  name: string | null;
  bio: string | null;
  followers: number;
  following: number;
  publicRepos: number;
  avatarUrl: string | null;
  summary: {
    bio: string | null;
    company: string | null;
    blog: string | null;
    location: string | null;
    publicRepos: number;
    followers: number;
    following: number;
  };
}

export interface GithubRepoData {
  repoName: string;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  repoUrl: string;
  topics: string[];
}

async function githubFetch<T>(path: string): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  // Use token if available to avoid rate limits
  if (process.env.GITHUB_TOKEN) {
    headers["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const res = await fetch(`${GITHUB_API}${path}`, { headers });

  if (!res.ok) {
    throw new Error(`GitHub API error ${res.status}: ${path}`);
  }

  return res.json() as Promise<T>;
}

export async function fetchGithubProfile(
  username: string,
): Promise<{ profile: GithubProfileData; repos: GithubRepoData[] }> {
  const [user, repos] = await Promise.all([
    githubFetch<GithubUserResponse>(`/users/${username}`),
    githubFetch<GithubRepoResponse[]>(
      `/users/${username}/repos?sort=stars&per_page=10&type=owner`,
    ),
  ]);

  const profile: GithubProfileData = {
    username: user.login,
    profileUrl: user.html_url,
    name: user.name ?? null,
    bio: user.bio ?? null,
    followers: user.followers ?? 0,
    following: user.following ?? 0,
    publicRepos: user.public_repos ?? 0,
    avatarUrl: user.avatar_url ?? null,
    summary: {
      bio: user.bio ?? null,
      company: user.company ?? null,
      blog: user.blog ?? null,
      location: user.location ?? null,
      publicRepos: user.public_repos ?? 0,
      followers: user.followers ?? 0,
      following: user.following ?? 0,
    },
  };

  const repoData: GithubRepoData[] = repos.map((r) => ({
    repoName: r.name,
    description: r.description ?? null,
    language: r.language ?? null,
    stars: r.stargazers_count ?? 0,
    forks: r.forks_count ?? 0,
    repoUrl: r.html_url,
    topics: r.topics ?? [],
  }));

  return { profile, repos: repoData };
}
