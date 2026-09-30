import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, type GithubSummary } from "@/lib/db/schema";

/**
 * GitHub verification import — runs at OAuth callback.
 * Aggregates repos, languages and recent activity so profiles can show
 * verified signals ("knows Python, 12 repos, active this year").
 */
export async function importGithubData(
  userId: string,
  accessToken: string,
  profile: { login?: string } | Record<string, unknown> | null,
): Promise<void> {
  const login =
    (profile as { login?: string } | null)?.login ??
    (await fetchGithubLogin(accessToken));

  if (!login) return;

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/vnd.github+json",
  };

  // Repos sorted by last push (most recent first), top 100.
  const reposRes = await fetch(
    `https://api.github.com/users/${login}/repos?sort=pushed&per_page=100`,
    { headers },
  );
  if (!reposRes.ok) return;
  const repos: any[] = await reposRes.json();

  const publicRepos = repos.length;
  const totalStars = repos.reduce((sum, r) => sum + (r.stargazers_count ?? 0), 0);

  // Language distribution across repos.
  const languageBytes = new Map<string, number>();
  for (const repo of repos.slice(0, 50)) {
    if (!repo.language) continue;
    languageBytes.set(repo.language, (languageBytes.get(repo.language) ?? 0) + 1);
  }
  const totalRepos = Math.max([...languageBytes.values()].reduce((a, b) => a + b, 0), 1);
  const topLanguages = [...languageBytes.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({
      name,
      percentage: Math.round((count / totalRepos) * 100),
    }));

  // "Active this year" = pushed a repo in the last 365 days.
  const yearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;
  const activeThisYear = repos.some(
    (r) => new Date(r.pushed_at ?? 0).getTime() > yearAgo,
  );

  const summary: GithubSummary = {
    login,
    avatarUrl: `https://github.com/${login}.png`,
    publicRepos,
    totalStars,
    topLanguages,
    recentRepoNames: repos.slice(0, 5).map((r) => r.name),
    activeThisYear,
    fetchedAt: new Date().toISOString(),
  };

  await db
    .update(users)
    .set({ githubUsername: login, githubData: summary, updatedAt: new Date() })
    .where(eq(users.id, userId));
}

async function fetchGithubLogin(accessToken: string): Promise<string | null> {
  try {
    const res = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const data: any = await res.json();
    return data.login ?? null;
  } catch {
    return null;
  }
}
