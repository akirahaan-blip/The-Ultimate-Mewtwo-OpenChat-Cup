/**
 * The Ultimate Mewtwo OpenChat Cup - スコアリングエンジン
 *
 * サブスキル名・性格の効果といった「ゲーム側の事実」は
 * vendor/pokesleep-vision のマスタデータを使う。
 * ここに持つのは大会の配点だけにして、名前を二重管理しないようにしている。
 */
import { SUB_SKILLS as SUB_SKILL_MASTER, NATURES as NATURE_MASTER } from './vendor/pokesleep-vision/gamedata.js?v=33';
import { INGREDIENT_BY_CODE } from './ingredients-setting.js?v=33';

// サブスキルの大会配点（2026-09-13 ミュウツー配点表）。
// isGold は「オール金スキルボーナス」、isBlue は「地球は青かった」の対象かどうか
// （ゲーム内でスキル名が金色／青色で表示されるもの。どちらでもない白いスキルは両方 false）。
const SUB_SKILL_POINTS = {
  kinomi_s:   { score: 150, isGold: true,  isBlue: false },
  otebo:      { score: 150, isGold: true,  isBlue: false },
  suimin_bo:  { score: 150, isGold: true,  isBlue: false },
  risa_bo:    { score: 80,  isGold: true,  isBlue: false },
  yume_bo:    { score: 80,  isGold: true,  isBlue: false },
  gen_bo:     { score: 80,  isGold: true,  isBlue: false },
  skileve_m:  { score: 80,  isGold: true,  isBlue: false },
  skileve_s:  { score: 40,  isGold: false, isBlue: true  },
  speed_m:    { score: 120, isGold: false, isBlue: true  },
  speed_s:    { score: 80,  isGold: false, isBlue: false },
  skill_m:    { score: 200, isGold: false, isBlue: true  },
  skill_s:    { score: 100, isGold: false, isBlue: false },
  shokuzai_m: { score: 0,   isGold: false, isBlue: true  },
  shokuzai_s: { score: 10,  isGold: false, isBlue: false },
  shoji_l:    { score: 100, isGold: false, isBlue: true  },
  shoji_m:    { score: 50,  isGold: false, isBlue: true  },
  shoji_s:    { score: 30,  isGold: false, isBlue: false }
};

// マスタ（id / name / short / aliases）に大会の配点を合成する
export const SUB_SKILLS = SUB_SKILL_MASTER.map(s => ({
  ...s,
  ...SUB_SKILL_POINTS[s.id]
}));

// 食材の定義は ingredients-setting.js に集めてある。
// 食材を変えるときは、あちらのファイルだけを直せば、ここも画面も投稿文も
// まとめて変わるようにしている（同じ名前をあちこちに書かないため）。
export const INGREDIENTS = INGREDIENT_BY_CODE;

// 食材パターンの配点。左からLv.1 / Lv.30 / Lv.60 の食材コード。
// 「AAA なら100点」のように、食材の名前ではなく記号で決めているので、
// 食材の種類が変わってもこの表はそのまま使える。
const INGREDIENT_PATTERN_POINTS = {
  "AAA": 100,
  "ABB": 60,
  "ABC": 20,
  "AAB": 10,
  "AAC": 10,
  "ABA": -30
};

// 画面に出す見出し（例: "ABA (大豆/コーン/大豆)"）は、上の配点と
// 食材設定から自動で組み立てる。食材名を手で書き写さないようにするため。
export const INGREDIENT_SCORES = {
  ...Object.fromEntries(
    Object.entries(INGREDIENT_PATTERN_POINTS).map(([pattern, score]) => [
      pattern,
      {
        score,
        label: `${pattern} (${[...pattern].map(c => INGREDIENT_BY_CODE[c].short).join("/")})`
      }
    ])
  ),
  "OTHER": { score: 0, label: "未選択 / その他" }
};

/**
 * 3枠の食材からパターンコードを判定
 */
export function getIngredientPattern(slot1 = "A", slot30 = "A", slot60 = "A") {
  const pattern = `${slot1}${slot30}${slot60}`;
  if (INGREDIENT_SCORES[pattern]) {
    return pattern;
  }
  return "OTHER";
}

