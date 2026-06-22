/* ============================================================
   Mobina 商品シード（編集データ）— 実在商品版
   ------------------------------------------------------------
   スペック・重量・価格は各メーカー公式 / 価格.com / レビュー等を元に
   2026年6月時点で調査した参考値。公開前に必ず最新の公式仕様で再確認すること。
   （特に MagGo Slim の重量、WF-1000XM5 の実売価格は変動・要確認）

   - 画像 / 現在価格 / レビュー平均・件数 / アフィリンク … fetch-products.mjs が楽天APIから取得
   - name / brand / weight / specs / tags / axes … この編集データを使用
   - rakutenKeyword … 楽天検索で当該商品を引くためのキー（itemCode指定がより確実）
   ============================================================ */

export default [
  /* ============ イヤホン ============ */
  {
    id: "ear-anker-liberty4nc", cat: "earphone",
    brand: "Anker / Soundcore", name: "Soundcore Liberty 4 NC",
    weight: 5.2, icon: "🎧",
    tags: ["ノイキャン", "防水", "ロングバッテリー"],
    specs: ["ウルトラANC 3.0", "LDAC対応(ハイレゾ)", "ケース込50h再生", "IPX4", "ワイヤレス充電"],
    axes: { cospa: 86, portability: 88, performance: 86, usability: 84, trust: 88 },
    rakutenKeyword: "Anker Soundcore Liberty4 NC 完全ワイヤレスイヤホン",
  },
  {
    id: "ear-sony-wf1000xm5", cat: "earphone",
    brand: "Sony", name: "WF-1000XM5",
    weight: 5.9, icon: "🎧",
    tags: ["ノイキャン", "防水"],
    specs: ["業界最高クラスANC", "LDAC / LE Audio", "ケース込24h(ANC時)", "IPX4", "マルチポイント"],
    axes: { cospa: 60, portability: 80, performance: 96, usability: 86, trust: 92 },
    rakutenKeyword: "ソニー WF-1000XM5 完全ワイヤレス",
  },
  {
    id: "ear-anker-p40i", cat: "earphone",
    brand: "Anker / Soundcore", name: "Soundcore P40i",
    weight: 5.0, icon: "🎧",
    tags: ["ノイキャン", "防水", "ロングバッテリー"],
    specs: ["ウルトラANC 2.0", "ケース込60h再生", "IPX5", "ワイヤレス充電", "マルチポイント"],
    axes: { cospa: 94, portability: 90, performance: 72, usability: 84, trust: 86 },
    rakutenKeyword: "Anker Soundcore P40i",
  },
  {
    id: "ear-shokz-openfit2", cat: "earphone",
    brand: "Shokz", name: "OpenFit 2",
    weight: 9.4, icon: "🎧",
    tags: ["防水", "ロングバッテリー"],
    specs: ["オープンイヤー(耳を塞がない)", "ケース込48h再生", "IP55", "Bluetooth 5.4", "物理ボタン操作"],
    axes: { cospa: 66, portability: 70, performance: 78, usability: 90, trust: 84 },
    rakutenKeyword: "Shokz OpenFit2",
  },
  {
    id: "ear-earfun-airpro4", cat: "earphone",
    brand: "EarFun", name: "Air Pro 4",
    weight: 4.5, icon: "🎧",
    tags: ["ノイキャン", "防水", "ロングバッテリー"],
    specs: ["QuietSmart 3.0 ANC(-50dB)", "LDAC/aptX Lossless", "ケース込52h再生", "IPX5", "ワイヤレス充電"],
    axes: { cospa: 96, portability: 88, performance: 82, usability: 82, trust: 80 },
    rakutenKeyword: "EarFun Air Pro4 完全ワイヤレスイヤホン",
  },

  {
    id: "ear-soundpeats-air4pro", cat: "earphone",
    brand: "SOUNDPEATS", name: "Air4 Pro",
    weight: 4.7, icon: "🎧",
    tags: ["ノイキャン", "防水"],
    specs: ["アダプティブANC(-45dB)", "aptX Lossless/Snapdragon Sound", "ケース込26h再生", "マルチポイント"],
    axes: { cospa: 98, portability: 90, performance: 76, usability: 80, trust: 76 },
    rakutenKeyword: "SOUNDPEATS Air4 Pro",
  },

  /* ============ モバイルバッテリー / 充電器 ============ */
  {
    id: "bat-anker-fusion30", cat: "battery",
    brand: "Anker", name: "Power Bank (Fusion, 30W)",
    weight: 250, icon: "🔋",
    tags: ["PD対応"],
    specs: ["10000mAh", "PD30W急速", "コンセント一体(プラグ内蔵)", "USB-Cケーブル一体", "PSE適合"],
    axes: { cospa: 84, portability: 56, performance: 88, usability: 96, trust: 88 },
    rakutenKeyword: "Anker Power Bank Fusion 10000mAh 30W コンセント一体",
  },
  {
    id: "bat-cio-smartcoby-slim", cat: "battery",
    brand: "CIO", name: "SMARTCOBY Pro SLIM 35W",
    weight: 180, icon: "🔋",
    tags: ["PD対応", "薄型"],
    specs: ["10000mAh", "PD35W(PPS対応)", "厚さ約16mm", "3ポート(C×2/A×1)", "パススルー対応"],
    axes: { cospa: 90, portability: 84, performance: 86, usability: 84, trust: 82 },
    rakutenKeyword: "CIO SMARTCOBY Pro SLIM 35W 10000mAh",
  },
  {
    id: "bat-anker-nano-maggo-slim", cat: "battery",
    brand: "Anker", name: "Nano Power Bank (5000mAh, MagGo, Slim)",
    weight: 110, icon: "🔋",
    tags: ["ワイヤレス充電", "軽量", "薄型"],
    specs: ["5000mAh", "Qi2 ワイヤレス15W", "厚さ約8.6mm(史上最薄)", "MagSafe対応", "有線20W入出力"],
    axes: { cospa: 80, portability: 96, performance: 70, usability: 90, trust: 86 },
    rakutenKeyword: "Anker Nano Power Bank 5000mAh MagGo Slim",
  },
  {
    id: "bat-anker-powercore10000", cat: "battery",
    brand: "Anker", name: "PowerCore 10000",
    weight: 180, icon: "🔋",
    tags: ["軽量"],
    specs: ["10000mAh", "約180gの軽量定番", "コンパクト設計", "USB-A出力", "PSE適合"],
    axes: { cospa: 92, portability: 86, performance: 58, usability: 80, trust: 88 },
    rakutenKeyword: "Anker PowerCore 10000",
  },
  {
    id: "bat-anker-737-24000", cat: "battery",
    brand: "Anker", name: "737 Power Bank (PowerCore 24000)",
    weight: 630, icon: "🔋",
    tags: ["PD対応", "大容量"],
    specs: ["24000mAh", "最大140W出力", "ノートPC充電対応", "残量ディスプレイ搭載", "3ポート"],
    axes: { cospa: 78, portability: 30, performance: 96, usability: 82, trust: 86 },
    rakutenKeyword: "Anker 737 Power Bank PowerCore 24000",
  },
  {
    id: "bat-elecom-de-c86-10000", cat: "battery",
    brand: "ELECOM", name: "半固体モバイルバッテリー DE-C86-10000BK",
    weight: 220, icon: "🔋",   /* 公式仕様: 約220g（10000mAh/35W版） */
    tags: ["PD対応", "半固体電池"],
    specs: ["10000mAh", "半固体電池(高安全・長寿命)", "最大35W出力", "USB-C×2/A×1", "約2000回使用可"],
    axes: { cospa: 72, portability: 74, performance: 78, usability: 86, trust: 84 },
    rakutenKeyword: "エレコム 半固体モバイルバッテリー 10000mAh 35W",
  },
];
