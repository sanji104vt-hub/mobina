import { readFile, writeFile } from "node:fs/promises";

const indexPath = new URL("./public/index.html", import.meta.url);
const html = await readFile(indexPath, "utf8");
const productsMatch = html.match(/const PRODUCTS = (\[[\s\S]*?\n\]);\n\/\* PRODUCTS_END/);

if (!productsMatch) {
  throw new Error("PRODUCTS_START〜PRODUCTS_ENDの商品配列を読み取れませんでした。");
}

const products = JSON.parse(productsMatch[1]);
const mobinaScore = product => {
  if (product.axes) {
    const a = product.axes;
    return (a.cospa + a.portability + a.performance + a.usability + a.trust * 1.3) / 5.3;
  }
  return ((product.cospa || 0) + (product.trust || 0)) / 2;
};

const topProducts = products
  .filter(product => product.purchase?.startsWith("https://hb.afl.rakuten.co.jp/"))
  .sort((a, b) => Number(Boolean(b.axes)) - Number(Boolean(a.axes)) || mobinaScore(b) - mobinaScore(a))
  .slice(0, 10);

const itemList = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "軽さ効率スコア上位ガジェット",
  itemListElement: topProducts.map((product, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: `${product.brand ? `${product.brand} ` : ""}${product.name}`.trim(),
    url: product.purchase
  }))
};

const generatedBlock = `<!-- ITEMLIST_JSONLD_START -->
<script type="application/ld+json">
${JSON.stringify(itemList, null, 2).replaceAll("<", "\\u003c")}
</script>
<!-- ITEMLIST_JSONLD_END -->`;
const markerPattern = /<!-- ITEMLIST_JSONLD_START -->[\s\S]*?<!-- ITEMLIST_JSONLD_END -->/;

if (!markerPattern.test(html)) {
  throw new Error("ItemList JSON-LDの更新マーカーが見つかりませんでした。");
}

await writeFile(indexPath, html.replace(markerPattern, generatedBlock), "utf8");
console.log(`ItemList JSON-LDを現行商品の上位${topProducts.length}件で更新しました。`);
