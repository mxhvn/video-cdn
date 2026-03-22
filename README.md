# Cloudflare Pages + GitHub Contents API + jsDelivr uploader

Demo MVP: upload file MP4 từ giao diện Cloudflare Pages, Pages Function commit file vào GitHub repo tại `public/uploads/`, để Cloudflare Pages tự deploy lại và trả về URL Pages + jsDelivr.

## Cấu trúc

- `public/index.html`: giao diện upload
- `functions/api/upload.js`: Pages Function xử lý upload và gọi GitHub API
- `wrangler.jsonc`: cấu hình Pages local/dev

## 1) Tạo GitHub repo

Ví dụ repo public: `mxhvn/video-cdn-demo`

Cloudflare Pages sẽ build từ chính repo này.

## 2) Tạo GitHub token

Tạo Personal Access Token có quyền ghi vào repo mục tiêu.

Tối thiểu:
- private repo: `repo`
- public repo: `public_repo`

## 3) Thiết lập Cloudflare Pages project

Deploy repo lên Cloudflare Pages.

Sau đó vào:
- **Settings > Variables and Secrets**

Tạo các biến/secrets:

- `GITHUB_TOKEN` = token GitHub
- `GITHUB_OWNER` = username/org, ví dụ `safevuln`
- `GITHUB_REPO` = tên repo, ví dụ `video-cdn-demo`
- `GITHUB_BRANCH` = `main`
- `GITHUB_COMMITTER_NAME` = tên hiển thị commit (optional)
- `GITHUB_COMMITTER_EMAIL` = email hiển thị commit (optional)
- `MAX_UPLOAD_BYTES` = ví dụ `41943040` cho 40 MB

## 4) Chạy local

```bash
npm i -g wrangler
wrangler pages dev public
```

## 5) URL trả về

Khi upload thành công, API trả về:

- Pages URL: `https://your-site.pages.dev/uploads/<file>.mp4`
- jsDelivr URL: `https://cdn.jsdelivr.net/gh/<owner>/<repo>@<branch>/public/uploads/<file>.mp4`

## 6) Lưu ý vận hành

- Mỗi lần upload là một commit mới vào GitHub.
- Mỗi commit sẽ kích hoạt một đợt deploy mới trên Pages.
- jsDelivr chỉ hoạt động tốt với repo public.
- Không nên dùng mô hình này cho kho video lớn hoặc upload thường xuyên.
- Với file MP4 lớn, nên chuyển sang R2.
