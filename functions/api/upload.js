function sanitizeBaseName(input) {
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'video';
}

function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return Response.json({ error: 'Không có tệp nào được chọn.' }, { status: 400 });
    }

    if (file.type && file.type !== 'video/mp4') {
      return Response.json({ error: 'Chỉ hỗ trợ file MP4.' }, { status: 400 });
    }

    const maxBytes = Number(env.MAX_UPLOAD_BYTES || 40 * 1024 * 1024);
    if (file.size > maxBytes) {
      return Response.json(
        {
          error: `File quá lớn. Giới hạn hiện tại là ${(maxBytes / 1024 / 1024).toFixed(0)} MB.`
        },
        { status: 413 }
      );
    }

    const safeBase = sanitizeBaseName(file.name);
    const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
    const fileName = `${safeBase}-${timestamp}.mp4`;
    const repoPath = `public/uploads/${fileName}`;

    const contentBase64 = arrayBufferToBase64(await file.arrayBuffer());

    const apiUrl = `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${encodeURIComponent(repoPath).replace(/%2F/g, '/')}`;

    const body = {
      message: `upload: ${fileName}`,
      content: contentBase64,
      branch: env.GITHUB_BRANCH || 'main',
      committer: env.GITHUB_COMMITTER_NAME && env.GITHUB_COMMITTER_EMAIL
        ? {
            name: env.GITHUB_COMMITTER_NAME,
            email: env.GITHUB_COMMITTER_EMAIL
          }
        : undefined
    };

    const ghRes = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'User-Agent': 'cloudflare-pages-uploader'
      },
      body: JSON.stringify(body)
    });

    const ghData = await ghRes.json();

    if (!ghRes.ok) {
      return Response.json(
        {
          error: ghData?.message || 'GitHub API trả lỗi.',
          details: ghData
        },
        { status: ghRes.status }
      );
    }

    const origin = new URL(request.url).origin;
    const pagesUrl = `${origin}/uploads/${encodeURIComponent(fileName)}`;
    const jsdelivrUrl = `https://cdn.jsdelivr.net/gh/${env.GITHUB_OWNER}/${env.GITHUB_REPO}@${env.GITHUB_BRANCH || 'main'}/${repoPath}`;

    return Response.json({
      ok: true,
      file_name: fileName,
      repo_path: repoPath,
      pages_url: pagesUrl,
      jsdelivr_url: jsdelivrUrl,
      commit_url: ghData?.commit?.html_url || null,
      note: 'Commit đã được tạo. Cloudflare Pages và jsDelivr có thể cần thêm một khoảng thời gian ngắn để phản ánh file mới.'
    });
  } catch (error) {
    return Response.json(
      {
        error: error?.message || 'Lỗi không xác định khi xử lý upload.'
      },
      { status: 500 }
    );
  }
}
