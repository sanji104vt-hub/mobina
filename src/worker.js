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
    return env.ASSETS.fetch(request);
  }
};
