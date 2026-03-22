function showMeta(token) {
  if (!token) {
    return {
      exists: false,
      length: 0,
      first_char_code: null,
      last_char_code: null,
      starts_with_github_pat: false,
      starts_with_quote: false,
      ends_with_quote: false,
      has_newline: false,
      has_space_prefix: false,
      has_space_suffix: false,
      preview: "missing"
    };
  }

  return {
    exists: true,
    length: token.length,
    first_char_code: token.charCodeAt(0),
    last_char_code: token.charCodeAt(token.length - 1),
    starts_with_github_pat: token.startsWith("github_pat_"),
    starts_with_quote: token.startsWith('"') || token.startsWith("'"),
    ends_with_quote: token.endsWith('"') || token.endsWith("'"),
    has_newline: token.includes("\n") || token.includes("\r"),
    has_space_prefix: /^\s/.test(token),
    has_space_suffix: /\s$/.test(token),
    preview:
      token.length > 12
        ? `${token.slice(0, 10)}...${token.slice(-4)}`
        : token
  };
}

export async function onRequestGet(context) {
  const { env } = context;

  return new Response(
    JSON.stringify(
      {
        token_meta: showMeta(env.GITHUB_TOKEN),
        owner: env.GITHUB_OWNER || null,
        repo: env.GITHUB_REPO || null,
        branch: env.GITHUB_BRANCH || null
      },
      null,
      2
    ),
    {
      headers: {
        "Content-Type": "application/json; charset=utf-8"
      }
    }
  );
}
