(function () {
  'use strict';

  const REPO = 'jbsbackgammon/common';
  const PATH = 'data/brand.json';
  const API_URL = `https://api.github.com/repos/${REPO}/contents/${PATH}`;
  const $ = id => document.getElementById(id);
  let working = null;
  let baseline = null;
  let dirty = false;
  let busy = false;

  function notify(message, error = false) {
    const el = $('notice');
    el.textContent = message;
    el.classList.toggle('error', error);
    el.hidden = !message;
  }
  function setDirty(value) {
    dirty = value;
    $('editStatus').textContent = value ? '未保存の変更あり' : '公開データと同期済み';
    $('editStatus').classList.toggle('is-dirty', value);
  }
  function markDirty() { setDirty(true); notify(''); }
  function color(value) { return JBSBrand.normalizeColor(value); }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function validateWorking() { return JBSBrand.validate(working); }
  function canon(obj) { return JSON.stringify(JBSBrand.validate(obj)); }

  function demoTextColor(background) {
    const lum = JBSBrand.luminance(background);
    const contrast = working.contrast;
    if (lum === null || !Number.isFinite(Number(contrast.threshold))) return '#000000';
    return lum > Number(contrast.threshold) ? (color(contrast.darkText) || '#000000') : (color(contrast.lightText) || '#FFFFFF');
  }
  function updateSamples() {
    [...$('tournamentRows').children].forEach(row => {
      const index = Number(row.dataset.index);
      const entry = working.tournaments[index];
      const sample = row.querySelector('.sample');
      const bg = color(entry.color);
      sample.textContent = entry.name || '大会名';
      sample.style.backgroundColor = bg || '#E5E7EB';
      sample.style.color = bg ? demoTextColor(bg) : '#1f2937';
      sample.title = `${entry.color || 'カラー未設定'} / 文字色 ${bg ? demoTextColor(bg) : '不明'}`;
    });
  }

  function bindTextInput(row, className, entry, property) {
    const input = row.querySelector('.' + className);
    input.value = String(entry[property]);
    input.addEventListener('input', () => {
      entry[property] = property === 'order' ? (input.value === '' ? '' : Number(input.value)) : input.value;
      markDirty();
      if (property === 'name') updateSamples();
    });
  }

  function makeColorGroup(picker, field, onChange) {
    picker.value = color(field.value) || '#000000';
    picker.addEventListener('input', () => {
      field.value = picker.value.toUpperCase();
      onChange(field.value);
      markDirty();
      updateSamples();
    });
    field.addEventListener('input', () => {
      const normalized = color(field.value);
      if (normalized) picker.value = normalized;
      onChange(field.value);
      markDirty();
      updateSamples();
    });
    field.addEventListener('blur', () => {
      const normalized = color(field.value);
      if (normalized) field.value = normalized;
    });
  }

  function renderRows() {
    const tbody = $('tournamentRows');
    tbody.replaceChildren();
    working.tournaments.forEach((entry, index) => {
      const row = document.createElement('tr');
      row.dataset.index = String(index);
      // The template contains no user-provided HTML; values are assigned via DOM properties.
      row.innerHTML = `
        <td><input class="input-order" type="number" min="1" max="999999" step="1" aria-label="表示順"></td>
        <td><input class="name-input" type="text" maxlength="100" aria-label="大会名"><div class="id-note"></div></td>
        <td><input class="en-input" type="text" maxlength="150" aria-label="英語表記"></td>
        <td><select class="category-input" aria-label="分類"><option value="title">タイトル戦</option><option value="open">オープン</option><option value="other">その他</option></select></td>
        <td><div class="color-controls"><input class="color-picker" type="color" aria-label="色を選択"><input class="color-code" type="text" maxlength="7" spellcheck="false" aria-label="カラーコード"></div></td>
        <td><div class="sample"></div></td>
        <td><button type="button" class="mini-button delete-button" aria-label="大会を削除">削除</button></td>`;
      bindTextInput(row, 'input-order', entry, 'order');
      bindTextInput(row, 'name-input', entry, 'name');
      bindTextInput(row, 'en-input', entry, 'nameEn');
      row.querySelector('.id-note').textContent = entry.id;
      const categorySelect = row.querySelector('.category-input');
      categorySelect.value = entry.category;
      categorySelect.addEventListener('change', () => { entry.category = categorySelect.value; markDirty(); });
      const code = row.querySelector('.color-code');
      code.value = entry.color;
      makeColorGroup(row.querySelector('.color-picker'), code, value => { entry.color = value; });
      row.querySelector('.delete-button').addEventListener('click', () => {
        if (working.tournaments.length === 1) { notify('大会をすべて削除することはできません。', true); return; }
        if (!confirm(`「${entry.name}」を削除しますか？ この大会IDを参照するツールにも影響します。`)) return;
        working.tournaments.splice(index, 1);
        markDirty();
        renderRows();
      });
      tbody.appendChild(row);
    });
    updateSamples();
  }

  function renderContrast() {
    const c = working.contrast;
    $('threshold').value = c.threshold;
    ['darkText', 'lightText'].forEach(key => {
      const field = $(`${key}Code`);
      field.value = c[key];
      $(`${key}Picker`).value = color(c[key]) || '#000000';
    });
  }
  function render() { renderRows(); renderContrast(); }

  function addTournament() {
    const ids = new Set(working.tournaments.map(e => e.id));
    let index = 1;
    while (ids.has(`custom-${index}`)) index++;
    const nextOrder = Math.max(0, ...working.tournaments.map(e => Number(e.order) || 0)) + 10;
    working.tournaments.push({ id: `custom-${index}`, name: '', nameEn: '', category: 'other', color: '#3C3C3C', order: nextOrder });
    markDirty();
    renderRows();
    $('tournamentRows').lastElementChild.querySelector('.name-input').focus();
  }
  function encodeUtf8Base64(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
  }
  function decodeUtf8Base64(content) {
    const binary = atob(content.replace(/\s/g, ''));
    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  function timestamp() {
    const d = new Date();
    return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0'),
      String(d.getHours()).padStart(2, '0'), String(d.getMinutes()).padStart(2, '0'), String(d.getSeconds()).padStart(2, '0')].join('');
  }
  function exportJson() {
    try {
      const data = validateWorking();
      const blob = new Blob([JSON.stringify(data, null, 2) + '\n'], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `brand_${timestamp()}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 3000);
      notify('JSONを出力しました。GitHubに直接アップロードする際はファイル名を「brand.json」にして data フォルダを上書きしてください。');
    } catch (error) { notify(error.message, true); }
  }
  async function importJson(file) {
    if (!file) return;
    try {
      if (file.size > 1024 * 1024) throw new Error('JSONファイルが大きすぎます。');
      const parsed = JSON.parse(await file.text());
      const next = JBSBrand.validate(parsed);
      if (dirty && !confirm('未保存の変更が失われます。JSONを取り込みますか？')) return;
      working = next;
      render();
      $('addButton').disabled = false;
      $('saveButton').disabled = false;
      markDirty();
      notify('JSONを取り込みました。まだ公開されていません。内容を確認し、「GitHubに保存」してください。');
    } catch (error) { notify(`JSONの取り込みに失敗しました：${error.message}`, true); }
    finally { $('importFile').value = ''; }
  }

  async function apiRequest(url, token, options = {}) {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(options.headers || {})
      }
    });
    if (!response.ok) {
      let detail = '';
      try { detail = (await response.json()).message || ''; } catch { /* Ignore non-JSON API failures. */ }
      throw new Error(`GitHub API HTTP ${response.status}${detail ? `: ${detail}` : ''}`);
    }
    return response.json();
  }

  async function saveToGithub(event) {
    event.preventDefault();
    if (busy) return;
    const tokenField = $('pat');
    const token = tokenField.value.trim();
    const message = $('dialogNotice');
    message.textContent = '';
    if (!token) { message.textContent = 'PATを入力してください。'; return; }
    let next;
    try { next = validateWorking(); }
    catch (error) { message.textContent = error.message; return; }

    busy = true;
    $('confirmSave').disabled = true;
    try {
      // Use conditional content checks to prevent silently overwriting edits
      // made from another browser or a direct GitHub commit.
      const existing = await apiRequest(API_URL, token, { cache: 'no-store' });
      if (!existing.sha || typeof existing.content !== 'string') throw new Error('GitHubの保存済みファイルを読み取れませんでした。');
      const remote = JSON.parse(decodeUtf8Base64(existing.content));
      if (baseline && canon(remote) !== canon(baseline)) {
        throw new Error('GitHub側の設定が編集中に変更されています。ページを再読み込みしてから編集してください。');
      }
      await apiRequest(API_URL, token, {
        method: 'PUT',
        body: JSON.stringify({
          message: `ブランド管理: 共通設定を更新 ${new Date().toISOString()}`,
          content: encodeUtf8Base64(JSON.stringify(next, null, 2) + '\n'),
          sha: existing.sha,
          branch: 'main'
        }),
        headers: { 'Content-Type': 'application/json' }
      });
      working = next;
      baseline = clone(next);
      render();
      setDirty(false);
      $('saveDialog').close();
      notify('GitHubへ保存しました。GitHub Pagesへの公開が完了すると、各ツールの次回読み込み時に新しい設定が使われます。');
    } catch (error) {
      message.textContent = `保存できませんでした：${error.message}`;
    } finally {
      tokenField.value = ''; // Never store PAT in localStorage or IndexedDB.
      busy = false;
      $('confirmSave').disabled = false;
    }
  }

  function bindEvents() {
    $('addButton').addEventListener('click', addTournament);
    $('exportButton').addEventListener('click', exportJson);
    $('importButton').addEventListener('click', () => $('importFile').click());
    $('importFile').addEventListener('change', event => importJson(event.target.files?.[0]));
    $('threshold').addEventListener('input', event => {
      working.contrast.threshold = event.target.value === '' ? '' : Number(event.target.value);
      markDirty(); updateSamples();
    });
    ['darkText', 'lightText'].forEach(key => {
      const field = $(`${key}Code`), picker = $(`${key}Picker`);
      makeColorGroup(picker, field, value => { working.contrast[key] = value; });
    });
    $('saveButton').addEventListener('click', () => {
      try { validateWorking(); }
      catch (error) { notify(error.message, true); return; }
      $('dialogNotice').textContent = '';
      $('saveDialog').showModal();
      $('pat').focus();
    });
    $('cancelSave').addEventListener('click', () => $('saveDialog').close());
    $('saveDialog').addEventListener('close', () => { $('pat').value = ''; });
    $('saveForm').addEventListener('submit', saveToGithub);
    addEventListener('beforeunload', event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } });
  }

  async function init() {
    bindEvents();
    try {
      baseline = await JBSBrand.load();
      working = clone(baseline);
      render();
      setDirty(false);
    } catch (error) {
      // Import remains usable even if offline or Pages are not yet configured.
      working = { schemaVersion: 1, tournaments: [], contrast: { threshold: 0.179, darkText: '#000000', lightText: '#FFFFFF' } };
      $('editStatus').textContent = '読み込みエラー';
      notify(`公開設定を取得できませんでした：${error.message}。サイトの公開後に再読み込みするか、JSONを取り込んでください。`, true);
      $('addButton').disabled = true;
      $('saveButton').disabled = true;
    }
  }
  init();
})();
