/* ============================================================
   Mobina  fetch-products.mjs  —  カタログ生成版
   ------------------------------------------------------------
   ① 手作りシード(products.seed.mjs)= 編集部おすすめ（5軸フル・上位固定）
   ② 各カテゴリをキーワードで楽天から一括取得 → 重複/アクセサリ除外
      → 価格・評価・レビュー数からスコアを自動算出 → 上位を採用（長い在庫）
   ①+② を結合して public/index.html の PRODUCTS を差分置換する。

   使い方（Node 18+ / PowerShell）:
     $env:RAKUTEN_APP_ID="..."; $env:RAKUTEN_REFERER="https://mobina.sanji-104vt.workers.dev/";
     $env:RAKUTEN_AFFILIATE_ID="..."; node fetch-products.mjs
   ============================================================ */

import { readFile, writeFile } from "node:fs/promises";
import seed from "./products.seed.mjs";

const APP_ID = process.env.RAKUTEN_APP_ID;
const AFFILIATE_ID = process.env.RAKUTEN_AFFILIATE_ID || "";
const REFERER = (process.env.RAKUTEN_REFERER || "").trim();
const ACCESS_KEY = (process.env.RAKUTEN_ACCESS_KEY || "").trim();
const INDEX_PATH = "./public/index.html";
const API = "https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20220601";  // 2026新仕様（旧 app.rakuten.co.jp は停止）

if (!APP_ID) { console.error("✕ RAKUTEN_APP_ID が未設定です。"); process.exit(1); }
if (!REFERER) console.warn("⚠ RAKUTEN_REFERER 未設定（Web appタイプだと弾かれます）");

/* ===== 量産設定：カテゴリごとの取得キーワードと目標件数 ===== */
const CATALOG = {
  earphone: {
    target: 50,
    keywords: [
      "ワイヤレスイヤホン ノイズキャンセリング", "完全ワイヤレスイヤホン", "ワイヤレスイヤホン 軽量",
      "オープンイヤー イヤホン", "骨伝導イヤホン", "ワイヤレスイヤホン LDAC",
      "ワイヤレスイヤホン 防水 スポーツ", "ワイヤレスイヤホン マルチポイント",
    ],
  },
  battery: {
    target: 50,
    keywords: [
      "モバイルバッテリー 10000mAh", "モバイルバッテリー 20000mAh", "モバイルバッテリー 軽量 小型",
      "モバイルバッテリー MagSafe ワイヤレス", "モバイルバッテリー ケーブル内蔵",
      "モバイルバッテリー コンセント一体", "モバイルバッテリー PD 急速充電", "モバイルバッテリー 大容量",
    ],
  },
  smarttag: {
    target: 25,
    keywords: [
      "スマートタグ 紛失防止", "忘れ物防止 タグ", "紛失防止 トラッカー Bluetooth",
      "スマートトラッカー", "落とし物 防止 タグ", "MagSafe スマートタグ",
    ],
  },
};

/* 価格レンジ（この外はバンドル/部品とみなして除外） */
const PRICE_RANGE = {
  earphone: [1200, 80000], battery: [800, 30000], smarttag: [500, 15000],
};
/* アクセサリ等の除外ワード */
const EXCLUDE = {
  earphone: /ケース|カバー|イヤーピース|イヤーフック|イヤーパッド|交換用|互換|フィルム|保護|ストラップ|収納|ホルダー|シール|変換|分配|片耳のみ|抗菌/,
  battery: /ケース|カバー|フィルム|保護|交換用|互換|スタンド|ホルダー|収納|変換|シール|ステッカー|単体|ポーチ/,
  smarttag: /ケース|カバー|ホルダー|キーホルダー|フィルム|保護|交換用|互換|バンド|ストラップ|シリコン|アクセサリ|ボタン電池|電池\s*単体|3個|4個/,
};
const MIN_REVIEWS = 3;

