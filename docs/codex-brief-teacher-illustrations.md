# Codex依頼：先生図鑑の似顔絵イラスト（33人）

作成日：2026-10-27　依頼元：伊藤（SOTOTUNA広報班）

## やってほしいこと

政策学部サイトの各先生ページにある顔写真をもとに、SOTOTUNAアプリの絵柄にそろえた**似顔絵イラスト**を33人分つくり、アプリに組み込んでください。

背景：ベータ利用者から「先生のところに顔かイラストが出るといい」と声がありました。いまは全員が同じフクロウの絵です。

## 元にする写真

- 各先生ページ（下の表のURL）の本文中にある顔写真。例：船田先生のページでは `../images/teacher/photos/funada2.jpg`（ページからの相対パス）。
- 写真のファイル名は先生IDと一致しないことがあるので、**ページ内の `<img alt="先生の氏名">` で特定**してください。
- 写真そのものはアプリに載せません。リポジトリにも入れないでください（作業用の一時フォルダで扱い、終わったら消す）。

## 絵柄（いまのアプリにそろえる）

参考にする既存素材（同じリポジトリ内）：

- `public/assets/avatar-bear-v01.png`（会員アイコン。輪郭・色・頬の描き方の基準）
- `public/assets/character-event-guide-v01.png`（マスコット「つなまる」）
- `public/assets/icon-nav-teachers.png`（いまの先生アイコン）

ルール：

- 太めで均一な**濃い緑の輪郭線**（#2f4a2a 前後）、塗りはフラット。ごく軽いクレヨン・紙の質感。
- 色はアプリの配色から：クリーム #faf7ef／#f3ead6、政策学部グリーン #3a7500、黄緑 #8bc34a、淡い緑 #e8f2dc、頬のコーラル #ff8a65（ほんのり）。
- **胸から上・正面〜やや斜め・やさしい表情**。髪型・眼鏡・ひげなど、本人と分かる特徴は残す。写実にはしない。
- 背景は淡い緑 #e8f2dc の円（アプリ側でも円形に切り抜くので、円の外は透明でよい）。
- 文字・ロゴ・大学名は入れない。
- 33人で線の太さ・顔の大きさ・目鼻の描き方をそろえる（1人ずつバラバラな画風にしない）。

## 書き出し

- 形式：WebP、512×512px、ファイル名は**先生ID**（例：`funada.webp`）。
- 置き場所：`public/assets/teachers/<id>.webp`
- 1枚あたり60KB程度まで（画面では最大64px表示）。

## アプリへの組み込み

コード側の受け口はできています（`public/app-main.js`）。

```js
// 先生の似顔絵イラスト（public/assets/teachers/<id>.webp）。用意できた先生の id をここに足す。
const TEACHER_ART = new Set([]);
```

- 画像を置いた先生のIDを `TEACHER_ART` に追加するだけで、一覧カードと詳細シートの絵が差し替わります（未追加の先生はフクロウのまま）。
- 表示の大きさ・丸い切り抜きは `public/front-features.css` の `.teacher-photo` / `.has-art` で設定済み。CSSやHTMLの変更は不要です。
- `index.html` の `?v=20261027-01` を新しい日付に上げてください（古い画面との混在を防ぐため）。
- 確認：`npm test` と `npm run build` が通ること。スマホ幅（390px）で「先生」タブと詳細シートを開き、33人分の絵が丸く表示されること。

## 先生一覧（ID・氏名・職位・元ページ）

