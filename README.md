# MSP HOME To-Be モック

- `index.html` … アプリ画面のみ（右上メニューで状態・各UX案を切替。URL末尾 `#A` `#B` `#C` `#S` `#V` `#F` でシナリオ指定。`?s=A〜D` で検索UX案、`?c=A〜D` でクーポンUX案、`?f=A〜C` でF1→F2 NBA案を指定）
- `prototype.html` … 状態シミュレーター＋表示ロジック付きの検討用ページ

表示中の数値・施設・ショップ・商品はすべてサンプル（バナー画像のみ提供素材）。

## 過去の断面

- `v1/` … 2026-10-02 時点の版。`v1/index.html` と `v1/prototype.html` で開ける（同じID・パスワード）。gitのブランチ `v1-2026-10-02` にも同じ断面を残してある。

## ログイン

どちらのページも、開くとIDとパスワードを聞かれる。中身はID＋パスワードで暗号化（PBKDF2 + AES-GCM）してあり、正しい組み合わせを入れたときだけブラウザ内で復号して表示する。一度ログインすれば、タブを閉じるまで再入力は不要。

## 編集のしかた

平文のHTMLはコミットしない（`src/` は `.gitignore` 済み）。

```sh
MOCK_ID=... MOCK_PW=... node tools/build.mjs decrypt   # ./*.html → src/*.html
# src/index.html, src/prototype.html を編集
MOCK_ID=... MOCK_PW=... node tools/build.mjs encrypt   # src/*.html → ./*.html
```

IDやパスワードを変えるときは、新しい値で `encrypt` し直してpushする。