const BRANDS = ["Anker","Soundcore","SOUNDPEATS","EarFun","Sony","ソニー","Shokz","JBL","Jabra","Bose","BOSE",
  "final","Victor","JVC","audio-technica","オーディオテクニカ","Nothing","CIO","ELECOM","エレコム","cheero",
  "UGREEN","Belkin","AUKEY","Apple","Tile","MAMORIO","Beats","Technics","ag","NUARL","ambie","HUAWEI","Google",
  "Samsung","BUFFALO","ナカバヤシ","オウルテック","MOTTERU","RORRY","Baseus"];

/* 機能検出（タグ＝絞り込み用 / spec＝カードのチップ） */
const FEATURES = {
  earphone: [
    {re:/ノイズキャンセ|ノイキャン|\bANC\b/i, tag:"ノイキャン", spec:"ノイズキャンセリング"},
    {re:/防水|IPX?\d/i, tag:"防水", spec:"防水対応"},
    {re:/最大\s*\d{2,3}\s*時間|ロング|長時間/i, tag:"ロングバッテリー", spec:"ロング再生"},
    {re:/LDAC/i, spec:"LDAC対応"},
    {re:/aptX/i, spec:"aptX対応"},
    {re:/骨伝導/i, spec:"骨伝導"},
    {re:/オープンイヤー|空気伝導|耳をふさが|ながら聴き/i, spec:"オープンイヤー"},
    {re:/マルチポイント/i, spec:"マルチポイント"},
    {re:/ワイヤレス充電|\bQi\b/i, spec:"ワイヤレス充電"},
    {re:/ハイレゾ/i, spec:"ハイレゾ"},
  ],
  battery: [
    {re:/\bPD\b|Power\s?Delivery|急速/i, tag:"PD対応", spec:"PD急速充電"},
    {re:/MagSafe|マグセーフ|マグネット.*ワイヤレス|\bQi2?\b/i, tag:"ワイヤレス充電", spec:"ワイヤレス充電"},
    {re:/2\s?0000mAh|2\s?5000mAh|3\s?0000mAh|大容量/i, tag:"大容量", spec:"大容量"},
    {re:/薄型|スリム|slim/i, tag:"薄型", spec:"薄型"},
    {re:/軽量/i, tag:"軽量", spec:"軽量"},
    {re:/ケーブル内蔵|一体|内蔵ケーブル/i, spec:"ケーブル内蔵"},
    {re:/コンセント|プラグ内蔵|AC一体/i, spec:"コンセント一体"},
    {re:/PSE/i, spec:"PSE適合"},
  ],
  smarttag: [
    {re:/MagSafe|マグネット/i, spec:"MagSafe対応"},
    {re:/防水|IP\d/i, tag:"防水", spec:"防水対応"},
    {re:/電池交換|交換式電池|コイン電池|CR20\d\d/i, spec:"電池交換可"},
    {re:/iPhone|探す|Find\s?My|Apple査探/i, spec:"探すアプリ対応"},
    {re:/Android|Google/i, spec:"Android対応"},
    {re:/防水|IPX?\d/i, spec:"防水"},
    {re:/音|アラーム|ブザー/i, spec:"アラーム"},
  ],
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const upscale = (u) => u ? u.replace(/\?_ex=\d+x\d+$/, "?_ex=400x400") : "";
const clampPct = (v) => Math.max(5, Math.min(100, Math.round(v)));

function cleanName(s){
  return (s||"")
    .replace(/【[^】]*】/g,"").replace(/\[[^\]]*\]/g,"")
    .replace(/送料無料|ポイント\s?\d+倍?|あす楽|楽天\s?\d*位|国内発送|正規品|新品未使用|新品|セール|期間限定|限定|お買い物マラソン|SALE|公式|即納/gi,"")
    .replace(/\s+/g," ").trim().slice(0,48);
}
function detectBrand(name, shop){
  const hit = BRANDS.find(b => new RegExp(b.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"i").test(name));
  if(hit) return hit==="ソニー"?"Sony":hit==="エレコム"?"ELECOM":hit==="オーディオテクニカ"?"audio-technica":hit;
  return cleanName(shop).slice(0,16) || "—";
}
function parseNum(text, re){ const m=(text||"").match(re); return m?Number(m[1]):null; }
function detect(cat, text){
  const tags=new Set(), specs=[];
  for(const f of (FEATURES[cat]||[])){
    if(f.re.test(text)){ if(f.tag) tags.add(f.tag); if(f.spec && !specs.includes(f.spec)) specs.push(f.spec); }
  }
  return { tags:[...tags], specs };
}

