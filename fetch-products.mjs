/* ============================================================
   Mobina  fetch-products.mjs
   楽天市場 商品検索API から「画像URL・価格・レビュー平均/件数・アフィリンク」を取得し、
   products.seed.mjs の編集データと合体 → public/index.html の PRODUCTS ブロックを差分置換する。

   使い方（PCのターミナル / Claude Code で）：
     1) Node 18 以上が必要（global fetch を使用）
     2) 楽天アプリID・アフィリエイトIDを環境変数で渡す（公開リポジトリにIDを直書き・コミットしない！）
        Windows PowerShell:
          $env:RAKUTEN_APP_ID="あなたのアプリID"
          $env:RAKUTEN_AFFILIATE_ID="あなたのアフィリエイトID"
          node fetch-products.mjs
        Mac/Linux:
          RAKUTEN_APP_ID=xxx RAKUTEN_AFFILIATE_ID=yyy node fetch-products.mjs
     3) public/index.html の PRODUCTS_START〜PRODUCTS_END だけが書き換わる（他は触らない）

   ※楽天APIは概ね「1秒1リクエスト」制限。間に待ち時間を入れている。
   ============================================================ */

import { readFile, writeFile } from "node:fs/promises";
import seed from "./products.seed.mjs";

const APP_ID = process.env.RAKUTEN_APP_ID;
const ACCESS_KEY = process.env.RAKUTEN_ACCESS_KEY || "";   // 2026新仕様: pk_... のアクセスキー（必須）
const AFFILIATE_ID = process.env.RAKUTEN_AFFILIATE_ID || "";
const REFERER = process.env.RAKUTEN_REFERER || "";          // アプリに登録した許可ドメイン（403回避に必須）
const INDEX_PATH = "./public/index.html";   // リポジトリ構成に合わせて調整
// 2026年新仕様エンドポイント（旧 app.rakuten.co.jp は 2026-05-13 に停止）
const API = "https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20220601";

