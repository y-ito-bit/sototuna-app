# バックエンド構築の公式資料

確認日: 2026-10-03。以下は公式資料の確認事項と SOTOTUNA 向け設計案です。

## 最小構成

Cloudflare Workers Static Assets でフロントを配信し、Supabase Auth と Postgres/Data API を利用します。Workers は必要な API と設定配信を担当できます。静的ファイルと Worker は同時にデプロイされます。[Cloudflare Static Assets](https://developers.cloudflare.com/workers/static-assets/)

ブラウザには Supabase URL と publishable key (`sb_publishable_...`) を渡します。キーは利用者の認証とは別で、ログインした利用者は JWT で識別されます。secret key / 旧 service_role は RLS を回避するため、今回の通常操作では使用しない設計を推奨します。[Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys)

## メール認証

`signInWithOtp({ email })` で送信し、`verifyOtp({ email, token, type: 'email' })` でセッションを取得します。数値コードを送るには、Magic Link のメールテンプレートを `{{ .Token }}` を含む内容に変更します。新規ユーザー作成を認めるかは `shouldCreateUser` で指定できます。[Passwordless email sign-in](https://supabase.com/docs/guides/auth/auth-email-passwordless)

本番の一般会員に認証メールを届けるには Custom SMTP を設定します。標準 SMTP は組織チームの許可済みメール宛の検証用で、本番向けではありません。[Custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp)

## 募集と連絡先のアクセス制御

以下は要件から導いた設計案です。

- 公開する募集本文と、非公開の協力者メールアドレスを別テーブルにします。
- 募集の `owner_id` と協力の `user_id` に Auth の UUID を保存します。
- 協力登録は本人だけが作成・変更・取消でき、連絡先の一覧は対応する募集の `owner_id = auth.uid()` の場合だけ取得できます。本人が自分の登録内容を見る権限は別途認めます。
- 同意済み日時・同意文面の版を保存し、未同意の連絡先は登録しません。
- 登録メールを本人確認済みのログインメールに限定すれば、別人の連絡先を入力する問題を避けられます。
- 一般公開の協力者件数はメールを含まない集計として返します。

根拠: RLS は DB 内で行アクセスを判定します。公開スキーマの各テーブルで RLS を有効にし、GRANT とポリシーを両方設定します。SELECT は USING、INSERT は WITH CHECK、UPDATE は両方で本人条件を確認します。通常の view は RLS を迂回し得るため、公開集計の実装にも注意が必要です。[Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)

## Wrangler 設定

```jsonc
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "sototuna-app",
  "main": "worker/index.js",
  "compatibility_date": "2026-10-03",
  "assets": {
    "directory": "./dist",
    "binding": "ASSETS",
    "not_found_handling": "single-page-application",
    "run_worker_first": ["/api/*"]
  }
}
```

SPA フォールバックは未一致パスに `index.html` を返します。API パスは `run_worker_first` で Worker を先に実行し、API のエラーが HTML に置き換わらないようにします。[Cloudflare Static Assets](https://developers.cloudflare.com/workers/static-assets/)

## ローカル DB 検証

Supabase CLI のローカル環境で migration を適用し、pgTAP の DB テストを実行します。ローカル環境の起動には Docker が必要です。

```sh
supabase start
supabase db reset
supabase test db
```

`db reset` はローカル DB を migration と seed から再作成します。既存のリモート DB をリセットする用途で使いません。[Database migrations](https://supabase.com/docs/guides/local-development/database-migrations)

RLS テストは `supabase/tests/database/*.sql` に置き、未認証・募集者・協力者本人・第三者の許可と拒否を検証します。SQL の構文確認だけでは権限制御の証明になりません。[Testing your database](https://supabase.com/docs/guides/database/testing)
