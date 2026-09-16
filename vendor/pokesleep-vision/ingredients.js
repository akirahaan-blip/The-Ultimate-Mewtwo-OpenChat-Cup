/**
 * 食材アイコンの判定
 *
 * 判定には「色相のヒストグラム」を使う。
 * 未解放スロットのアイコンは白っぽく退色して描画されるが、
 * 退色は彩度を下げるだけで色相はほぼ変えないので、この指標なら影響を受けにくい。
 * （絶対的な画素数で判定すると未解放スロットを取りこぼす）
 *
 * 色相は15度ずつ24個に分ける。
 * 食材は赤〜橙の狭い範囲に集中していて（トマト約5度・カカオ約25度・ポテト約42度）、
 * 30度刻みだとトマトとカカオが同じ区分に入ってしまう。
 * 全17種を見分けるにはこのくらいの細かさが要る。
 * 細かくすると分割の境目に載った色で判定がぶれるので、
 * 比較前に隣のビンとならして丸める。
 *
 * 食材を増やすには、実際のスクショで describeIcon() を呼んで出た hue を
 * PROTOTYPES に1行足す（ミュウツー杯では index.html を開いた状態で
 * ブラウザのコンソールから測った。手順は README「食材の色を測る」を参照）。
 *
 * 2026-09-14（ミュウツー杯）の変更:
 *   ・アイコン枠は「台座のクリーム色の円」の行範囲で決める（バッジを巻き込まない）
 *   ・右下の「×2」バッジ領域は数えない
 *   ・MIN_SAT を 0.20 に上げ、解放済みスロットの黄色い光の輪（彩度0.10〜0.14）を除外
 *   ・距離は Hellinger（平方根をとってから比べる）。大豆の緑の芽のように
 *     画素数の少ない色の有無が、大豆／ポテトを分ける決め手になるため
 *   ・classifyIngredientSlot に候補名の絞り込み（candidates）を追加
 */

import { isLockBadge } from './layout.js?v=18';

export const HUE_BINS = 24;

/**
 * 実測済みの食材。hue は describeIcon() の出力をそのまま貼る。
 * 同じ食材を2行以上書いてもよい（解放済み／未解放で見え方が違う場合など）。
 *
 * ★ 大豆・コーン・ポテトは 2026-09-14 に、ミュウツーのスクショ5枚
 *   （Claude/mewtwo/mew2test1〜5.jpg）で今の方式で測った平均値。
 * ★ トマト・カカオは古い方式（MIN_SAT 0.10・バッジ除外なし）で測った値のまま。
 *   今の方式とは条件が違うので、この2つを判定に使いたい時は測り直すこと。
 */
export const PROTOTYPES = [
  {
    name: 'あんみんトマト',
    hue: [0.839, 0.009, 0.012, 0.019, 0.015, 0.009, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.004, 0.017, 0.002, 0.000, 0.000, 0.000, 0.001, 0.001, 0.004, 0.069]
  },
  {
    name: 'リラックスカカオ',
    hue: [0.063, 0.581, 0.162, 0.062, 0.044, 0.040, 0.014, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.003, 0.002, 0.002, 0.001, 0.000, 0.000, 0.000, 0.003, 0.000, 0.023]
  },
  {
    // 未解放（Lv.30/60で薄く描かれた状態）。2枚の平均
    name: 'ほっこりポテト',
    hue: [0.038, 0.392, 0.563, 0.007, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.001]
  },
  {
    // 未解放。3枚の平均。ポテトとの違いは 45〜90度（緑の芽）がわずかにあること
    name: 'ワカクサ大豆',
    hue: [0.061, 0.336, 0.450, 0.079, 0.059, 0.015, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.001]
  },
  {
    // 解放済み（Lv.1スロット、濃い色で描かれた状態）。4枚の平均
    name: 'ワカクサ大豆',
    hue: [0.120, 0.219, 0.451, 0.101, 0.088, 0.007, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.014]
  },
  {
    // 未解放。5枚の平均。黄色(45〜60度)と緑の葉(75〜105度)がはっきりある
    name: 'ワカクサコーン',
    hue: [0.024, 0.131, 0.292, 0.257, 0.040, 0.088, 0.164, 0.004, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.001]
  }
];

// 彩度がこれ未満の画素は、台座のクリーム色・白背景・解放済みスロットの光の輪とみなして無視する
const MIN_SAT = 0.20;
const MIN_VAL = 0.20;