/* 楽天検索（1キーワード） */
async function search(keyword, hits){
  const params = new URLSearchParams({
    applicationId: APP_ID, format:"json", hits:String(hits), imageFlag:"1", sort:"-reviewCount", keyword,
  });
  if (AFFILIATE_ID) params.set("affiliateId", AFFILIATE_ID);
  if (ACCESS_KEY) params.set("accessKey", ACCESS_KEY);
  const headers = {};
  if (REFERER){ headers["Referer"]=REFERER; try{ headers["Origin"]=new URL(REFERER).origin; }catch(_){} }
  const res = await fetch(`${API}?${params}`, { headers });
  if(!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return (data.Items||[]).map(x=>x.Item);
}

/* ===== 編集部おすすめ（seed）= 動的データだけ取得して合体 ===== */
async function buildCurated(){
  const out=[];
  for(const e of seed){
    try{
      const items = await search(e.rakutenKeyword || e.name, 3);
      const it = items[0];
      const dyn = it ? {
        price: it.itemPrice ?? null, rating: Number(it.reviewAverage)||0, reviews: Number(it.reviewCount)||0,
        image: upscale(it.mediumImageUrls?.[0]?.imageUrl||""), purchase: it.affiliateUrl||it.itemUrl||"#",
      } : { price:null, rating:0, reviews:0, image:"", purchase:"#" };
      out.push({ id:e.id, cat:e.cat, brand:e.brand, name:e.name, ...dyn,
        weight:e.weight, icon:e.icon, tags:e.tags, specs:e.specs, axes:e.axes, pick:e.pick });
      console.log(`  ★ ${e.id.padEnd(26)} ¥${dyn.price}`);
    }catch(err){ console.warn(`  ⚠ ${e.id}: ${err.message}`); 
      out.push({ id:e.id, cat:e.cat, brand:e.brand, name:e.name, price:null, rating:0, reviews:0,
        image:"", purchase:"#", weight:e.weight, icon:e.icon, tags:e.tags, specs:e.specs, axes:e.axes, pick:e.pick }); }
    await sleep(1100);
  }
  return out;
}

/* ===== 自動取得（カテゴリ別キーワード一括） ===== */
async function buildAuto(curatedCodes){
  const result={};
  for(const [cat,cfg] of Object.entries(CATALOG)){
    const seen=new Set(curatedCodes), raw=[];
    for(const kw of cfg.keywords){
      try{
        const items = await search(kw, 30);
        for(const it of items){
          const code = it.itemCode;
          if(!code || seen.has(code)) continue;
          const name = it.itemName||"";
          if(EXCLUDE[cat].test(name)) continue;
          const price = it.itemPrice||0, reviews = Number(it.reviewCount)||0;
          const [lo,hi]=PRICE_RANGE[cat];
          if(price<lo || price>hi || reviews<MIN_REVIEWS) continue;
          if(!it.mediumImageUrls?.[0]?.imageUrl) continue;
          seen.add(code); raw.push(it);
        }
        console.log(`  [${cat}] "${kw}" → 累計 ${raw.length}`);
      }catch(err){ console.warn(`  ⚠ [${cat}] "${kw}": ${err.message}`); }
      await sleep(1100);
    }
    // 価格レンジ（cospa算出用）
    const prices = raw.map(it=>it.itemPrice).sort((a,b)=>a-b);
    const pMin = prices[0]||0, pMax = prices[prices.length-1]||1;
    const products = raw.map(it=>{
      const fullText = `${it.itemName} ${it.itemCaption||""}`;
      const rating = Number(it.reviewAverage)||0, reviews = Number(it.reviewCount)||0, price = it.itemPrice;
      const trust = clampPct((rating/5)*60 + Math.min(40, (Math.log10(reviews+1)/4)*40));
      const cheap = pMax>pMin ? 1-((price-pMin)/(pMax-pMin)) : 0.5;
      const cospa = clampPct((rating/5)*55 + cheap*45);
      const { tags, specs } = detect(cat, fullText);
      const weight = cat==="battery" ? parseNum(fullText, /(?:重量|約)\s*([0-9]{2,4})\s*g/) : null;
      const mAh = parseNum(fullText, /([0-9]{4,6})\s*mAh/i);
      const specList = (mAh && cat==="battery") ? [`${mAh}mAh`, ...specs] : specs;
      const pick = [];
      if(reviews>=100 && rating>=4.3) pick.push(`楽天★${rating}・${reviews}件と評価が安定`);
      else pick.push(`楽天★${rating}（${reviews}件）`);
      if(specs.length) pick.push(`${specs.slice(0,2).join("・")}に対応`);
      return {
        id:`auto-${cat}-${it.itemCode.replace(/[^a-zA-Z0-9]/g,"-")}`.slice(0,60),
        cat, brand:detectBrand(it.itemName, it.shopName), name:cleanName(it.itemName),
        price, rating, reviews, weight,
        image:upscale(it.mediumImageUrls[0].imageUrl), purchase:it.affiliateUrl||it.itemUrl||"#",
        tags, specs:specList.slice(0,5), cospa, trust, pick,
      };
    });
    products.sort((a,b)=> ((b.cospa+b.trust)/2) - ((a.cospa+a.trust)/2));
    result[cat] = products.slice(0, cfg.target);
    console.log(`  ✓ [${cat}] 採用 ${result[cat].length}/${cfg.target}`);
  }
  return result;
}

async function main(){
  console.log("▶ 編集部おすすめ（seed）取得…");
  const curated = await buildCurated();
  const curatedCodes = new Set(); // seedはitemCode未指定なので重複は名前ベースで自然回避
  console.log("\n▶ 自動カタログ取得…");
  const auto = await buildAuto(curatedCodes);

  // 並び：編集部おすすめ → 各カテゴリの自動取得
  const products = [...curated];
  for(const cat of Object.keys(CATALOG)) products.push(...(auto[cat]||[]));

  const literal = "const PRODUCTS = [\n" + products.map(p=>"  "+JSON.stringify(p)).join(",\n") + "\n];";
  const html = await readFile(INDEX_PATH,"utf8");
  const re = /\/\* PRODUCTS_START[\s\S]*?\*\/[\s\S]*?\/\* PRODUCTS_END \*\//;
  if(!re.test(html)){ console.error("✕ マーカーが見つかりません"); process.exit(1); }
  const block = "/* PRODUCTS_START — fetch-products.mjs が自動生成。手で編集しない */\n"+literal+"\n/* PRODUCTS_END */";
  await writeFile(INDEX_PATH, html.replace(re, block), "utf8");

  const counts = Object.fromEntries(Object.keys(CATALOG).map(c=>[c,(auto[c]||[]).length]));
  await writeFile("./fetch-report.txt",
    `Mobina カタログ生成 ${new Date().toLocaleString("ja-JP")}\n\n`+
    `編集部おすすめ: ${curated.length}件\n`+
    Object.entries(counts).map(([c,n])=>`自動[${c}]: ${n}件`).join("\n")+
    `\n\n合計: ${products.length}件\n`, "utf8");

  console.log(`\n✅ PRODUCTS 更新: 合計 ${products.length}件（編集部${curated.length} + 自動${Object.values(counts).reduce((a,b)=>a+b,0)}）`);
  console.log("   → Ctrl+Shift+R で確認 → git add/commit/push");
}
main().catch(e=>{ console.error(e); process.exit(1); });
