(() => {
  'use strict';

  const byId = id => document.getElementById(id);
  const categoryLabels = { title: '五大タイトル', exchange: '交流タイトル', open: 'オープン', other: 'その他' };
  const groupLabels = [
    ['color', 'Color（色）'], ['font', 'Font（書体・文字）'],
    ['height', 'Height（高さ）'], ['width', 'Width（幅・線幅）'],
    ['size', 'Size（サイズ・角丸）'], ['space', 'Space（余白）'],
    ['opacity', 'Opacity（不透明度）'], ['shadow', 'Shadow（影）']
  ];
  const tokenDescriptions = {
    '--color-25':'基本文字・主操作色','--color-45':'補助文字・ラベル色','--color-60':'フォーカス表示色',
    '--color-85':'罫線・操作枠色','--color-95':'ページ背景・補助背景色','--color-100':'白背景・白文字',
    '--font-family':'共通フォントファミリー','--font-size-12':'極小文字','--font-size-14':'小文字・ボタン文字',
    '--font-size-16':'基本文字','--font-size-20':'見出し文字','--font-size-24':'大きな見出し文字',
    '--font-weight-normal':'通常の文字太さ','--font-weight-action':'ボタン・見出しの太さ',
    '--height-input':'入力欄の高さ','--height-button':'ボタンの高さ','--height-label':'ラベルの高さ',
    '--width-preset-select':'プリセット選択欄の幅','--width-border':'罫線の太さ','--width-focus-ring':'フォーカス枠の太さ',
    '--size-checkbox':'チェックボックスの大きさ','--size-swatch':'色見本の大きさ','--radius':'角丸',
    '--space-4':'最小余白','--space-8':'小余白','--space-12':'中小余白',
    '--space-16':'中余白','--space-24':'大余白','--opacity':'非活性時の不透明度',
    '--alpha-dialog-backdrop':'ダイアログ背面の濃さ','--shadow':'共通の影'
  };
  const classDescriptions = {
    'jbsui':'共通UIの適用範囲','jbsui-field':'ラベルと入力欄','jbsui-select':'単独プルダウン',
    'jbsui-auto-contrast':'背景色に応じた文字色の自動設定','jbsui-inactive':'非活性の表示','jbsui-color-control':'色選択＋HEX入力',
    'jbsui-color-swatch':'カラーピッカー外枠','jbsui-hex-input':'HEXコード入力',
    'jbsui-dialog':'ダイアログ本体','jbsui-dialog-head':'ダイアログ見出し',
    'jbsui-dialog-close':'ダイアログ閉じるボタン','jbsui-button':'共通ボタン',
    'jbsui-button--primary':'主要操作ボタン','jbsui-divider':'区切り線',
    'jbsui-check':'チェックボックス','jbsui-preset-input':'選択＋入力欄',
    'jbsui-panel':'共通パネル','jbsui-actions':'操作ボタン列','jbsui-action-menu':'操作メニュー',
    'jbsui-grid':'複数列レイアウト','jbsui-grid--2':'2列','jbsui-grid--4':'4列','jbsui-grid--5':'5列',
    'jbsui-combo-input':'候補付き入力','jbsui-combo-menu':'候補メニュー',
    'jbsui-popover-menu':'ポップオーバー','jbsui-file-input':'ファイル入力',
    'jbsui-file-picker':'ファイル選択欄','jbsui-file-button':'ファイル選択ボタン',
    'jbsui-file-status':'選択ファイルの表示','jbsui-hidden':'非表示',
    'jbsui-reference-page':'閲覧ページ背景','jbsui-reference-container':'閲覧コンテンツ幅',
    'jbsui-reference-card':'閲覧用セクション','jbsui-reference-title':'見出し',
    'jbsui-reference-subtitle':'小見出し','jbsui-reference-paragraph':'説明文',
    'jbsui-reference-muted':'補足文字','jbsui-reference-scroll':'横スクロール',
    'jbsui-reference-table':'閲覧用の箱表','jbsui-reference-table--wide':'幅広い箱表',
    'jbsui-reference-table--tokens':'CSS定義一覧',
    'jbsui-reference-group':'分類見出し','jbsui-reference-grid':'情報カードのグリッド',
    'jbsui-reference-stat':'情報カード','jbsui-reference-stat-label':'カード項目名',
    'jbsui-reference-stat-value':'カードの値','jbsui-reference-color':'色とコードの組',
    'jbsui-reference-swatch':'色見本','jbsui-reference-swatch--small':'小さな色見本',
    'jbsui-reference-sample':'背景色の見本','jbsui-reference-pre':'コード例',
    'jbsui-reference-code':'等幅文字','jbsui-reference-definition':'CSS定義の複数行表示',
    'jbsui-reference-nowrap':'折り返し禁止','jbsui-reference-center':'中央揃え',
    'jbsui-reference-strong':'太字','jbsui-reference-notice':'通知'
  };
  let loadedBrand = false;

  function el(tag, cls = '', text) {
    const element = document.createElement(tag);
    if (cls) element.className = cls;
    if (text !== undefined && text !== null) element.textContent = String(text);
    return element;
  }
  function td(row, text, cls = '') {
    const element = el('td', cls, text);
    row.appendChild(element);
    return element;
  }
  function colorVisual(value, small = false) {
    const wrapper = el('span', 'jbsui-reference-color');
    const chip = el('span', 'jbsui-reference-swatch' + (small ? ' jbsui-reference-swatch--small' : ''));
    chip.style.setProperty('--jbsui-swatch', value);
    chip.setAttribute('aria-hidden', 'true');
    wrapper.append(chip, el('span', 'jbsui-reference-nowrap', value));
    return wrapper;
  }
  function warn(text) {
    byId('notice').textContent = text;
    byId('notice').hidden = false;
  }
  function renderBrand() {
    const fragment = document.createDocumentFragment();
    for (const entry of JBSBrand.getTournaments()) {
      const row = el('tr');
      td(row, entry.order, 'jbsui-reference-center jbsui-reference-nowrap');
      td(row, entry.name, 'jbsui-reference-strong jbsui-reference-nowrap');
      td(row, entry.nameEn);
      td(row, JBSBrand.editionForDate(entry, new Date()) || '—', 'jbsui-reference-nowrap');
      td(row, categoryLabels[entry.category] || entry.category, 'jbsui-reference-nowrap');
      td(row).appendChild(colorVisual(entry.color));
      td(row).appendChild(colorVisual(entry.subColor));
      const sample = td(row, entry.name, 'jbsui-reference-sample');
      JBSBrand.applyContrast(sample, entry.color);
      fragment.appendChild(row);
    }
    byId('tournamentRows').replaceChildren(fragment);
    const contrast = JBSBrand.getContrast();
    const info = document.createDocumentFragment();
    for (const [label, value, isColor] of [
      ['輝度のしきい値', String(contrast.threshold), false],
      ['明るい背景の文字色', contrast.darkText, true],
      ['暗い背景の文字色', contrast.lightText, true]
    ]) {
      const card = el('div', 'jbsui-reference-stat');
      card.appendChild(el('p', 'jbsui-reference-stat-label', label));
      const valueArea = el('div', 'jbsui-reference-stat-value');
      if (isColor) valueArea.appendChild(colorVisual(value));
      else valueArea.textContent = value;
      card.appendChild(valueArea);
      info.appendChild(card);
    }
    byId('contrastInfo').replaceChildren(info);
  }
  function groupOf(name) {
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
  function sharedStyles(css) {
    // Browser CSS parser: preserves selectors, declaration values, states and @media conditions.
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(css);
    const map = new Map();
    function visit(rules, query = '') {
      for (const rule of rules) {
        if (rule.type === 1) {
          const selector = rule.selectorText;
          const classes = [...new Set(
            [...selector.matchAll(/\.jbsui(?:-[a-z0-9-]+)*/g)].map(m => m[0].slice(1))
          )].filter(name => name !== 'jbsui' || selector.split(',').some(s => s.trim() === '.jbsui'));
          if (!classes.length) continue;
          const properties = Array.from(rule.style, property => {
            const suffix = rule.style.getPropertyPriority(property) ? ' !important' : '';
            return '  ' + property + ': ' + rule.style.getPropertyValue(property).trim() + suffix + ';';
          }).join('\n');
          const definition = (query ? '@media ' + query + '\n' : '') +
            selector + ' {\n' + properties + '\n}';
          for (const name of classes) {
            if (!map.has(name)) map.set(name, []);
            if (!map.get(name).includes(definition)) map.get(name).push(definition);
          }
        } else if (rule.cssRules) {
          const condition = rule.conditionText || rule.media?.mediaText || '';
          visit(rule.cssRules, [query, condition].filter(Boolean).join(' and '));
        }
      }
    }
    visit(sheet.cssRules);
    return map;
  }
  function showCss(css) {
    const match = css.match(/:root\s*\{([\s\S]*?)\}/);
    if (!match) throw new Error('共通CSSの変数を確認できません。');
    const declarations = match[1].replace(/\/\*[\s\S]*?\*\//g, '');
    const re = /(--[a-z0-9-]+)\s*:\s*([^;]+);/g;
    const tokens = [...declarations.matchAll(re)].map(m => ({
      name: m[1], value: m[2].trim(), group: groupOf(m[1])
    }));
    if (!tokens.length) throw new Error('共通CSSの変数が空です。');
    const tokenFragment = document.createDocumentFragment();
    for (const [group, label] of groupLabels.concat([['other', 'Other（その他）']])) {
      const items = tokens.filter(item => item.group === group);
      if (!items.length) continue;
      const groupRow = el('tr', 'jbsui-reference-group');
      const groupCell = td(groupRow, label);
      groupCell.colSpan = 3;
      tokenFragment.appendChild(groupRow);
      for (const item of items) {
        const row = el('tr');
        td(row, tokenDescriptions[item.name] || '共通変数');
        td(row).appendChild(el('code', 'jbsui-reference-code', item.name));
        td(row).appendChild(item.name.startsWith('--color-')
          ? colorVisual('var(' + item.name + ')', true)
          : el('code', 'jbsui-reference-code', item.value));
        // The last column must always display the literal declared value.
        if (item.name.startsWith('--color-')) {
          row.lastElementChild.lastElementChild.textContent = item.value;
        }
        tokenFragment.appendChild(row);
      }
    }
    byId('cssTokens').replaceChildren(tokenFragment);

    const styles = sharedStyles(css);
    const all = [...styles.keys()].sort((a, b) => {
      const priorities = Object.keys(classDescriptions);
      const ia = priorities.indexOf(a), ib = priorities.indexOf(b);
      return (ia < 0 ? 1000 : ia) - (ib < 0 ? 1000 : ib) || a.localeCompare(b);
    });
    const classFragment = document.createDocumentFragment();
    for (const name of all) {
      const row = el('tr');
      td(row, classDescriptions[name] || '共通表示スタイル');
      td(row).appendChild(el('code', 'jbsui-reference-code', '.' + name));
      td(row).appendChild(el('pre',
        'jbsui-reference-definition jbsui-reference-code',
        styles.get(name).join('\n\n')));
      classFragment.appendChild(row);
    }
    byId('cssClasses').replaceChildren(classFragment);
    const version = css.match(/design system v(\d+)/);
    byId('cssVersion').textContent =
      '(v' + (version?.[1] || '?') + '・変数 ' + tokens.length + '件・スタイル ' + all.length + '件)';
  }
  async function init() {
    const cssPromise = fetch('./ui.css?v=38', { cache: 'no-store' })
      .then(response => {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.text();
      })
      .then(showCss)
      .catch(error => warn('共通CSSを読み込めませんでした：' + error.message));
    try {
      await JBSBrand.load();
      loadedBrand = true;
      renderBrand();
    } catch (error) {
      warn('大会情報を読み込めませんでした：' + error.message);
    }
    await cssPromise;
  }
  init();
  const refresh = () => { if (loadedBrand) renderBrand(); };
  window.addEventListener('focus', refresh);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
  window.setInterval(refresh, 60000);
})();