// 判定に足りる画素数。これを下回ったらアイコンが写っていないと判断する
const MIN_PIXELS = 40;

// アイコン台座のクリーム色。未解放スロットはこの色に混ぜて薄く描かれる
const PEDESTAL = [254, 254, 240];

/**
 * 未解放スロットの退色を打ち消す。
 *
 * 台座のクリーム色は少し黄色いので、混ざると色相が橙側へ寄ってしまう。
 * 実測でも、解放済みトマトが 0.6度 なのに未解放トマトは 6.9度 まで動き、
 * 輪郭のように混色の強い画素はさらにカカオの色相域まで入り込む。
 *
 * そこで台座色から画素へ向かう向きに、どれかのチャンネルが振り切れるまで
 * 伸ばして混色前の色を復元する。これで解放済みでも未解放でも同じ色相になり、
 * 食材ごとにプロトタイプを2つ持たずに済む。
 */
function unfade(r, g, b) {
  const dr = r - PEDESTAL[0];
  const dg = g - PEDESTAL[1];
  const db = b - PEDESTAL[2];
  let k = Infinity;
  for (const [v, d] of [[r, dr], [g, dg], [b, db]]) {
    if (d < 0) k = Math.min(k, v / -d);
    else if (d > 0) k = Math.min(k, (255 - v) / d);
  }
  if (!isFinite(k) || k <= 0) return [r, g, b];
  return [r + dr * k, g + dg * k, b + db * k];
}

function hue(r0, g0, b0) {
  const [r, g, b] = unfade(r0, g0, b0);
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const d = mx - mn;
  if (!d) return 0;
  let h;
  if (mx === r) h = 60 * (((g - b) / d) % 6);
  else if (mx === g) h = 60 * ((b - r) / d + 2);
  else h = 60 * ((r - g) / d + 4);
  return h < 0 ? h + 360 : h;
}

/** 隣のビンとならす。分割の境目に載った色でぶれないようにするため */
function smooth(hist) {
  const n = hist.length;
  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = hist[(i - 1 + n) % n] * 0.25 + hist[i] * 0.5 + hist[(i + 1) % n] * 0.25;
  }
  return out;
}

/**
 * 矩形から、アイコン本体だけが写っている行の範囲を絞り込む。
 * 上の「Lv.30」茶色バッジと下の「×2」バッジを巻き込まないための処理。
 */
