/* JBS common brand data client — v9, classic script; no dependencies.
 * <script src="https://jbsbackgammon.github.io/common/brand.js"></script>
 * await JBSBrand.load();
 */
(function (global) {
  'use strict';

  // Resolve against this script, not the embedding application's URL.
  const scriptSrc = document.currentScript && document.currentScript.src;
  const dataUrl = new URL('data/brand.json', scriptSrc || document.baseURI).href;
  const HEX = /^#[0-9A-F]{6}$/i;
  const ID = /^[a-z][a-z0-9-]*$/;
  const CATEGORIES = new Set(['title', 'exchange', 'open', 'other']);
  const EDITIONS_2026 = Object.freeze({
    'japan-championship': 'JBS 第54回', bansei: 'JBS 第33期', meijin: 'JBS 第32期',
    oui: 'JBS 第33期', saiou: 'JBS 第8期', kisei: 'JBS 第5回',
    queen: 'JBS 第3回', 'shin-ei': 'JBS 第15回',
    'tokyo-open': 'JBS 第2回', 'osaka-open': 'JBS 第27回',
    'nagoya-open': 'JBS 第5回'
  });
  const EXCHANGE_IDS = new Set(['kisei', 'queen', 'shin-ei']);
  const JULY_ROLLOVER_IDS = new Set(['bansei', 'saiou']);
  let current = null;
  let loading = null;

  function normalizeColor(value) {
    if (typeof value !== 'string') return null;
    const code = value.trim().replace(/^#/, '');
    if (/^[0-9a-f]{3}$/i.test(code)) return '#' + [...code].map(c => c + c).join('').toUpperCase();
    if (/^[0-9a-f]{6}$/i.test(code)) return '#' + code.toUpperCase();
    return null;
  }

  // Same 32%-toward-white mixing used by the thumbnail tool.
  function makeSubColor(mainColor) {
    const hex = normalizeColor(mainColor);
    if (!hex) return null;
    const toHex = value => Math.round(value + (255 - value) * 0.32).toString(16).padStart(2, '0').toUpperCase();
    return '#' + [1, 3, 5].map(i => toHex(parseInt(hex.slice(i, i + 2), 16))).join('');
  }

  // All edition rollover boundaries are calculated in JST, even when a
  // linked page is opened abroad. Only bansei/saiou change on July 1.
  function jstParts(value = new Date()) {
    if (!(value instanceof Date) || !Number.isFinite(value.getTime())) {
      throw new Error('日付が正しくありません。');
    }
    const jst = new Date(value.getTime() + 9 * 60 * 60 * 1000);
    return { year: jst.getUTCFullYear(), month: jst.getUTCMonth() + 1, day: jst.getUTCDate() };
  }

  function editionCycleYear(entry, date = new Date()) {
    const { year, month, day } = jstParts(date);
    const updateMonth = entry?.editionUpdateMonth ?? (JULY_ROLLOVER_IDS.has(entry?.id) ? 7 : 1);
    const updateDay = entry?.editionUpdateDay ?? 1;
    return month > updateMonth || (month === updateMonth && day >= updateDay) ? year : year - 1;
  }

  // editionBaseYear is the season's rollover year: the first date when
  // editionBase is in effect, not necessarily the calendar year of a match.
  function editionForDate(entry, date = new Date()) {
    if (!entry) return '';
    const base = typeof entry.editionBase === 'string' ? entry.editionBase : '';
    const baseYear = entry.editionBaseYear;
    if (!base || !Number.isSafeInteger(baseYear)) return base;
    const change = editionCycleYear(entry, date) - baseYear;
    return base.replace(/第([0-9]+)(回|期)/, (full, number, unit) => {
      const next = Number(number) + change;
      return Number.isSafeInteger(next) && next >= 1 ? `第${next}${unit}` : full;
    });
  }

  // For explicit year-only callers return the value after that year's
  // rollover. No year provided means the current instant (not year-end).
  function editionForYear(entry, year) {
    if (year === undefined) return editionForDate(entry);
    if (!Number.isSafeInteger(year) || year < 1900 || year > 9999) return '';
    return editionForDate(entry, new Date(Date.UTC(year, 11, 31, 12)));
  }

  function validate(input) {
    if (!input || input.schemaVersion !== 1 || !Array.isArray(input.tournaments)) {
      throw new Error('ブランド設定の形式が正しくありません（schemaVersion: 1 が必要です）。');
    }
    if (input.tournaments.length === 0 || input.tournaments.length > 200) {
      throw new Error('大会は1件以上200件以内にしてください。');
    }
    // Optional for legacy schemaVersion 1 files; the official master defines all formats.
    const formats = input.matchFormats ?? [];
    if (!Array.isArray(formats)) throw new Error('試合形式の定義が不正です。');
    const formatIds = new Set();
    const matchFormats = formats.map(format => {
      const { id, label, knockoutSize, leagueRounds, rounds } = format || {};
      if (typeof id !== 'string' || !ID.test(id) || formatIds.has(id)
          || typeof label !== 'string' || !label.trim()
          || ![8, 16, 32, 64].includes(knockoutSize)
          || !Number.isInteger(leagueRounds) || leagueRounds < 0 || leagueRounds > 64
          || !Array.isArray(rounds) || rounds.length !== Math.log2(knockoutSize) + leagueRounds) {
        throw new Error('試合形式の定義が不正です。');
      }
      formatIds.add(id);
      const names = new Set(), englishNames = new Set();
      const normalized = rounds.map(round => {
        const name = typeof round?.name === 'string' ? round.name.trim() : '';
        const nameEn = typeof round?.nameEn === 'string' ? round.nameEn.trim() : '';
        if (!name || !nameEn || names.has(name.normalize('NFKC')) || englishNames.has(nameEn)) {
          throw new Error('試合名が不正または重複しています。');
        }
        names.add(name.normalize('NFKC')); englishNames.add(nameEn);
        return { name, nameEn };
      });
      return { id, label: label.trim(), knockoutSize, leagueRounds, rounds: normalized };
    });
    const seenIds = new Set(), seenNames = new Set(), seenOrders = new Set();
    const tournaments = input.tournaments.map((entry, i) => {
      const id = typeof entry?.id === 'string' ? entry.id.trim() : '';
      const name = typeof entry?.name === 'string' ? entry.name.trim() : '';
      const nameEn = typeof entry?.nameEn === 'string' ? entry.nameEn.trim() : '';
      const color = normalizeColor(entry?.color);
      // v01/v02 JSON without subColor remains importable.
      const subColor = entry?.subColor == null ? makeSubColor(color) : normalizeColor(entry.subColor);
      // Legacy v03 used category="title" for both major and exchange titles.
      // Migrate only entries with no edition fields, so intentional edits to a
      // saved v04 category are never silently overridden.
      const legacy = entry?.editionBase === undefined && entry?.editionBaseYear === undefined;
      const category = legacy && entry?.category === 'title' && EXCHANGE_IDS.has(id)
        ? 'exchange' : entry?.category;
      const isJuly = JULY_ROLLOVER_IDS.has(id);
      const previousRollover = entry?.editionUpdateMonth === undefined && entry?.editionUpdateDay === undefined;
      // v04 used January 1 for every title. Migrate its unedited default
      // numbers to July 2026's first 33rd/8th editions. Keep custom values.
      const wasV04Default = !legacy && previousRollover && entry.editionBaseYear === 2026
        && ((id === 'bansei' && entry.editionBase === 'JBS 第32期')
          || (id === 'saiou' && entry.editionBase === 'JBS 第7期'));
      const editionBase = legacy ? (EDITIONS_2026[id] || '')
        : wasV04Default ? (EDITIONS_2026[id] || '') : entry?.editionBase;
      const editionBaseYear = legacy ? 2026 : entry?.editionBaseYear;
      const editionUpdateMonth = entry?.editionUpdateMonth ?? (isJuly ? 7 : 1);
      const editionUpdateDay = entry?.editionUpdateDay ?? 1;
      const order = entry?.order;
      if (!ID.test(id) || id.length > 60) throw new Error(`${i + 1}行目のIDが不正です。英小文字・数字・ハイフンを使用してください。`);
      if (!name || name.length > 100 || !nameEn || nameEn.length > 150) throw new Error(`${i + 1}行目の大会名・英語表記を入力してください。`);
      if (!color || !HEX.test(color)) throw new Error(`${name}のメインカラーが不正です。`);
      if (!subColor || !HEX.test(subColor)) throw new Error(`${name}のサブカラーが不正です。`);
      if (!CATEGORIES.has(category)) throw new Error(`${name}の分類が不正です。`);
      if (typeof editionBase !== 'string' || editionBase.length > 100) throw new Error(`${name}の回次は100文字以内で入力してください。`);
      if (!Number.isSafeInteger(editionBaseYear) || editionBaseYear < 1900 || editionBaseYear > 9999) throw new Error(`${name}の基準年が不正です。`);
      // Keep the initial rollover policy fixed for the eight named events;
      // custom entries can also use an explicitly configured rollover month.
      if (!Number.isInteger(editionUpdateMonth) || editionUpdateMonth < 1 || editionUpdateMonth > 12
          || !Number.isInteger(editionUpdateDay) || editionUpdateDay !== 1) {
        throw new Error(`${name}の回次更新日が不正です。`);
      }
      if ((isJuly && editionUpdateMonth !== 7) || (!isJuly && editionUpdateMonth !== 1 && !id.startsWith('custom-'))) {
        throw new Error(`${name}の回次更新月が不正です。`);
      }
      if (!Number.isSafeInteger(order) || order < 1 || order > 999999) throw new Error(`${name}の表示順が不正です。`);
      if (seenIds.has(id)) throw new Error(`ID「${id}」が重複しています。`);
      if (seenNames.has(name)) throw new Error(`大会名「${name}」が重複しています。`);
      if (seenOrders.has(order)) throw new Error(`表示順「${order}」が重複しています。`);
      seenIds.add(id); seenNames.add(name); seenOrders.add(order);
      const matchFormat = entry?.matchFormat ?? null;
      if (matchFormat !== null && !formatIds.has(matchFormat)) throw new Error(name + 'の試合形式が不正です。');
      return { id, name, nameEn, editionBaseYear, editionBase, editionUpdateMonth, editionUpdateDay, category, color, subColor, order, ...(matchFormat ? { matchFormat } : {}) };
    }).sort((a, b) => a.order - b.order);

    const contrast = input.contrast;
    if (!contrast || typeof contrast.threshold !== 'number' || !Number.isFinite(contrast.threshold)
        || contrast.threshold < 0 || contrast.threshold > 1) {
      throw new Error('文字色判定のしきい値は0〜1で指定してください。');
    }
    const darkText = normalizeColor(contrast.darkText);
    const lightText = normalizeColor(contrast.lightText);
    if (!darkText || !lightText) throw new Error('文字色には有効なカラーコードを指定してください。');
    return { schemaVersion: 1, tournaments, contrast: { threshold: contrast.threshold, darkText, lightText }, matchFormats };
  }

  function clone(value) { return JSON.parse(JSON.stringify(value)); }

  async function load(options = {}) {
    if (!options.force && current) return clone(current);
    if (!options.force && loading) return loading.then(clone);
    // Query parameter also bypasses stale CDN copies right after a Pages update.
    const freshUrl = new URL(dataUrl);
    freshUrl.searchParams.set('_', String(Date.now()));
    const promise = fetch(freshUrl.href, { cache: 'no-store' }).then(async response => {
      if (!response.ok) throw new Error(`ブランド設定の取得に失敗しました（HTTP ${response.status}）。`);
      current = validate(await response.json());
      return current;
    });
    loading = promise;
    try { return clone(await promise); }
    finally { if (loading === promise) loading = null; }
  }

  function withEdition(entry) { return { ...entry, edition: editionForDate(entry) }; }
  function getConfig() { return current ? clone(current) : null; }
  function getTournaments() { return current ? current.tournaments.map(e => withEdition(e)) : []; }
  function getTournament(query) {
    if (!current || typeof query !== 'string') return null;
    const key = query.trim().toLocaleLowerCase();
    const found = current.tournaments.find(e => [e.id, e.name, e.nameEn].some(s => s.toLocaleLowerCase() === key));
    return found ? withEdition(found) : null;
  }
  function getEdition(query, year) {
    if (!current || typeof query !== 'string') return null;
    const key = query.trim().toLocaleLowerCase();
    const entry = current.tournaments.find(e => [e.id, e.name, e.nameEn].some(s => s.toLocaleLowerCase() === key));
    return entry ? editionForYear(entry, year) : null;
  }
  // No tournament-specific fallback is guessed: identical Japanese labels
  // can have different meanings depending on the knockout bracket size.
  const genericRounds = [
    ['決勝', 'FINAL'], ['準決勝', 'SEMIFINAL'], ['準々決勝', 'QUARTERFINAL'],
    ['３回戦', 'ROUND 3'], ['２回戦', 'ROUND 2'], ['１回戦', 'ROUND 1'],
    ['プレーオフ', 'PLAY OFF'], ['本戦３回戦', 'MAIN DRAW ROUND 3'],
    ['本戦２回戦', 'MAIN DRAW ROUND 2'], ['本戦１回戦', 'MAIN DRAW ROUND 1']
  ].map(([name, nameEn]) => ({ name, nameEn }));
  function getMatchFormats() { return clone(current?.matchFormats || []); }
  function getMatchRounds(query) {
    const entry = getTournament(query);
    const format = current?.matchFormats.find(item => item.id === entry?.matchFormat);
    if (format) return clone(format.rounds);
    // A known event with missing/offline format data must not be assigned an
    // incorrect round-of number; only universally valid options are returned.
    return clone(entry ? genericRounds.slice(0, 3) : genericRounds);
  }
  // Read older saved settings without requiring users to re-enter the round.
  function splitMatchRound(round) {
    const text = String(round || '').trim();
    const match = text.match(/^リーグ(?:ステージ)?\s*([1-8１-８]回戦)$/);
    if (!match) return { prefix: '', name: text, fullName: text };
    const name = match[1].replace(/[1-8]/g, digit => String.fromCharCode(0xff10 + Number(digit)));
    return { prefix: 'リーグステージ', name, fullName: 'リーグステージ' + name };
  }
  function getMatchRoundEnglish(query, round) {
    const key = splitMatchRound(round).fullName.normalize('NFKC');
    return getMatchRounds(query).find(item => splitMatchRound(item.name).fullName.normalize('NFKC') === key)?.nameEn || null;
  }
  function getColor(query, fallback = null) { return getTournament(query)?.color || fallback; }
  function getSubColor(query, fallback = null) { return getTournament(query)?.subColor || fallback; }

  function luminance(color) {
    const hex = normalizeColor(color);
    if (!hex) return null;
    const channels = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
    const linear = channels.map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  }
  function getTextColor(background, fallback = null) {
    const lum = luminance(background);
    if (lum === null) return fallback;
    const c = current?.contrast || { threshold: 0.26, darkText: '#000000', lightText: '#FFFFFF' };
    return lum > c.threshold ? c.darkText : c.lightText;
  }
  function getContrast() { return current ? { ...current.contrast } : null; }
  // Use after load(): CSS handles presentation, while this helper uses the
  // centralized contrast rule in data/brand.json to set two CSS properties.
  function applyContrast(element, background) {
    const hex = normalizeColor(background);
    if (!element?.style?.setProperty || !element?.classList?.add || !hex) return false;
    const text = getTextColor(hex);
    if (!text) return false;
    element.style.setProperty('--jbsui-contrast-background', hex);
    element.style.setProperty('--jbsui-contrast-text', text);
    element.classList.add('jbsui-auto-contrast');
    return true;
  }



  // A read-only public API. Editors use validate() without changing the loaded data.
  global.JBSBrand = Object.freeze({
    version: 9, dataUrl, load, getConfig, getTournaments, getTournament, getEdition, editionForYear, editionForDate, editionCycleYear,
    getMatchFormats, getMatchRounds, getMatchRoundEnglish, splitMatchRound, getColor, getSubColor, makeSubColor, getTextColor, getContrast, applyContrast, luminance, normalizeColor, validate
  });
})(window);
