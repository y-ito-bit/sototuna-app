# SOTOTUNA

龍谷大学政策学部の現役生・卒業生・教職員をつなぐ、モバイル向けWebアプリのフロントエンドです。

## 開発

```bash
npm install
npm run dev
```

ブラウザで `http://localhost:5173` を開きます。

## ビルド

```bash
npm run build
npm run preview
```

公開対象は `index.html` と `public/assets/` です。Vercelでは次の設定を使用します。

- Framework Preset: Vite
- Build Command: `npm run build`
- Output Directory: `dist`
- Production Branch: `main`

GitHubの `main` へpushすると、Git連携済みのVercelプロジェクトが自動で本番ビルドします。

## 卒業期の対応

- 1期生: 2015年卒
- 12期生: 2026年卒

画面では `○期生（20XX年卒）` の形式で表示します。
