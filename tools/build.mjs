#!/usr/bin/env node
// モックHTMLをID＋パスワードで暗号化し、ログイン画面つきのページとして書き出す。
//   MOCK_ID=... MOCK_PW=... node tools/build.mjs encrypt   # src/*.html → ./*.html（暗号化）
//   MOCK_ID=... MOCK_PW=... node tools/build.mjs decrypt   # ./*.html → src/*.html（平文に戻す）
// src/ は .gitignore 済み。平文はコミットしない。
import { webcrypto as crypto } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PAGES = ["index.html", "prototype.html"];
const ITER = 600000;
const mode = process.argv[2];
const id = (process.env.MOCK_ID || "").trim();
const pw = process.env.MOCK_PW || "";
if (!["encrypt", "decrypt"].includes(mode) || !id || !pw) {
  console.error("usage: MOCK_ID=... MOCK_PW=... node tools/build.mjs encrypt|decrypt");
  process.exit(1);
}
const b64 = (u8) => Buffer.from(u8).toString("base64");
const unb64 = (s) => new Uint8Array(Buffer.from(s, "base64"));

async function deriveKey(salt, iter) {
  const km = await crypto.subtle.importKey("raw", new TextEncoder().encode(id + "\n" + pw), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: iter }, km, 256);
  return crypto.subtle.importKey("raw", bits, "AES-GCM", false, ["encrypt", "decrypt"]);
}
const payloadOf = (html) => {
  const m = html.match(/<script type="application\/json" id="payload">([\s\S]*?)<\/script>/);
  if (!m) throw new Error("payload not found (already plaintext?)");
  return JSON.parse(m[1]);
};

