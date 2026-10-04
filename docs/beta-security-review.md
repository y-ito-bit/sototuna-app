# ベータ版セキュリティ確認（2026-10-04）

コードと公開URLのHTTPヘッダーを確認した範囲の評価。侵入テストや全設定監査ではなく、リスクゼロの保証はしない。

確認済み: 認証と会員承認、RLSによる第三者の連絡先・メッセージ拒否、匿名フィード、所属変更防止。既存22件のテストと過去の実API確認。公開フロントはpublishable keyのみで、管理キーを含めない。

残る優先事項:
- beta001の初期パスワードを強い個別パスワードへ変更。発行済み資格情報は個別配布し、試用終了時に承認取消・セッション失効も行う。
- 公開応答にCSP、frame-ancestors、X-Content-Type-Options、Referrer-Policyが見当たらない。XSS等への多層防御を追加する。セッションをブラウザに永続保存するため、共有端末のログアウトと端末側保護が必要。
- 投稿件数・頻度のサーバー制限がなく、承認済みアカウントの悪用でデータ増加・負荷が起こり得る。PDF容量制限はあるが内容のウイルス検査はない。
- 架空メールでも自由記述やPDFに本物の個人情報を書ける。参加者にテスト内容のみと伝える。
- Supabase/Cloudflare/GitHub管理者のMFA、管理キーの失効状況、バックアップ・復元は今回未確認。公開前に管理画面で確認する。

15人の限定試用は架空データ・個別IDを条件として進められるが、本格公開前に追加防御と運用確認が必要。

出典: src/backend/client.js、supabase/migrations/20261003004000_community.sql、2026-10-04公開URLのHTTP応答、docs/backend-setup.md。
公式資料: https://supabase.com/docs/guides/getting-started/api-keys

## 2026-10-04 ブラウザ防御の追加
CSPでscript-srcをselfに限定し、インライン実行・evalを許可しない。通信先はselfと専用Supabaseのみ。frame-ancestors noneとX-Frame-Options DENYで埋め込みを禁止。nosniff、no-referrer、不要なカメラ・マイク・位置情報等のPermissions-PolicyとHSTSも設定。スタイルは既存UIとの互換性のためunsafe-inlineを許可するが、スクリプトには許可しない。Google Fontsのみ外部スタイル・フォントを許可する。public/_headersでCloudflare、vercel.jsonで既存Vercelに適用する。
ユーザー判断: beta001の既存パスワードは限定試用で維持。連投制限は本版の課題。個人情報については入力の有無だけでなく共有範囲とアクセス制御を重視する。
資料: https://developers.cloudflare.com/workers/static-assets/headers/