// 性格定義（上昇・下降補正と配点）
// short は結果カード用の略称。name をそのまま並べると1行に収まらないため。
export const NATURE_SCORES = {
  up: {
    "skill":      { name: "メインスキル発生確率", short: "スキル", score: 100, label: "スキル↑↑ (+100)" },
    "exp":        { name: "獲得EXP",           short: "EXP",    score: 90,  label: "EXP↑↑ (+90)" },
    "speed":      { name: "おてつだいスピード", short: "スピ",   score: 70,  label: "スピ↑↑ (+70)" },
    "energy":     { name: "げんき回復量",       short: "げんき", score: 20,  label: "げんき↑↑ (+20)" },
    "ingredient": { name: "食材おてつだい確率", short: "食材",   score: -30, label: "食材↑↑ (-30)" },
    "none":       { name: "なし",               short: "なし",   score: 0,   label: "なし (+0)" }
  },
  down: {
    "ingredient": { name: "食材おてつだい確率", short: "食材",   score: 30,   label: "食材↓↓ (+30)" },
    "energy":     { name: "げんき回復量",       short: "げんき", score: 0,    label: "げんき↓↓ (+0)" },
    "speed":      { name: "おてつだいスピード", short: "スピ",   score: -50,  label: "スピ↓↓ (-50)" },
    "exp":        { name: "獲得EXP",           short: "EXP",    score: -50,  label: "EXP↓↓ (-50)" },
    "skill":      { name: "メインスキル発生確率", short: "スキル", score: -100, label: "スキル↓↓ (-100)" },
    "none":       { name: "なし",               short: "なし",   score: 0,    label: "なし (+0)" }
  }
};

// 性格一覧（25種類）はマスタをそのまま使う
export const NATURES = NATURE_MASTER;

/**
 * SPボーナス計算
 */
export function calculateSpBonus(sp) {
  if (!sp || isNaN(sp) || sp <= 0) return { score: 0, reason: null };
  const spStr = String(sp);

  // 1000 はキリ番(+50)にも当てはまるが、先にこちらで判定して +200 だけにする
  if (sp === 1000) {
    return { score: 200, reason: "SP 1000 ボーナス (+200)" };
  }
  if (spStr.length >= 2 && spStr.split('').every(c => c === spStr[0])) {
    return { score: 100, reason: `SP ゾロ目ボーナス (${sp}) (+100)` };
  }
  if (spStr.length >= 3 && sp % 100 === 0) {
    return { score: 50, reason: `SP キリ番ボーナス (${sp}) (+50)` };
  }
  return { score: 0, reason: null };
}

/**
 * 総合スコア計算関数
 */