function shell(plain, payload) {
  // 元ページの <head> から meta / favicon / title だけ引き継ぐ（OGPプレビューを維持）
  const head = plain.slice(plain.indexOf("<head>") + 6, plain.indexOf("</head>"));
  const keep = head.split("\n").filter((l) => /^<meta |^<link rel="icon"|^<title>/.test(l.trim())).join("\n");
  return `<!doctype html>
<html lang="ja" class="chk">
<head>
${keep}
<style>
:root{--bg:#f2f1ee;--card:#fff;--ink:#1d1d1f;--sub:#6f6e6a;--line:#dcdad5;--acc:#b4492f;--acc2:#d9785a;--err:#b3261e}
@media (prefers-color-scheme:dark){:root{--bg:#232325;--card:#2f2f32;--ink:#f0f0f0;--sub:#a8a8ad;--line:#4a4a4e;--err:#ff8a7a}}
*{box-sizing:border-box}
html.chk body{visibility:hidden}
body{margin:0;min-height:100vh;min-height:100dvh;display:grid;place-items:center;padding:24px 16px;background:var(--bg);color:var(--ink);font-family:"Hiragino Sans","Yu Gothic","Noto Sans JP",system-ui,sans-serif;font-size:14px;line-height:1.6}
main{width:100%;max-width:340px;background:var(--card);border-radius:14px;padding:28px 24px 24px;box-shadow:0 12px 36px rgba(0,0,0,.12)}
.mark{width:48px;height:48px;border-radius:12px;background:linear-gradient(180deg,var(--acc),var(--acc2));display:grid;place-items:center;margin-bottom:6px}
.mark svg{width:28px;height:28px;fill:none;stroke:#fff;stroke-width:2}
label{display:block;font-size:12px;font-weight:700;margin:12px 0 4px}
input{width:100%;font:inherit;font-size:16px;color:inherit;background:transparent;border:1px solid var(--line);border-radius:8px;padding:10px 12px}
input:focus-visible,button:focus-visible{outline:2px solid var(--acc);outline-offset:2px}
button{width:100%;margin-top:18px;font:inherit;font-weight:700;color:#fff;background:var(--acc);border:0;border-radius:8px;padding:12px;cursor:pointer}
button[disabled]{opacity:.6;cursor:default}
.err{min-height:20px;margin:10px 0 0;color:var(--err);font-size:12px}
</style>
</head>
<body>
<main>
  <div class="mark" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="12" r="2.3"/><path d="M14 10h4M14 14h4" stroke-linecap="round"/></svg></div>
  <form id="f" autocomplete="on" aria-label="ログイン">
    <label for="u">ID</label>
    <input id="u" name="username" type="text" autocomplete="username" autocapitalize="none" spellcheck="false" required>
    <label for="p">パスワード</label>
    <input id="p" name="password" type="password" autocomplete="current-password" required>
    <button id="b" type="submit">ログイン</button>
    <p class="err" id="e" role="alert"></p>
  </form>
</main>
<script type="application/json" id="payload">${JSON.stringify(payload)}</script>
<script>
(function(){
  var P=JSON.parse(document.getElementById("payload").textContent), K="msp_mock_key";
  var dec=function(s){return Uint8Array.from(atob(s),function(c){return c.charCodeAt(0)})};
  var enc=function(u){var s="";for(var i=0;i<u.length;i++)s+=String.fromCharCode(u[i]);return btoa(s)};
  var get=function(){try{return sessionStorage.getItem(K)}catch(_){return null}};
  var set=function(v){try{v?sessionStorage.setItem(K,v):sessionStorage.removeItem(K)}catch(_){}};
  async function derive(id,pw){
    var km=await crypto.subtle.importKey("raw",new TextEncoder().encode(id+"\\n"+pw),"PBKDF2",false,["deriveBits"]);
    return new Uint8Array(await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-256",salt:dec(P.salt),iterations:P.iter},km,256));
  }
  async function unlock(raw){
    var key=await crypto.subtle.importKey("raw",raw,"AES-GCM",false,["decrypt"]);
    var pt=await crypto.subtle.decrypt({name:"AES-GCM",iv:dec(P.iv)},key,dec(P.ct));
    return new TextDecoder().decode(pt);
  }
  function show(html){
    var go=function(){document.documentElement.classList.remove("chk");document.open();document.write(html);document.close();};
    if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",go,{once:true});else go();
  }
  var f=document.getElementById("f"),b=document.getElementById("b"),e=document.getElementById("e");
  f.addEventListener("submit",async function(ev){
    ev.preventDefault();e.textContent="";b.disabled=true;b.textContent="確認中…";
    try{
      var raw=await derive(document.getElementById("u").value.trim(),document.getElementById("p").value);
      var html=await unlock(raw);set(enc(raw));show(html);
    }catch(_){
      b.disabled=false;b.textContent="ログイン";
      e.textContent=(window.crypto&&crypto.subtle)?"IDまたはパスワードが違います。":"このブラウザでは開けません（https で開いてください）。";
    }
  });
  (async function(){
    var s=get();
    if(s){try{show(await unlock(dec(s)));return}catch(_){set(null)}}
    document.documentElement.classList.remove("chk");
    document.getElementById("u").focus();
  })();
})();
</script>
</body>
</html>
`;
}

if (mode === "encrypt") {
  const salt = crypto.getRandomValues(new Uint8Array(16)); // 全ページ共通（1回のログインで両方開ける）
  const key = await deriveKey(salt, ITER);
  for (const name of PAGES) {
    const plain = readFileSync(join(ROOT, "src", name), "utf8");
    if (plain.includes('id="payload"')) throw new Error(`src/${name} is not plaintext`);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plain)));
    writeFileSync(join(ROOT, name), shell(plain, { v: 1, iter: ITER, salt: b64(salt), iv: b64(iv), ct: b64(ct) }));
    console.log(`encrypted ${name} (${plain.length} chars)`);
  }
} else {
  mkdirSync(join(ROOT, "src"), { recursive: true });
  for (const name of PAGES) {
    const p = payloadOf(readFileSync(join(ROOT, name), "utf8"));
    const key = await deriveKey(unb64(p.salt), p.iter);
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(p.iv) }, key, unb64(p.ct));
    writeFileSync(join(ROOT, "src", name), new TextDecoder().decode(pt));
    console.log(`decrypted ${name}`);
  }
}