| ID | 氏名 | 職位 | 先生ページ |
|---|---|---|---|
| `abe` | 阿部 大輔 | 教授 | https://www.policy.ryukoku.ac.jp/teacher/abe.html |
| `an` | 安 周永 | 教授 | https://www.policy.ryukoku.ac.jp/teacher/an.html |
| `fukao` | 深尾 昌峰 | 教授 | https://www.policy.ryukoku.ac.jp/teacher/fukao.html |
| `funada` | 船田 智史 | 教授 | https://www.policy.ryukoku.ac.jp/teacher/funada.html |
| `hattori` | 服部 圭郎 | 教授 | https://www.policy.ryukoku.ac.jp/teacher/hattori.html |
| `imasato` | 今里 佳奈子 | 教授 | https://www.policy.ryukoku.ac.jp/teacher/imasato.html |
| `j_sakurai` | 櫻井 次郎 | 教授 | https://www.policy.ryukoku.ac.jp/teacher/j_sakurai.html |
| `matoba` | 的場 信敬 | 教授 | https://www.policy.ryukoku.ac.jp/teacher/matoba.html |
| `matsuura` | 松浦 さと子 | 教授 | https://www.policy.ryukoku.ac.jp/teacher/matsuura.html |
| `murata_kazu` | 村田 和代 | 教授 | https://www.policy.ryukoku.ac.jp/teacher/murata_kazu.html |
| `najima` | 南島 和久 | 教授 | https://www.policy.ryukoku.ac.jp/teacher/najima.html |
| `nakamori` | 中森 孝文 | 教授 | https://www.policy.ryukoku.ac.jp/teacher/nakamori.html |
| `oishi` | 大石 尚子 | 教授 | https://www.policy.ryukoku.ac.jp/teacher/oishi.html |
| `okuno` | 奥野 恒久 | 教授 | https://www.policy.ryukoku.ac.jp/teacher/okuno.html |
| `oshima` | 大島 堅一 | 教授 | https://www.policy.ryukoku.ac.jp/teacher/oshima.html |
| `ota` | 大田 直史 | 教授 | https://www.policy.ryukoku.ac.jp/teacher/ota.html |
| `shimizu` | 清水 万由子 | 教授 | https://www.policy.ryukoku.ac.jp/teacher/shimizu.html |
| `tadatomo` | 只友 景士 | 教授 | https://www.policy.ryukoku.ac.jp/teacher/tadatomo.html |
| `takahata` | 高畑 重勝 | 教授 | https://www.policy.ryukoku.ac.jp/teacher/takahata.html |
| `uchida` | 内田 恭彦 | 教授 | https://www.policy.ryukoku.ac.jp/teacher/uchida.html |
| `yoshimoto` | 吉本 圭佑 | 教授 | https://www.policy.ryukoku.ac.jp/teacher/yoshimoto.html |
| `inoue` | 井上 芳恵 | 准教授 | https://www.policy.ryukoku.ac.jp/teacher/inoue.html |
| `ishihara` | 石原 凌河 | 准教授 | https://www.policy.ryukoku.ac.jp/teacher/ishihara.html |
| `ishikura` | 石倉 研 | 准教授 | https://www.policy.ryukoku.ac.jp/teacher/ishikura.html |
| `kim` | 金 紅実 | 准教授 | https://www.policy.ryukoku.ac.jp/teacher/kim.html |
| `matsuda` | 松田 繁樹 | 准教授 | https://www.policy.ryukoku.ac.jp/teacher/matsuda.html |
| `tanigaki` | 谷垣 岳人 | 准教授 | https://www.policy.ryukoku.ac.jp/teacher/tanigaki.html |
| `usui` | 碓井 智子 | 准教授 | https://www.policy.ryukoku.ac.jp/teacher/usui.html |
| `yuasa` | 湯浅 孝康 | 准教授 | https://www.policy.ryukoku.ac.jp/teacher/yuasa.html |
| `mibu` | 壬生 泰紀 | 講師 | https://www.policy.ryukoku.ac.jp/teacher/mibu.html |
| `namiki` | 並木 州太朗 | 講師 | https://www.policy.ryukoku.ac.jp/teacher/namiki.html |
| `yonekura` | 米倉 みどり | 講師 | https://www.policy.ryukoku.ac.jp/teacher/yonekura.html |
| `sakurai` | 櫻井 あかね | 実践型教育助手 | https://www.policy.ryukoku.ac.jp/teacher/sakurai.html |

## 注意

- 似ていない・気になる点の差し替えに備え、生成に使った指示文（プロンプト）を `docs/teacher-illustrations-prompts.md` に先生ごとに残してください。
- 本番への公開（Cloudflare）は伊藤側で行います。コミット・プッシュ・公開はしないでください。
