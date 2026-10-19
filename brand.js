/* JBS common brand data client — v3, classic script; no dependencies.
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
  const CATEGORIES = new Set(['title', 'open', 'other']);
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

  function validate(input) {
    if (!input || input.schemaVersion !== 1 || !Array.isArray(input.tournaments)) {
      throw new Error('ブランド設定の形式が正しくありません（schemaVersion: 1 が必要です）。');
    }
    if (input.tournaments.length === 0 || input.tournaments.length > 200) {
      throw new Error('大会は1件以上200件以内にしてください。');
    }
    const seenIds = new Set(), seenNames = new Set(), seenOrders = new Set();
    const tournaments = input.tournaments.map((entry, i) => {
      const id = typeof entry?.id === 'string' ? entry.id.trim() : '';
      const name = typeof entry?.name === 'string' ? entry.name.trim() : '';
      const nameEn = typeof entry?.nameEn === 'string' ? entry.nameEn.trim() : '';
      const color = normalizeColor(entry?.color);
      // v01/v02 JSON without subColor remains importable.
      const subColor = entry?.subColor == null ? makeSubColor(color) : normalizeColor(entry.subColor);
      const category = entry?.category;
      const order = entry?.order;
      if (!ID.test(id) || id.length > 60) throw new Error(`${i + 1}行目のIDが不正です。英小文字・数字・ハイフンを使用してください。`);
      if (!name || name.length > 100 || !nameEn || nameEn.length > 150) throw new Error(`${i + 1}行目の大会名・英語表記を入力してください。`);
      if (!color || !HEX.test(color)) throw new Error(`${name}のメインカラーが不正です。`);
      if (!subColor || !HEX.test(subColor)) throw new Error(`${name}のサブカラーが不正です。`);
      if (!CATEGORIES.has(category)) throw new Error(`${name}の分類が不正です。`);
      if (!Number.isSafeInteger(order) || order < 1 || order > 999999) throw new Error(`${name}の表示順が不正です。`);
      if (seenIds.has(id)) throw new Error(`ID「${id}」が重複しています。`);
      if (seenNames.has(name)) throw new Error(`大会名「${name}」が重複しています。`);
      if (seenOrders.has(order)) throw new Error(`表示順「${order}」が重複しています。`);
      seenIds.add(id); seenNames.add(name); seenOrders.add(order);
      return { id, name, nameEn, category, color, subColor, order };
    }).sort((a, b) => a.order - b.order);

    const contrast = input.contrast;
    if (!contrast || typeof contrast.threshold !== 'number' || !Number.isFinite(contrast.threshold)
        || contrast.threshold < 0 || contrast.threshold > 1) {
      throw new Error('文字色判定のしきい値は0〜1で指定してください。');
    }
    const darkText = normalizeColor(contrast.darkText);
    const lightText = normalizeColor(contrast.lightText);
    if (!darkText || !lightText) throw new Error('文字色には有効なカラーコードを指定してください。');
    return { schemaVersion: 1, tournaments, contrast: { threshold: contrast.threshold, darkText, lightText } };
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

  function getConfig() { return current ? clone(current) : null; }
  function getTournaments() { return current ? current.tournaments.map(e => ({ ...e })) : []; }
  function getTournament(query) {
    if (!current || typeof query !== 'string') return null;
    const key = query.trim().toLocaleLowerCase();
    const found = current.tournaments.find(e => [e.id, e.name, e.nameEn].some(s => s.toLocaleLowerCase() === key));
    return found ? { ...found } : null;
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

  // A read-only public API. Editors use validate() without changing the loaded data.
  global.JBSBrand = Object.freeze({
    version: 3, dataUrl, load, getConfig, getTournaments, getTournament,
    getColor, getSubColor, makeSubColor, getTextColor, getContrast, luminance, normalizeColor, validate
  });
})(window);
