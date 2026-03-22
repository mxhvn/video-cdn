function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" }
  });
}

function maskToken(token) {
  if (!token) return "missing";
  if (token.length < 12) return `${token.slice(0, 4)}...`;
  return `${token.slice(0, 8)}...${token.slice(-4)}`;
}

export async function onRequestGet(context) {
  const { env } = context;

  const headers = {
    Authorization: `Bearer ${env.GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "cf-pages-debug"
  };

  const out = {
    env: {
      has_token: !!env.GITHUB_TOKEN,
      token_preview: maskToken(env.GITHUB_TOKEN),
      owner: env.GITHUB_OWNER || null,
      repo: env.GITHUB_REPO || null,
      branch: env.GITHUB_BRANCH || null
    }
  };

  const userResp = await fetch("https://api.github.com/user", { headers });
  out.user_status = userResp.status;
  out.user_body = await userResp.json().catch(() => null);

  const repoResp = await fetch(
    `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}`,
    { headers }
  );
  out.repo_status = repoResp.status;
  out.repo_body = await repoResp.json().catch(() => null);

  const branchResp = await fetch(
    `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/branches/${env.GITHUB_BRANCH}`,
    { headers }
  );
  out.branch_status = branchResp.status;
  out.branch_body = await branchResp.json().catch(() => null);

  const putResp = await fetch(
    `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/public/uploads/debug-write.txt`,
    {
      method: "PUT",
      headers: {
        ...headers,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: "debug write test",
        content: "ZGVidWcgd3JpdGUgdGVzdAo=",
        branch: env.GITHUB_BRANCH,
        committer: {
          name: env.GITHUB_COMMITTER_NAME || "Cloudflare Pages Bot",
          email: env.GITHUB_COMMITTER_EMAIL || "mxhvn@users.noreply.github.com"
        }
      })
    }
  );

  out.put_status = putResp.status;
  out.put_body = await putResp.json().catch(() => null);

  return json(out);
}
