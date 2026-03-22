function maskToken(token) {
  if (!token) return "missing";
  if (token.length <= 12) return `${token.slice(0, 4)}...`;
  return `${token.slice(0, 8)}...${token.slice(-4)}`;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8"
    }
  });
}

export async function onRequestGet(context) {
  const { env } = context;

  const info = {
    has_token: !!env.GITHUB_TOKEN,
    token_preview: maskToken(env.GITHUB_TOKEN),
    owner: env.GITHUB_OWNER || null,
    repo: env.GITHUB_REPO || null,
    branch: env.GITHUB_BRANCH || null,
    committer_name: env.GITHUB_COMMITTER_NAME || null,
    committer_email: env.GITHUB_COMMITTER_EMAIL || null,
    max_upload_bytes: env.MAX_UPLOAD_BYTES || null,
    pages_base_url: env.PAGES_BASE_URL || null
  };

  if (!env.GITHUB_TOKEN) {
    return json({
      ok: false,
      step: "env-check",
      message: "GITHUB_TOKEN is missing in runtime",
      info
    }, 500);
  }

  const headers = {
    "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "cloudflare-pages-debug"
  };

  const result = {
    ok: true,
    info
  };

  try {
    const userResp = await fetch("https://api.github.com/user", { headers });
    const userText = await userResp.text();
    let userData = {};
    try { userData = JSON.parse(userText); } catch { userData = { raw: userText }; }

    result.github_user_status = userResp.status;
    result.github_user_body = userData;

    if (env.GITHUB_OWNER && env.GITHUB_REPO) {
      const repoResp = await fetch(`https://api.github.com/repos/${encodeURIComponent(env.GITHUB_OWNER)}/${encodeURIComponent(env.GITHUB_REPO)}`, {
        headers
      });
      const repoText = await repoResp.text();
      let repoData = {};
      try { repoData = JSON.parse(repoText); } catch { repoData = { raw: repoText }; }

      result.github_repo_status = repoResp.status;
      result.github_repo_body = repoData;
    }

    return json(result, 200);
  } catch (err) {
    return json({
      ok: false,
      info,
      error: err?.message || String(err)
    }, 500);
  }
}
