# MSP HOME To-Be モック

- `index.html` … アプリ画面のみ（右上メニューで状態切替、URL末尾 `#A` `#B` `#C` `#S` `#V` でシナリオ指定）
- `prototype.html` … 状態シミュレーター＋表示ロジック付きの検討用ページ

表示中の数値・施設・ブランド・商品はすべてサンプル。

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
