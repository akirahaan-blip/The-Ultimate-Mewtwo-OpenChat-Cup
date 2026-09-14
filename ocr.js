/**
 * The Ultimate Mewtwo OpenChat Cup - スクショ解析（大会ルールへの変換）
 *
 * 画面の読み取りそのものは vendor/pokesleep-vision が担当する。
 * ここでやるのは、読み取れた「ゲームの事実」を大会のルールに翻訳することだけ。
 *   ・食材名 → A / B / C のコード
 *   ・Lv.1 の食材は必ず1種類目、という前提の適用
 */
import { getIngredientPattern } from './scoring.js?v=23';
import { INGREDIENT_LIST } from './ingredients-setting.js?v=23';
import { readStatusScreen, initOCR } from './vendor/pokesleep-vision/index.js?v=23';

export { initOCR };

// 大会で使う食材コード。ライブラリは食材名で返してくるので、ここで対応づける。
// 中身は ingredients-setting.js から自動で作られる。
const INGREDIENT_CODES = Object.fromEntries(
  INGREDIENT_LIST.map(ing => [ing.name, ing.code])
);

// 大会の対象になるポケモン。名前のOCRをこの文字だけに絞るために渡す
const POKEMON_NAMES = ['ミュウツー'];

/**
 * スクショ1枚から、大会の入力フォームに流し込める形を作る
 */
export async function analyzeScreenshot(imageElement, onProgress, options = {}) {
  const read = await readStatusScreen(imageElement, {
    onProgress,
    onCrop: options.onCrop,
    pokemonNames: POKEMON_NAMES,
    // 大会の食材3つだけを候補にする（トマトなど関係ない食材に当たらないように）
    ingredientNames: INGREDIENT_LIST.map(ing => ing.name),
    verbose: true
  });

  const ingredients = read.ingredients.map(i => INGREDIENT_CODES[i.name] || null);
  // Lv.1 の食材は必ず1種類目（コードA）。
  // ポケモンをタップした時のポップアップに隠れていることも多いので、判定結果より優先する。
  ingredients[0] = 'A';

  return {
    pokemonName: read.pokemonName || POKEMON_NAMES[0],
    isTarget: true,
    isShiny: false,
    sp: read.sp ? read.sp.value : null,
    natureName: read.nature ? read.nature.name : null,
    subSkills: read.subSkills.map(s => s.id),
    ingredients,
    ingredientPattern: getIngredientPattern('A', ingredients[1] || 'A', ingredients[2] || 'A'),
    detected: {
      ingredients: ingredients.filter(Boolean).length,
      subSkills: read.subSkills.filter(s => s.id).length,
      nature: !!read.nature,
      // SPは「SP」の文字ごと読めた時だけ確定。それ以外は時計やバッテリー残量の
      // 可能性があるので要確認あつかいにする
      sp: read.sp ? (read.sp.sure ? 'sure' : 'unsure') : false
    },
    raw: read.raw
  };
}
