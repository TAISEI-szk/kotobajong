# ことば雀

クロスワードとは別に作った、英単語と日本語・類義語を組み合わせる麻雀ソリティア風ゲームです。

## 起動

`start.bat` をダブルクリックするか、`index.html` をブラウザで開いてください。ビルドやインストールは不要です。

## ルール

- 上にカードがなく、左右どちらかが空いているカードを選べます。
- 「日英」は英単語と日本語訳、「英英」は類義語のペアです。「ミックス」では両方が出ます。
- 単語コースは「日常英語（NGSL）」「TOEIC対策（TSL）」「学術英語（NAWL）」から選べます。NAWLはTOEFL・IELTSなどの学術英語学習にも役立ちますが、試験主催者の公式頻出語リストではありません。
- 36枚（18ペア）をすべて消すとクリアです。カードは３段に積まれ、「↓ ２枚」は下に２枚残っていることを示します。
- スマートフォンでは４列、広い画面では６列の盤面で遊べます。端末の向きを変えると、残りのカードを並べ直して進行状況を維持します（直前の「戻す」履歴は消えます）。
- ヒントは１局３回、戻すは直前のペアに対応します。残りのカードはいつでも並べ替えられます。
- 自己ベストはブラウザのローカルストレージに保存します。

## 構成

- `index.html`: 画面
- `style.css`: 表示とスマホ対応
- `words.js`: コース別の問題データ
- `layout.css`: WORD NOTEとスマートフォンの一画面レイアウト
- `core.js`: カードの開放判定と解ける配置の生成
- `app.js`: ゲーム進行、操作、音声読み上げ

初期配置と並べ替えは、盤面を最後まで取り除ける順序からカードを割り当てます。英語の読み上げにはブラウザの音声合成機能を使います。

## 単語データと出典

英単語の見出し語は、New General Service List Project の以下の **1.2版頻度リスト**から選びました。各コースには日英ペアを27〜36組、英英ペアを20〜25組収録し、一局につき18組を無作為に出題します。英英ペアでは、最初の英単語を該当リストから選び、相手の一般語は意味が近いものを独自に組み合わせています。日本語訳・説明・例文もこのゲーム用に作成しました。同義語は文脈によって置き換えられない場合があります。

- NGSL: Browne, C., Culligan, B., & Phillips, J., [New General Service List](https://www.newgeneralservicelist.com/new-general-service-list)
- TSL: Browne, C., & Culligan, B., [TOEIC Service List](https://www.newgeneralservicelist.com/toeic-service-list)
- NAWL: Browne, C., & Culligan, B., [New Academic Word List](https://www.newgeneralservicelist.com/new-academic-word-list)

元のリストは [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) で公開されています。このゲームの `words.js` に含まれる選定・翻案した語彙データも同じライセンスで提供します。元のリストから語を選び、日本語訳・例文・類義語ペアを追加した変更を行っています。TOEIC、TOEFL、IELTSの試験主催者とは無関係です。
