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

`src/backend/api.js` のOTP送信は `shouldCreateUser:false`。数値コードを使うため Authentication → Emails → Magic Link の本文に `{{ .Token }}` を設定する。現在の無料プランの管理画面では、Custom SMTP未設定時のテンプレート編集が無効だったため、この設定はまだ適用できていない。

Supabase標準SMTPは組織の許可済みメール宛の検証用途。一般会員へのメール認証にはCustom SMTPの設定が必要。SMTPパスワードをフロントの環境変数に入れない。送信元ドメインの設定と配信サービス選定は別途必要。

## 接続確認画面

`/backend-check.html` は新しいSupabase認証・募集・申込・取消・募集者一覧を呼ぶ開発用画面。未ログイン・未承認では閲覧範囲を制限する。氏名とメールはDOMのテキストとして描画し、HTMLとして挿入しない。

現行の5タブアプリ本体はまだモックで動作する。`src/services/auth.js` の旧Kurocoコードは現在のHTMLアプリが読み込んでいないため、この段階では削除しない。次段階で5タブ本体の認証、プロフィール、募集・協力導線を新APIへ置き換える。端末の旧メール・同意を本人の操作なしに移行しない。

## Cloudflare

`wrangler.jsonc` で `dist` の静的配信とSPAフォールバックを設定。今回のデータAPIはSupabaseのRLSを通して直接利用するため、RLSを迂回するサービスキー入りWorkerは作らない。

Git連携時のビルド: `npm run build`。デプロイ: `npx wrangler deploy`。ビルド変数は `VITE_SUPABASE_URL` と `VITE_SUPABASE_PUBLISHABLE_KEY`。

CloudflareのGit自動配信の標準トークンはKV/R2/D1なども編集できるため使用しない。伊藤さんの承認で、対象アカウントのみ `Workers Scripts: Edit` の1権限を持つ `sototuna-deploy-minimal` を作成。この限定トークンはGit連携フォームの候補に表示されなかったため、コマンドから配信した。Git自動配信は未設定。

公開URL: https://sototuna-app.y-ito-c20.workers.dev
接続確認: https://sototuna-app.y-ito-c20.workers.dev/backend-check

`CLOUDFLARE_ACCOUNT_ID` を明示し、Workers Scripts編集のみで配信成功。R2・D1・KV・DNS・Workers Routesの権限は不要だった。トークン値はGitやGoogle Driveへ保存せず、一時ファイルは配信後に削除。今後の配信には安全な資格情報保存先の設定が必要。同じアカウント内のWorker変更権限は残る。

## 検証

```sh
npm test
npm run build
npx wrangler deploy --dry-run
```

PGliteのPostgresで実際にRLSを適用し、募集者・本人・第三者・未承認・未認証を切り替えて検証。Supabase AuthのJWT検証・SMTP配信そのものはこのテストの対象外。実サービスでは招待した会員でOTPと申込・一覧を確認する。


## Issued beta accounts (2026-10-03)

`/backend-check` now accepts issued IDs such as `beta001` and individual passwords. Supabase Auth uses `beta001@beta.sototuna.invalid`; no email or OTP is sent. The original five-tab app still uses mock data.

Create accounts through Supabase Authentication > Users > Add user > Create new user, with Auto confirm user enabled. The operator must enter the new password and submit the form. Approve only issued IDs through SQL Editor after creation:

```sql
insert into public.memberships(user_id)
select id from auth.users where email in ('beta001@beta.sototuna.invalid','beta002@beta.sototuna.invalid')
on conflict (user_id) do nothing;
```

Migration `20261003002000_beta_contacts.sql` is applied. Beta users can save only their own issued contact address from the verified JWT; real addresses and another user's address are rejected by the DB. Contact links do not launch email. Free-text fields can still contain personal data, so the screen asks participants to use fictional names and content.

16 tests and build passed. Account issuance, approval, and the two-user end-to-end test are still pending.


## Bulk issuance for 15 testers

`scripts/issue-beta-accounts.mjs` creates missing beta001 through beta015 using confirmed synthetic email addresses and random individual passwords; existing passwords are preserved. It approves all 15 issued accounts and initializes fictional profiles without replacing existing profiles. It sends no emails. Run only on the dedicated project with server administrative credentials.

The script reads `SOTOTUNA_ADMIN_KEY_FILE` and writes a private CSV to `SOTOTUNA_BETA_CREDENTIALS_FILE`. Both must be local temporary files under `/tmp/`, outside Google Drive and Git. The CSV is exclusively created with mode 600; passwords are saved before membership approval so a later failure does not lose access. Never set the administrative key in VITE variables. Delete the temporary key after execution. Existing users have a blank password column because their passwords cannot be retrieved.

The initial manually created account uses an operator-set password. Change it to a strong individual password before distribution. Account passwords and the administrative key are not recorded in Knowledge Vault.
