import { NextResponse } from 'next/server';

// Re-fetch from GitHub at most once an hour — keeps us well under
// GitHub's unauthenticated rate limit while staying reasonably fresh.
export const revalidate = 3600;

interface GitHubContributor {
  login: string;
  avatar_url: string;
  html_url: string;
  type: string;
}

export async function GET() {
  try {
    const res = await fetch(
      'https://api.github.com/repos/arpitg24/ArchScope/contributors?per_page=100',
      {
        headers: { Accept: 'application/vnd.github+json' },
        next: { revalidate: 3600 },
      }
    );

    if (!res.ok) {
      return NextResponse.json({ contributors: [] }, { status: 200 });
    }

    const data: GitHubContributor[] = await res.json();

    const contributors = data
      .filter((c) => c.type === 'User') // exclude bots
      .map((c) => ({
        username: c.login,
        profileUrl: c.html_url,
        avatarUrl: c.avatar_url,
      }));

    return NextResponse.json({ contributors });
  } catch {
    // Fail soft — UI just shows an empty row instead of crashing the page.
    return NextResponse.json({ contributors: [] }, { status: 200 });
  }
}