if (!APP_ID) {
  console.error("✕ RAKUTEN_APP_ID が未設定です。環境変数で渡してください。");
  process.exit(1);
}
if (!ACCESS_KEY) {
  console.error("✕ RAKUTEN_ACCESS_KEY が未設定です。新仕様では accessKey が必須です。");
  process.exit(1);
}
if (!REFERER) {
  console.error("✕ RAKUTEN_REFERER が未設定です。アプリ登録済みの許可ドメインを指定してください（例: https://mobina.workers.dev/）。");
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* 画像URLを大きめサイズに（楽天は ?_ex=128x128 が付く） */
function upscaleImage(url) {
  if (!url) return "";
  return url.replace(/\?_ex=\d+x\d+$/, "?_ex=400x400");
}

/* 楽天APIで1商品ぶん取得 */
async function fetchOne(entry) {
  const params = new URLSearchParams({
    applicationId: APP_ID,
    accessKey: ACCESS_KEY,   // 2026新仕様: クエリで accessKey も渡す
    format: "json",
    hits: "5",
    imageFlag: "1",          // 画像ありのみ
    sort: "-reviewCount",    // レビュー数の多い順（=定番が上に来やすい）
  });
  if (AFFILIATE_ID) params.set("affiliateId", AFFILIATE_ID);
  if (entry.itemCode) params.set("itemCode", entry.itemCode);
  else params.set("keyword", entry.rakutenKeyword || entry.name);

  // 登録済み許可ドメインと一致が必須（不一致だと 403 HTTP_REFERRER_NOT_ALLOWED）。
  // 新APIは Origin を見て判定するため Referer / Origin の両方を送る。
  const origin = (() => { try { return new URL(REFERER).origin; } catch { return REFERER; } })();
  const res = await fetch(`${API}?${params}`, { headers: { Referer: REFERER, Origin: origin } });
  if (!res.ok) throw new Error(`HTTP ${res.status} (${entry.id})`);
  const data = await res.json();
  const item = data?.Items?.[0]?.Item;
  if (!item) return null;

  const img = upscaleImage(item.mediumImageUrls?.[0]?.imageUrl || "");
  return {
    merge: {   // ← これだけ PRODUCTS に合体（編集データ name/specs等は上書きしない）
      price: item.itemPrice ?? null,
      image: img,
      rating: Number(item.reviewAverage) || 0,
      reviews: Number(item.reviewCount) || 0,
      purchase: item.affiliateUrl || item.itemUrl || "#",
    },
    matchedName: item.itemName || "",   // 検証用（楽天側の商品名）
    shop: item.shopName || "",
    url: item.itemUrl || "",
  };
}

/* PRODUCTS 配列を綺麗な JS 文字列に整形 */
function toProductsLiteral(products) {
  const lines = products.map((p) => {
    const tags = JSON.stringify(p.tags);
    const specs = JSON.stringify(p.specs);
    const axes = `{cospa:${p.axes.cospa},portability:${p.axes.portability},performance:${p.axes.performance},usability:${p.axes.usability},trust:${p.axes.trust}}`;
    return `  { id:${JSON.stringify(p.id)}, cat:${JSON.stringify(p.cat)}, brand:${JSON.stringify(p.brand)}, name:${JSON.stringify(p.name)},\n` +
           `    price:${p.price}, rating:${p.rating}, reviews:${p.reviews}, weight:${p.weight}, icon:${JSON.stringify(p.icon)},\n` +
           `    image:${JSON.stringify(p.image)}, purchase:${JSON.stringify(p.purchase)},\n` +
           `    tags:${tags},\n` +
           `    specs:${specs},\n` +
           `    axes:${axes} }`;
  });
  return "const PRODUCTS = [\n" + lines.join(",\n\n") + "\n];";
}

async function main() {
  console.log(`▶ ${seed.length} 件をシードから処理します\n`);
  const products = [];
  const report = [];

  for (const entry of seed) {
    try {
      const dyn = await fetchOne(entry);
      if (!dyn) {
        console.warn(`  ⚠ 見つからず（編集データのみ採用）: ${entry.id}`);
        products.push({ ...entry, price: null, rating: 0, reviews: 0, image: "", purchase: "#" });
        report.push(`✗ ${entry.id}\n    楽天で該当なし → rakutenKeyword か itemCode を見直し`);
      } else {
        const m = dyn.merge;
        console.log(`  ✓ ${entry.id.padEnd(26)} ¥${String(m.price).padStart(6)}  ★${m.rating}(${m.reviews})  ${m.image ? "IMG" : "no-img"}`);
        console.log(`     ↳ 楽天ヒット: ${dyn.matchedName.slice(0, 54)}`);
        products.push({ ...entry, ...m });
        report.push(`✓ ${entry.id}  →  表示名: ${entry.name}\n    楽天ヒット: ${dyn.matchedName}\n    ¥${m.price} / ★${m.rating}(${m.reviews}件) / ${dyn.shop}\n    ${dyn.url}`);
      }
    } catch (e) {
      console.warn(`  ⚠ 取得失敗（編集データのみ採用）: ${entry.id} — ${e.message}`);
      products.push({ ...entry, price: null, rating: 0, reviews: 0, image: "", purchase: "#" });
      report.push(`✗ ${entry.id}\n    取得失敗: ${e.message}`);
    }
    await sleep(1100); // レート制限対策
  }

  // index.html の PRODUCTS ブロックだけ置換（マーカー間のみ＝他は一切触らない）
  const html = await readFile(INDEX_PATH, "utf8");
  const re = /\/\* PRODUCTS_START[\s\S]*?\*\/[\s\S]*?\/\* PRODUCTS_END \*\//;
  if (!re.test(html)) {
    console.error("✕ index.html に PRODUCTS_START / PRODUCTS_END マーカーが見つかりません。");
    process.exit(1);
  }
  const block =
    "/* PRODUCTS_START — このブロックは fetch-products.mjs が自動生成・置換します。手で編集しないこと */\n" +
    toProductsLiteral(products) +
    "\n/* PRODUCTS_END */";

  await writeFile(INDEX_PATH, html.replace(re, block), "utf8");

  // 検証レポート（楽天ヒット商品が正しいか目視確認用。コミット不要なので .gitignore 推奨）
  await writeFile("./fetch-report.txt",
    "Mobina 取得レポート  " + new Date().toLocaleString("ja-JP") + "\n" +
    "（各商品で「楽天ヒット」が狙った商品と一致しているか確認。ズレていたら seed の itemCode を指定）\n\n" +
    report.join("\n\n") + "\n", "utf8");

  console.log(`\n✅ ${INDEX_PATH} の PRODUCTS を更新しました（${products.length}件）`);
  console.log("📝 fetch-report.txt を出力（楽天ヒット商品が正しいか目視確認）");
  console.log("   → Ctrl+Shift+R で表示確認。問題なければ git add/commit/push。");
}

main().catch((e) => { console.error(e); process.exit(1); });