export function calculateTotalScore(state) {
  const details = [];
  let totalScore = 0;

  // 1. サブスキル計算 (Lv10, Lv25, Lv50, Lv70, Lv80)
  const slotDiscountRates = [1.0, 1.0, 1.0, 0.9, 0.7]; // Lv70は1割引(0.9), Lv80は3割引(0.7)
  const slotLevels = [10, 25, 50, 70, 80];
  let subSkillTotal = 0;
  const subSkillObjects = [];

  for (let i = 0; i < 5; i++) {
    const skillId = state.subSkills?.[i];
    const skillObj = SUB_SKILLS.find(s => s.id === skillId);
    const rate = slotDiscountRates[i];
    const lv = slotLevels[i];

    if (skillObj) {
      subSkillObjects.push({ ...skillObj, slotIndex: i, lv, rate });
      const baseScore = skillObj.score;
      const discountedScore = Math.round(baseScore * rate);
      subSkillTotal += discountedScore;

      let discountText = "";
      if (rate < 1.0) {
        discountText = ` (Lv.${lv}枠 ${Math.round((1 - rate) * 100)}%引)`;
      }

      details.push({
        category: `サブスキル (Lv.${lv})`,
        name: `${skillObj.name}${discountText}`,
        score: discountedScore
      });
    } else {
      subSkillObjects.push(null);
    }
  }
  totalScore += subSkillTotal;

  // 2. 食材構成
  let ingPattern = state.ingredientPattern;
  if (!ingPattern && state.ingredients) {
    ingPattern = getIngredientPattern(state.ingredients[0], state.ingredients[1], state.ingredients[2]);
  }
  const ingData = INGREDIENT_SCORES[ingPattern] || INGREDIENT_SCORES["OTHER"];
  if (ingData && ingData.score !== 0) {
    details.push({ category: "食材構成", name: ingData.label, score: ingData.score });
    totalScore += ingData.score;
  }

  // 3. 性格補正
  let natureUp = state.natureUp || "none";
  let natureDown = state.natureDown || "none";
  if (state.natureName) {
    const foundNature = NATURES.find(n => n.name === state.natureName);
    if (foundNature) {
      natureUp = foundNature.up;
      natureDown = foundNature.down;
    }
  }
  const upObj = NATURE_SCORES.up[natureUp] || NATURE_SCORES.up["none"];
  const downObj = NATURE_SCORES.down[natureDown] || NATURE_SCORES.down["none"];
  const natureTotal = upObj.score + downObj.score;

  if (state.natureName) {
    details.push({
      category: "性格補正",
      name: `${state.natureName} (${upObj.short}↑↑ / ${downObj.short}↓↓)`,
      score: natureTotal
    });
    totalScore += natureTotal;
  }

  // 4. 色違いボーナス (+350)
  if (state.isShiny) {
    details.push({ category: "特別ボーナス", name: "★ 色違いボーナス", score: 350 });
    totalScore += 350;
  }

  // 5. SPボーナス
  const spBonus = calculateSpBonus(state.sp);
  if (spBonus.score > 0) {
    details.push({ category: "特別ボーナス", name: spBonus.reason, score: spBonus.score });
    totalScore += spBonus.score;
  }

  // 6. 初回注文ボーナス (2匹目) (+100)
  // FL10以内ボーナスの置きかえ（ほとんどの個体がFL10以内になるため廃止）。
  if (state.isSecondOrder) {
    details.push({ category: "特別ボーナス", name: "初回注文ボーナス (2匹目)", score: 100 });
    totalScore += 100;
  }

  // 7. コンボボーナス
  const validSkills = subSkillObjects.filter(Boolean);
  const validIds = validSkills.map(s => s.id);

  // コンボの加点をする共通処理。
  // コンボの点には Lv.70/80枠の割引は掛けない（割引はサブスキル本体の点だけ）。
  const addCombo = (name, score) => {
    details.push({ category: "コンボボーナス", name, score });
    totalScore += score;
  };

  // 「決まったサブスキルが全部そろっている」タイプのコンボ。
  // needNatureUp を指定したものは、性格の↑↑もその能力である必要がある（性格には割引はない）。
  const SKILL_SET_COMBOS = [
    { name: "3種の神器ボーナス (おて/きの/睡ボ)",           score: 100, ids: ["otebo", "kinomi_s", "suimin_bo"] },
    { name: "こてい個体ボーナス (所持数S+M+L)",             score: 144, ids: ["shoji_s", "shoji_m", "shoji_l"] },
    { name: "ギガ枕EX (睡ボ/ゆめボ/リサボ)",                score: 30,  ids: ["suimin_bo", "yume_bo", "risa_bo"] },
    { name: "ほおばりセット (食材M/食材S/食材↑↑)",         score: 50,  ids: ["shokuzai_m", "shokuzai_s"], needNatureUp: "ingredient" },
    { name: "スキ確ハッピーセット (スキM/スキS/スキル↑↑)", score: 80,  ids: ["skill_m", "skill_s"],       needNatureUp: "skill" }
  ];
  for (const combo of SKILL_SET_COMBOS) {
    if (!combo.ids.every(id => validIds.includes(id))) continue;
    if (combo.needNatureUp && natureUp !== combo.needNatureUp) continue;
    addCombo(combo.name, combo.score);
  }

  // 「5枠ぜんぶが同じ色」タイプのコンボ。
  if (validSkills.length === 5 && validSkills.every(s => s.isGold)) {
    addCombo("オール金スキルボーナス", 200);
  }
  if (validSkills.length === 5 && validSkills.every(s => s.isBlue)) {
    addCombo("地球は青かった (サブスキル全部青色)", 30);
  }

  return { totalScore, details };
}
