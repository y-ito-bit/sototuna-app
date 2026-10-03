# Cloudflare + Supabase 構築状況

2026-10-03。最初の範囲はメール認証、プロフィール、会員承認、募集、協力申込と連絡先取得。

## 作成した環境

- GitHub: `y-ito-bit/sototuna-app`
- Cloudflare: `Y-ito@thinkandact.jp's Account`、配信名 `sototuna-app`
- Supabase: 専用プロジェクト `sototuna`、ref `gdodurlehfyeilxtecoz`、Singapore。以前の `rrzzgsltkcvexrnzaraf` は動画関連の既存DBなので使用しない。
- 公開接続情報は `.env.local`。Gitには保存しない。`.env.example` に項目名だけを記載。

## DBとアクセス制御

初期版 `20261003000000_cooperation.sql` と取消権限修正 `20261003001000_withdrawal_access.sql` をSQL Editorから専用DBに適用。4テーブルのRLS有効を確認した。手動適用済みなので、将来Supabase CLIへ移行する際はリモートのmigration履歴を確認し、必要ならこの版を `supabase migration repair 20261003000000 --status applied` で登録してから `db push` する。既存DBへリセットを実行しない。

- `profiles`: よびな・所属。メールを含まない。
- `memberships`: 運営が承認したAuthユーザーID。ブラウザから自己承認できない。
- `recruitments`: AuthのユーザーIDを募集者として記録。
- `cooperations`: 連絡用メール・共有同意の版・サーバーで刻印する同意日時。
- メールを取得できるのは申込本人と承認済み募集者。第三者・未認証・未承認者は他人のメールを読めない。
- 締切後・受付終了・自分の募集への協力は禁止。取消後は連絡先の行を削除する。本人の取消は会員承認取消後も可能。
- `recruitment_counts()` はメールを返さず、承認済み会員に人数だけを返す。

## 初期会員とメール認証

初期段階は招待済み会員を使う。Supabase Authへテスト会員を招待し、そのUUIDを `memberships` に登録する。一般公開の新規入会や卒業確認の運用は今回まだ決めていない。

`src/backend/api.js` のOTP送信は `shouldCreateUser:false`。数値コードを使うため Authentication → Emails → Magic Link の本文に `{{ .Token }}` を設定する。

Supabase標準SMTPは組織の許可済みメール宛の検証用途。一般会員へのメール認証にはCustom SMTPの設定が必要。SMTPパスワードをフロントの環境変数に入れない。送信元ドメインの設定と配信サービス選定は別途必要。

## 接続確認画面

`/backend-check.html` は新しいSupabase認証・募集・申込・取消・募集者一覧を呼ぶ開発用画面。未ログイン・未承認では閲覧範囲を制限する。氏名とメールはDOMのテキストとして描画し、HTMLとして挿入しない。

現行の5タブアプリ本体はまだモックで動作する。`src/services/auth.js` の旧Kurocoコードは現在のHTMLアプリが読み込んでいないため、この段階では削除しない。次段階で5タブ本体の認証、プロフィール、募集・協力導線を新APIへ置き換える。端末の旧メール・同意を本人の操作なしに移行しない。

## Cloudflare

`wrangler.jsonc` で `dist` の静的配信とSPAフォールバックを設定。今回のデータAPIはSupabaseのRLSを通して直接利用するため、RLSを迂回するサービスキー入りWorkerは作らない。

Git連携時のビルド: `npm run build`。デプロイ: `npx wrangler deploy`。ビルド変数は `VITE_SUPABASE_URL` と `VITE_SUPABASE_PUBLISHABLE_KEY`。

CloudflareのGit自動配信はAPIトークンを自動作成する。標準トークンにはWorkersに加えてKV/R2/D1などの編集権限が含まれるため、権限範囲を確認してから作成する。

## 検証

```sh
npm test
npm run build
npx wrangler deploy --dry-run
```

PGliteのPostgresで実際にRLSを適用し、募集者・本人・第三者・未承認・未認証を切り替えて検証。Supabase AuthのJWT検証・SMTP配信そのものはこのテストの対象外。実サービスでは招待した会員でOTPと申込・一覧を確認する。