function findIconRows(px, box) {
  const { w, data } = px;
  const x0 = Math.max(0, Math.round(box.x0));
  const x1 = Math.min(w, Math.round(box.x1));
  const y0 = Math.max(0, Math.round(box.y0));
  const y1 = Math.min(px.h, Math.round(box.y1));
  const bh = y1 - y0;
  if (bh < 8) return null;

  // まず、アイコンの後ろにあるクリーム色の円（台座）の上下端を探す。
  // 台座はアイコンとぴったり同じ大きさなので、これがいちばん正確。
  // 解放済みスロットでは台座が黄色っぽい光の輪になるが、同じ色条件で拾える。
  const isCream = (r, g, b) => r > 240 && g > 230 && b > 185 && b < 245 && r - b > 8;
  const minCream = (x1 - x0) * 0.08;
  let top = -1, bottom = -1;
  for (let y = 0; y < bh; y++) {
    let c = 0;
    for (let x = x0; x < x1; x++) {
      const i = ((y0 + y) * w + x) * 4;
      if (isCream(data[i], data[i + 1], data[i + 2])) c++;
    }
    if (c >= minCream) { if (top < 0) top = y; bottom = y; }
  }
  if (top >= 0 && bottom - top >= bh * 0.3) {
    return { x0, x1, y0: y0 + top, y1: y0 + bottom + 1 };
  }

  // 台座が見つからない時は、色の付いた画素の塊で決める（従来の方法）

  const rowCount = new Float32Array(bh);
  for (let y = 0; y < bh; y++) {
    for (let x = x0; x < x1; x++) {
      const i = ((y0 + y) * w + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      if (isLockBadge(r, g, b)) continue;
      const mx = Math.max(r, g, b);
      const mn = Math.min(r, g, b);
      if (mx < MIN_VAL * 255) continue;
      if ((mx - mn) / mx < MIN_SAT) continue;
      rowCount[y]++;
    }
  }

  // 途切れごとに塊へ分け、画素数がいちばん多い塊をアイコン本体とみなす
  const gapTol = Math.max(2, Math.round(bh * 0.03));
  const groups = [];
  let start = -1, gap = 0;
  for (let y = 0; y < bh; y++) {
    if (rowCount[y] > 0) { if (start < 0) start = y; gap = 0; }
    else if (start >= 0 && ++gap > gapTol) { groups.push([start, y - gap]); start = -1; gap = 0; }
  }
  if (start >= 0) groups.push([start, bh - 1]);
  if (!groups.length) return null;

  let best = null, bestMass = -1;
  for (const [a, b] of groups) {
    let mass = 0;
    for (let y = a; y <= b; y++) mass += rowCount[y];
    if (mass > bestMass) { bestMass = mass; best = [a, b]; }
  }
  return { x0, x1, y0: y0 + best[0], y1: y0 + best[1] + 1 };
}

/**
 * 矩形内の色相ヒストグラムを測る。
 * 食材を追加するときの実測にも使うので、判定とは別に公開している。
 * @returns {{hue:number[], pixels:number}|null}
 */
export function describeIcon(px, box, { alreadyTight = false } = {}) {
  const iconBox = alreadyTight ? box : findIconRows(px, box);
  if (!iconBox) return null;

  const { w, data } = px;
  const bins = new Array(HUE_BINS).fill(0);
  let n = 0;
  // 右下に「×2」の個数バッジが乗っている。橙の縁と濃い文字が数えられてしまうので、
  // アイコン枠の右半分×下30%は見ない（参照用PNGなど、バッジが無い時も同じ条件にする）
  const bx = iconBox.x0 + (iconBox.x1 - iconBox.x0) * 0.5;
  const by = iconBox.y0 + (iconBox.y1 - iconBox.y0) * 0.70;
  for (let y = Math.round(iconBox.y0); y < Math.round(iconBox.y1); y++) {
    for (let x = Math.round(iconBox.x0); x < Math.round(iconBox.x1); x++) {
      if (x > bx && y > by) continue;
      const i = (y * w + x) * 4;
      if (data[i + 3] < 128) continue; // 透過（参照アイコンPNG用）
      const r = data[i], g = data[i + 1], b = data[i + 2];
      if (isLockBadge(r, g, b)) continue;
      const mx = Math.max(r, g, b);
      const mn = Math.min(r, g, b);
      if (mx < MIN_VAL * 255) continue;
      if ((mx - mn) / mx < MIN_SAT) continue;
      bins[Math.min(HUE_BINS - 1, Math.floor(hue(r, g, b) / (360 / HUE_BINS)))]++;
      n++;
    }
  }
  if (!n) return null;
  return { hue: bins.map(v => v / n), pixels: n, box: iconBox };
}

/** 2つのヒストグラムの距離（Hellinger）。0=同じ、最大で √2 */
function hellinger(a, b) {
  let d = 0;
  for (let i = 0; i < HUE_BINS; i++) {
    const t = Math.sqrt(a[i]) - Math.sqrt(b[i]);
    d += t * t;
  }
  return Math.sqrt(d);
}

/**
 * 1スロットぶんの食材を判定する
 * @param {string[]} [candidates] 候補にする食材名。省略時は PROTOTYPES 全部
 * @returns {{name:string|null, confidence:number, hue:number[]}}
 */
export function classifyIngredientSlot(px, slotBox, candidates = null) {
  const empty = { name: null, confidence: 0, hue: [] };
  const desc = describeIcon(px, slotBox);
  if (!desc || desc.pixels < MIN_PIXELS) return empty;

  const protos = candidates ? PROTOTYPES.filter(p => candidates.includes(p.name)) : PROTOTYPES;
  if (!protos.length) return empty;

  const hist = smooth(desc.hue);
  let best = null, bestDist = Infinity;
  for (const p of protos) {
    const d = hellinger(hist, smooth(p.hue));
    if (d < bestDist) { bestDist = d; best = p; }
  }
  // 「別の食材」でいちばん近いものとの差で自信を決める
  // （同じ食材の解放済み／未解放プロトタイプどうしは比べない）
  let rivalDist = Infinity;
  for (const p of protos) {
    if (p.name === best.name) continue;
    const d = hellinger(hist, smooth(p.hue));
    if (d < rivalDist) rivalDist = d;
  }

  return {
    name: best.name,
    confidence: isFinite(rivalDist)
      ? Math.max(0, Math.min(1, (rivalDist - bestDist) / 0.25))
      : Math.max(0, Math.min(1, 1 - bestDist / 0.5)),
    hue: desc.hue.map(v => Number(v.toFixed(3)))
  };
}
