(function () {
  'use strict';

  const $ = id => document.getElementById(id);
  const categories = {
    title: '五大タイトル',
    exchange: '交流タイトル',
    open: 'オープン',
    other: 'その他'
  };
  const groups = [
    ['color', 'Color（色）'],
    ['font', 'Font（書体・文字）'],
    ['height', 'Height（高さ）'],
    ['width', 'Width（幅・線幅）'],
    ['size', 'Size（サイズ・角丸）'],
    ['space', 'Space（余白）'],
    ['opacity', 'Opacity（不透明度）'],
    ['shadow', 'Shadow（影）']
  ];
  const descriptions = {
    '--color-25': '基本文字・主操作色',
    '--color-45': '補助文字・ラベル色',
    '--color-60': 'フォーカス表示色',
    '--color-85': '罫線・操作枠色',
    '--color-95': 'ページ背景・補助背景色',
    '--color-100': '白背景・白文字',
    '--font-family': '共通フォントファミリー',
    '--font-size-12': '極小文字',
    '--font-size-14': '小文字・ボタン文字',
    '--font-size-16': '基本文字',
    '--font-size-20': '見出し文字',
    '--font-size-24': '大きな見出し文字',
    '--font-weight-normal': '通常の文字太さ',
    '--font-weight-action': 'ボタン・見出しの太さ',
    '--height-input': '入力欄の高さ',
    '--height-button': 'ボタンの高さ',
    '--height-label': 'ラベルの高さ',
    '--width-preset-select': 'プリセット選択欄の幅',
    '--width-border': '罫線の太さ',
    '--width-focus-ring': 'キーボードフォーカス枠の太さ',
    '--size-checkbox': 'チェックボックスの大きさ',
    '--size-swatch': '色見本の大きさ',
    '--radius': '角丸',
    '--space-4': '最小余白',
    '--space-8': '小余白',
    '--space-12': '中小余白',
    '--space-16': '中余白',
    '--space-24': '大余白',
    '--opacity': '非活性時の不透明度',
    '--alpha-dialog-backdrop': 'ダイアログ背面の濃さ',
    '--shadow': '共通の影'
  };
  const classDescriptions = {
    'jbsui': '共通UIの適用範囲',
    'jbsui-field': 'ラベルと入力欄の組',
    'jbsui-select': '単独プルダウン',
    'jbsui-inactive': '非活性の表示',
    'jbsui-color-control': 'カラーピッカーとHEX入力欄の組',
    'jbsui-color-swatch': 'カラーピッカーの外枠',
    'jbsui-hex-input': 'カラーコード入力欄',
    'jbsui-dialog': 'ダイアログ本体',
    'jbsui-dialog-head': 'ダイアログの見出し領域',
    'jbsui-dialog-close': 'ダイアログの閉じるボタン',
    'jbsui-button': '共通ボタン',
    'jbsui-button--primary': '主要操作ボタン',
    'jbsui-divider': '区切り線',
    'jbsui-check': 'チェックボックス',
    'jbsui-preset-input': '選択欄と文字入力欄の連結'
  };
  let brandLoaded = false;
  function node(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined && text !== null) el.textContent = String(text);
    return el;
  }
  function cell(row, value, className) {
    const td = node('td', className, value);
    row.appendChild(td);
    return td;
  }
  function colorDisplay(color) {
    const root = node('span', 'color-display');
    const chip = node('span', 'color-chip');
    chip.style.setProperty('--chip-color', color);
    chip.setAttribute('aria-hidden', 'true');
    root.append(chip, node('code', '', color));
    return root;
  }
  function showError(message) {
    const target = $('notice');
    target.textContent = message;
    target.hidden = false;
  }
  function renderBrand() {
    const tbody = $('tournamentRows');
    const tournaments = JBSBrand.getTournaments();
    const fragment = document.createDocumentFragment();
    for (const entry of tournaments) {
      const tr = document.createElement('tr');
      cell(tr, entry.order, 'order');
      cell(tr, entry.name, 'name');
      cell(tr, entry.nameEn, 'english');
      cell(tr, JBSBrand.editionForDate(entry, new Date()) || '—', 'edition');
      cell(tr, categories[entry.category] || entry.category, 'category');
      cell(tr).appendChild(colorDisplay(entry.color));
      cell(tr).appendChild(colorDisplay(entry.subColor));
      const sample = cell(tr, entry.name, 'sample');
      sample.style.backgroundColor = entry.color;
      sample.style.color = JBSBrand.getTextColor(entry.color);
      fragment.appendChild(tr);
    }
    tbody.replaceChildren(fragment);
    const contrast = JBSBrand.getContrast();
    const grid = $('contrastInfo');
    grid.replaceChildren();
    const specs = [
      ['輝度のしきい値', String(contrast.threshold), false],
      ['明るい背景の文字色', contrast.darkText, true],
      ['暗い背景の文字色', contrast.lightText, true]
    ];
    for (const [label, value, isColor] of specs) {
      const box = node('div', 'stat');
      box.appendChild(node('p', 'stat-label', label));
      const valueRow = node('div', 'stat-value');
      if (isColor) valueRow.appendChild(colorDisplay(value));
      else valueRow.textContent = value;
      box.appendChild(valueRow);
      grid.appendChild(box);
    }
  }
  function categoryFor(name) {
    if (name.startsWith('--color-')) return 'color';
    if (name.startsWith('--font-')) return 'font';
    if (name.startsWith('--height-')) return 'height';
    if (name.startsWith('--width-')) return 'width';
    if (name.startsWith('--size-') || name === '--radius') return 'size';
    if (name.startsWith('--space-')) return 'space';
    if (name.startsWith('--opacity') || name.startsWith('--alpha-')) return 'opacity';
    if (name.startsWith('--shadow')) return 'shadow';
    return 'other';
  }
  function appendTokenRows(css) {
    const source = css.match(/:root\s*\{([\s\S]*?)\}/);
    if (!source) throw new Error('CSSの変数定義を確認できません。');
    const declarations = source[1].replace(/\/\*[\s\S]*?\*\//g, '');
    const re = /(--[a-z0-9-]+)\s*:\s*([^;]+);/g;
    const tokens = [];
    let match;
    while ((match = re.exec(declarations)) !== null) {
      tokens.push({ name: match[1], value: match[2].trim(), group: categoryFor(match[1]) });
    }
    if (!tokens.length) throw new Error('共通CSS変数が見つかりません。');
    const tbody = $('cssTokens');
    const fragment = document.createDocumentFragment();
    const orderedGroups = groups.concat([['other', 'Other（その他）']]);
    for (const [groupId, groupName] of orderedGroups) {
      const items = tokens.filter(token => token.group === groupId);
      if (!items.length) continue;
      const groupRow = node('tr', 'group-heading');
      const groupCell = node('td', '', groupName);
      groupCell.colSpan = 3;
      groupRow.appendChild(groupCell);
      fragment.appendChild(groupRow);
      for (const token of items) {
        const tr = document.createElement('tr');
        cell(tr, descriptions[token.name] || '共通スタイル', '');
        cell(tr).appendChild(node('code', '', token.name));
        const valueCell = cell(tr, '', 'value-cell');
        const value = node('span', 'value-preview');
        if (token.name.startsWith('--color-')) {
          const chip = node('span', 'color-chip');
          chip.style.setProperty('--chip-color', 'var(' + token.name + ')');
          chip.setAttribute('aria-hidden', 'true');
          value.appendChild(chip);
        }
        value.appendChild(node('code', '', token.value));
        valueCell.appendChild(value);
        fragment.appendChild(tr);
      }
    }
    tbody.replaceChildren(fragment);
    const classes = $('cssClasses');
    const classFragment = document.createDocumentFragment();
    for (const [className, description] of Object.entries(classDescriptions)) {
      if (!css.includes('.' + className)) continue;
      const tr = document.createElement('tr');
      cell(tr, description);
      cell(tr).appendChild(node('code', '', '.' + className));
      classFragment.appendChild(tr);
    }
    classes.replaceChildren(classFragment);
    const version = css.match(/design system v(\d+)/);
    $('cssVersion').textContent = version ? '(v' + version[1] + '・変数 ' + tokens.length + '件)' : '(変数 ' + tokens.length + '件)';
  }
  async function loadCssInfo() {
    try {
      const response = await fetch('./ui.css?v=31', { cache: 'no-store' });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      appendTokenRows(await response.text());
    } catch (error) {
      const tr = document.createElement('tr');
      const td = cell(tr, '共通CSSを取得できませんでした：' + error.message);
      td.colSpan = 3;
      $('cssTokens').replaceChildren(tr);
    }
  }
  async function init() {
    const cssTask = loadCssInfo();
    try {
      await JBSBrand.load();
      brandLoaded = true;
      renderBrand();
    } catch (error) {
      showError('大会情報を読み込めませんでした：' + error.message);
    }
    await cssTask;
  }
  init();
  // Edition labels continue to change automatically at the documented JST boundary.
  window.addEventListener('focus', () => { if (brandLoaded) renderBrand(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && brandLoaded) renderBrand(); });
  window.setInterval(() => { if (brandLoaded) renderBrand(); }, 60000);
})();
