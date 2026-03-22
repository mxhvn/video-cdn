function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8"
    }
  });
}

function sanitizeFilename(inputName) {
  const lower = inputName.toLowerCase().trim();

  const noExt = lower.replace(/\.mp4$/i, "");
  const cleaned = noExt
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-._]+|[-._]+$/g, "")
    .slice(0, 80);

  const fallback = cleaned || "video";
  const stamp = Date.now();
  return `${fallback}-${stamp}.mp4`;
}

async function sha256Hex(buffer) {
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

function bytesToBase64(uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;

  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const {
      GITHUB_TOKEN,
      GITHUB_OWNER,
      GITHUB_REPO,
      GITHUB_BRANCH,
      GITHUB_COMMITTER_NAME,
      GITHUB_COMMITTER_EMAIL,
      MAX_UPLOAD_BYTES,
      PAGES_BASE_URL
    } = env;

    if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO || !GITHUB_BRANCH) {
      return json({
        error: "Missing required environment variables",
        required: [
          "GITHUB_TOKEN",
          "GITHUB_OWNER",
          "GITHUB_REPO",
          "GITHUB_BRANCH"
        ]
      }, 500);
    }

    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return json({
        error: "Invalid content type. Expected multipart/form-data"
      }, 400);
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return json({
        error: "No file uploaded"
      }, 400);
    }

    const originalName = file.name || "video.mp4";
    const mimeType = file.type || "application/octet-stream";

    if (!originalName.toLowerCase().endsWith(".mp4")) {
      return json({
        error: "Only .mp4 files are allowed"
      }, 400);
    }

    const maxUpload = Number(MAX_UPLOAD_BYTES || 41943040);
    if (file.size > maxUpload) {
      return json({
        error: "File too large",
        max_upload_bytes: maxUpload,
        received_bytes: file.size
      }, 413);
    }

    const arrayBuffer = await file.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);
    const base64Content = bytesToBase64(uint8);
    const safeFilename = sanitizeFilename(originalName);
    const path = `public/uploads/${safeFilename}`;
    const sha256 = await sha256Hex(arrayBuffer);

    const githubApiUrl = `https://api.github.com/repos/${encodeURIComponent(GITHUB_OWNER)}/${encodeURIComponent(GITHUB_REPO)}/contents/${path}`;

    const body = {
      message: `upload mp4: ${safeFilename}`,
      content: base64Content,
      branch: GITHUB_BRANCH,
      committer: {
        name: GITHUB_COMMITTER_NAME || "Cloudflare Pages Bot",
        email: GITHUB_COMMITTER_EMAIL || `${GITHUB_OWNER}@users.noreply.github.com`
      }
    };

    const ghResp = await fetch(githubApiUrl, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${GITHUB_TOKEN}`,
        "Accept": "application/vnd.github+json",
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "cloudflare-pages-upload-bot"
      },
      body: JSON.stringify(body)
    });

    const ghText = await ghResp.text();
    let ghData = {};
    try {
      ghData = JSON.parse(ghText);
    } catch {
      ghData = { raw: ghText };
    }

    if (!ghResp.ok) {
      return json({
        error: "GitHub API error",
        github_status: ghResp.status,
        github_response: ghData,
        hint: [
          "Check GITHUB_TOKEN",
          "Check repo access for fine-grained token",
          "Check Contents: Read and write permission",
          "Check GITHUB_OWNER / GITHUB_REPO / GITHUB_BRANCH"
        ]
      }, 502);
    }

    const rawBaseUrl = PAGES_BASE_URL || new URL(request.url).origin;
    const baseUrl = rawBaseUrl.replace(/\/+$/, "");
    const pagesUrl = new URL(`/uploads/${safeFilename}`, `${baseUrl}/`).toString();
    const jsdelivrUrl = `https://cdn.jsdelivr.net/gh/${GITHUB_OWNER}/${GITHUB_REPO}@${GITHUB_BRANCH}/${path}`;
    const commitUrl = ghData?.commit?.html_url || null;

    return json({
      ok: true,
      message: "Upload committed to GitHub successfully",
      original_filename: originalName,
      safe_filename: safeFilename,
      mime_type: mimeType,
      size_bytes: file.size,
      sha256,
      path,
      pages_url: pagesUrl,
      jsdelivr_url: jsdelivrUrl,
      commit_url: commitUrl,
      github_content_url: ghData?.content?.html_url || null,
      github_sha: ghData?.content?.sha || null
    }, 200);
  } catch (err) {
    return json({
      error: "Unhandled exception",
      message: err?.message || String(err),
      stack: err?.stack || null
    }, 500);
  }
}
