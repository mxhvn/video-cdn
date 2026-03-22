function maskToken(token) {
  if (!token) return "missing";
  if (token.length <= 12) return `${token.slice(0, 4)}...`;
  return `${token.slice(0, 8)}...${token.slice(-4)}`;
}

export async function onRequestGet(context) {
  const { env, request } = context;

  const data = {
    origin: new URL(request.url).origin,
    has_GITHUB_TOKEN: !!env.GITHUB_TOKEN,
    GITHUB_TOKEN_preview: maskToken(env.GITHUB_TOKEN),
    GITHUB_OWNER: env.GITHUB_OWNER || null,
    GITHUB_REPO: env.GITHUB_REPO || null,
    GITHUB_BRANCH: env.GITHUB_BRANCH || null,
    GITHUB_COMMITTER_NAME: env.GITHUB_COMMITTER_NAME || null,
    GITHUB_COMMITTER_EMAIL: env.GITHUB_COMMITTER_EMAIL || null,
    MAX_UPLOAD_BYTES: env.MAX_UPLOAD_BYTES || null,
    PAGES_BASE_URL: env.PAGES_BASE_URL || null
  };

  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8"
    }
  });
}
