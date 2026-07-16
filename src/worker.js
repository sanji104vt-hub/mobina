/**
 * Mobina Worker
 * - workers.dev への直アクセスは独自ドメイン mobina.asutelu.com に 301 リダイレクト
 * - それ以外は public/ の静的アセットをそのまま配信
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname.endsWith('workers.dev')) {
      return Response.redirect('https://mobina.asutelu.com' + url.pathname + url.search, 301);
    }

    const categoryMeta = {
      earphone: ['軽量ワイヤレスイヤホン比較', '片耳重量と装着感で選ぶ軽量ワイヤレスイヤホンを比較。軽さ効率ランキングと価格で持ち歩きやすい一台を探せます。'],
      battery: ['軽量モバイルバッテリー比較', '容量mAh÷重量gの軽さ効率でモバイルバッテリーを比較。10000mAhクラスやケーブル一体型を重量と価格から選べます。'],
      smarttag: ['スマートタグ比較', '紛失防止スマートタグを重量・価格・対応機能で比較。鍵やバッグに付けやすい持ち歩きモデルを探せます。'],
      gan: ['軽量GaN充電器比較', '最大出力W÷重量gの軽さ効率でGaN充電器を比較。65W対応など、持ち歩きやすい急速充電器を選べます。'],
      ssd: ['軽量ポータブルSSD比較', '容量GB÷重量gの軽さ効率でポータブルSSDを比較。1TBモデルを中心に重量・価格から選べます。'],
      stand: ['軽量スマホスタンド比較', '折りたたみ式スマホスタンドを重量と価格で比較。外出先へ持ち運びやすいモデルを探せます。'],
      pouch: ['軽量ガジェットポーチ比較', 'ガジェットポーチを重量・価格・収納性で比較。充電器やケーブルを軽くまとめたい人向けの一覧です。']
    };
    const match = url.pathname.match(/^\/category\/([^/]+)\/?$/);
    if (match && categoryMeta[match[1]]) {
      const [label, description] = categoryMeta[match[1]];
      const canonical = `https://mobina.asutelu.com/category/${match[1]}`;
      const breadcrumbJson = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Mobina', item: 'https://mobina.asutelu.com/' },
          { '@type': 'ListItem', position: 2, name: label, item: canonical }
        ]
      });
      const assetUrl = new URL('/', url);
      const response = await env.ASSETS.fetch(new Request(assetUrl, request));
      return new HTMLRewriter()
        .on('title', { element(el) { el.setInnerContent(`Mobina｜${label}【2026年版】軽さ効率ランキング`); } })
        .on('meta[name="description"]', { element(el) { el.setAttribute('content', description); } })
        .on('link[rel="canonical"]', { element(el) { el.setAttribute('href', canonical); } })
        .on('meta[property="og:title"]', { element(el) { el.setAttribute('content', `Mobina｜${label}`); } })
        .on('meta[property="og:description"]', { element(el) { el.setAttribute('content', description); } })
        .on('meta[property="og:url"]', { element(el) { el.setAttribute('content', canonical); } })
        .on('head', { element(el) { el.append(`<script type="application/ld+json">${breadcrumbJson}<\/script>`, { html: true }); } })
        .on('.hero-inner', { element(el) { el.prepend(`<nav class="breadcrumb" aria-label="パンくずリスト"><a href="/">ホーム</a><span aria-hidden="true">›</span><span>${label}</span></nav>`, { html: true }); } })
        .on('h1.hero-title', { element(el) { el.setInnerContent(label); } })
        .on('.hero-sub', { element(el) { el.setInnerContent(description); } })
        .transform(response);
    }
    return env.ASSETS.fetch(request);
  }
};
