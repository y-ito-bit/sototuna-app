# フロント機能とバックエンド接続

2026-09-08

## 今回の範囲

意見シートの未完了項目について、実際の送信・共有を行わない端末内のフローを用意した。

| 行 | フロントの状態 | 接続後に必要なもの |
|---|---|---|
| 2 | 1日1回のスタンプ、日数表示・保存 | 認証、サーバー日付での重複防止、特典の仕様決定 |
| 3 | 質問の画像選択、縮小、プレビュー、取り外し、保存 | ストレージ、画像検査、公開範囲、アップロードAPI |
| 4 | 募集者への連絡、協力者のサンプル宛先、確認、下書き保存・再編集・削除 | 協力申込者名簿と選択UIへの接続、宛先認可、メッセージ送受信、通知 |
| 7 | ゼミ選考の未公開案内、先生の検討候補保存 | 正式な日程・要項の情報表示と公開期間管理 |
| 8 | PDF選択・検証・端末保存・削除・ダウンロード、登録ゼミに応じた表示 | ファイル共有、サーバーの所属・役割認可、署名URL・検査 |
| 10 | 登録メール表示、イベントメールの受取設定保存 | メール検証、配信キュー、解除・再同意、プロバイダー |
| 13 | 空状態、3種類のサンプル通知、未読絞込・既読・リンク・消去 | 実イベント由来の通知作成、宛先判定、ページング・同期 |
| 18 | ありがとう総数による3段階の木、進捗、成長プレビュー | 受取数の正確なサーバー集計、不正な連打の制御 |
| 21 | 質問から理由選択・補足・確認・通報下書き保存・削除 | 通報送信、運営画面、重複/濫用対策、対応状態 |

ゼミ選考の実データは未提供。実在する先生の既存情報だけを使い、選考日程を創作していない。協力者は既存の人数から個人を推測せず、サンプル宛先と明記した。

## ファイルの役割とAPI境界

- `public/front-services.js`: 非同期の保存アダプター。`SototunaServices.create({userId})` と `createFiles({userId})` をAPI実装に置き換える。
- `public/front-features.js`: 上記アダプターを使う画面と入力・確認フロー。既存レンダーへ追加パネルを組み込む。
- `public/front-features.css`: 追加画面に限定したスタイル。既存の色・フォント・余白を継承。
- `tests/front-services.test.mjs`: `node --test tests/front-services.test.mjs` で実行。

`create()` のインターフェース:

- `snapshot()` → `{version,visits,preferences,notifications,messages,reports,seminarChoices}`
- `claimVisit()` → `{day,count}`。サーバーでは利用者と日付の一意制約を設ける。
- `savePreferences({emailEvents,replies,thanks,mentions})` → 設定
- `readNotifications(ids)`。受信生成はサーバー側。`sampleNotifications()/clearSamples()` はプレビュー専用で、本運用では取り除く。
- `saveMessage({draftId?,recruitmentId,recipientId,recipientName,body})` → 下書き。送信は別の明示操作・APIとして追加し、保存成功を送信成功に置き換えない。
- `saveReport({questionId,reason,detail})` → 下書き。理由は `spam/abuse/privacy/other`。
- `removeDraft('messages'|'reports',id)`、`toggleSeminar(teacherId)`。

`createFiles()` のインターフェース:

- `list()` → `{id,userId,seminar,title,name,size,file,createdAt,status}[]`
- `save({seminar,title,file})` → 保存記録。現在は5MB以下のPDF、MIMEと先頭シグネチャを確認。
- `remove(id)` → 自分の保存記録だけを対象。

テキスト設定は利用者別localStorage、PDF本体はIndexedDB。ローカルの利用者識別は認証ではない。メールアドレスをサーバー上の権限根拠にせず、ログイン済みセッションの不変userIdへ切り替える。端末の保存領域消去・プライベート閲覧では失われる。既存の投稿・画像・ありがとう集計は従来のstoreのままで、こちらのAPI化も別途必要。

## 討論会の権限

現役生: 登録したゼミの進捗だけ表示。資料管理では自ゼミの自分の保存記録だけを表示し、PDFダウンロード操作を出さない。
OBOG・先生・職員: 全ゼミの進捗を表示。端末で保存したPDFをダウンロードできる。

これはUIの表示確認であり、機密性は保証しない。現在は端末内の自己保存分のみで、他人のファイルは取得しない。共有時にはファイル一覧API・ダウンロードAPI・ストレージで必ず現役生からのアクセスを拒否する。UIで非表示にするだけでは不十分。投稿本文の同ゼミ閲覧と、資料本体を現役生に公開しない要件は別に扱う。

## 検証

- 保存ロジック7テスト: スタンプの日跨ぎと重複・利用者分離、設定、通知の既読と重複、下書き編集・削除、理由検証、容量エラー、候補トグル、不正PDF。
- Chrome: スタンプ保存、設定保存、通知サンプル→全既読→未読ゼロ、通報確認→下書き保存、募集者連絡→保存→再編集、ゼミ候補保存、PDFファイル選択→IndexedDB保存。
- 390px画面で連絡フォームの余白・折返しを確認。
- `npm run build` 成功。
