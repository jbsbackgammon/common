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
  let renderedCycleKey = null;

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
      const sample = row.querySelector('.sample-cell');
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
      entry[property] = input.value;
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

  // The UI always numbers rows 1..N. These order values are persisted to JSON.
  function renumber() {
    working.tournaments.forEach((entry, index) => { entry.order = index + 1; });
  }

  function moveTournament(from, to) {
    if (!Number.isInteger(from) || !Number.isInteger(to) || from === to
        || from < 0 || to < 0 || from >= working.tournaments.length || to >= working.tournaments.length) return false;
    const [entry] = working.tournaments.splice(from, 1);
    working.tournaments.splice(to, 0, entry);
    renumber();
    markDirty();
    renderRows();
    const target = $('tournamentRows').children[to]?.querySelector('.drag-handle');
    target?.focus({ preventScroll: true });
    return true;
  }

  let dragging = null;
  function clearDrag() {
    if (!dragging) return;
    const el = dragging.handle;
    try { if (el.hasPointerCapture(dragging.pointerId)) el.releasePointerCapture(dragging.pointerId); } catch { /* Released automatically. */ }
    $('tournamentRows').querySelectorAll('.dragging, .drop-target').forEach(el => el.classList.remove('dragging', 'drop-target'));
    dragging = null;
  }
  function bindDrag(handle, row, index) {
    handle.addEventListener('pointerdown', event => {
      if (event.button !== 0 || busy) return;
      event.preventDefault();
      handle.setPointerCapture(event.pointerId);
      dragging = { pointerId: event.pointerId, handle, from: index, to: index };
      row.classList.add('dragging');
    });
    handle.addEventListener('pointermove', event => {
      if (!dragging || dragging.pointerId !== event.pointerId || dragging.handle !== handle) return;
      const other = document.elementFromPoint(event.clientX, event.clientY)?.closest('#tournamentRows tr');
      const target = other ? Number(other.dataset.index) : dragging.to;
      if (!Number.isInteger(target) || target < 0 || target >= working.tournaments.length) return;
      dragging.to = target;
      $('tournamentRows').querySelectorAll('.drop-target').forEach(el => el.classList.remove('drop-target'));
      $('tournamentRows').children[target]?.classList.add('drop-target');
    });
    handle.addEventListener('pointerup', event => {
      if (!dragging || dragging.pointerId !== event.pointerId || dragging.handle !== handle) return;
      const {from, to} = dragging;
      clearDrag();
      moveTournament(from, to);
    });
    handle.addEventListener('pointercancel', clearDrag);
    handle.addEventListener('keydown', event => {
      if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
      event.preventDefault();
      moveTournament(index, index + (event.key === 'ArrowDown' ? 1 : -1));
    });
  }

  function cycleKey(date = new Date()) {
    const japan = new Date(date.getTime() + 9 * 60 * 60 * 1000);
    const year = japan.getUTCFullYear();
    const julyStarted = japan.getUTCMonth() >= 6;
    return `${year}-${julyStarted ? 'late' : 'early'}`;
  }

  function renderRows() {
    const now = new Date();
    renderedCycleKey = cycleKey(now);
    $('editionHeader').textContent = '回次等';
    const tbody = $('tournamentRows');
    tbody.replaceChildren();
    working.tournaments.forEach((entry, index) => {
      const row = document.createElement('tr');
      row.dataset.index = String(index);
      // The template contains no user-provided HTML; values are assigned via DOM properties.
      row.innerHTML = `
        <td class="order-cell"><button type="button" class="drag-handle" aria-label="${index + 1}番目：ドラッグして順番を変更。上下矢印キーでも移動できます" title="ドラッグで並び替え（↑↓キーも使用可能）"><span aria-hidden="true">⠿</span></button><span class="order-number">${index + 1}</span></td>
        <td><input class="name-input" type="text" maxlength="100" aria-label="大会名"></td>
        <td><input class="en-input" type="text" maxlength="150" aria-label="英語表記"></td>
        <td><input class="edition-input" type="text" maxlength="100" aria-label="回次等"></td>
        <td><select class="category-input" aria-label="分類"><option value="title">五大タイトル</option><option value="exchange">交流タイトル</option><option value="open">オープン</option><option value="other">その他</option></select></td>
        <td><div class="color-controls"><input class="color-picker" type="color" aria-label="メインカラーを選択"><input class="color-code" type="text" maxlength="7" spellcheck="false" aria-label="メインカラーコード"></div></td>
        <td><div class="color-controls"><input class="sub-color-picker" type="color" aria-label="サブカラーを選択"><input class="sub-color-code" type="text" maxlength="7" spellcheck="false" aria-label="サブカラーコード"></div></td>
        <td class="sample-cell"></td>
        <td class="delete-cell"><button type="button" class="mini-button delete-button" aria-label="大会を削除">削除</button></td>`;
      bindDrag(row.querySelector('.drag-handle'), row, index);
      bindTextInput(row, 'name-input', entry, 'name');
      bindTextInput(row, 'en-input', entry, 'nameEn');
      const editionInput = row.querySelector('.edition-input');
      editionInput.value = JBSBrand.editionForDate(entry, now);
      editionInput.addEventListener('input', () => {
        // Editing re-anchors the base at the current JST rollover season.
        entry.editionBase = editionInput.value;
        entry.editionBaseYear = JBSBrand.editionCycleYear(entry, new Date());
        markDirty();
      });
      const categorySelect = row.querySelector('.category-input');
      categorySelect.value = entry.category;
      categorySelect.addEventListener('change', () => { entry.category = categorySelect.value; markDirty(); });
      const code = row.querySelector('.color-code');
      code.value = entry.color;
      makeColorGroup(row.querySelector('.color-picker'), code, value => {
        entry.color = value;
        const normalized = color(value);
        if (normalized) {
          entry.subColor = JBSBrand.makeSubColor(normalized);
          row.querySelector('.sub-color-picker').value = entry.subColor;
          row.querySelector('.sub-color-code').value = entry.subColor;
        }
      });
      const subCode = row.querySelector('.sub-color-code');
      subCode.value = entry.subColor;
      makeColorGroup(row.querySelector('.sub-color-picker'), subCode, value => { entry.subColor = value; });
      row.querySelector('.delete-button').addEventListener('click', () => {
        if (working.tournaments.length === 1) { notify('大会をすべて削除することはできません。', true); return; }
        if (!confirm(`「${entry.name}」を削除しますか？ この大会IDを参照するツールにも影響します。`)) return;
        working.tournaments.splice(index, 1);
        renumber();
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
  // Update open tabs when the annual boundary (Jan 1 / July 1 JST) passes.
  function checkYear() {
    if (!working || cycleKey() === renderedCycleKey) return;
    renderRows();
  }

  function addTournament() {
    const ids = new Set(working.tournaments.map(e => e.id));
    let index = 1;
    while (ids.has(`custom-${index}`)) index++;
    working.tournaments.push({ id: `custom-${index}`, name: '', nameEn: '', editionBase: '', editionBaseYear: JBSBrand.editionCycleYear({ editionUpdateMonth: 1 }, new Date()), editionUpdateMonth: 1, editionUpdateDay: 1, category: 'other', color: '#3C3C3C', subColor: JBSBrand.makeSubColor('#3C3C3C'), order: working.tournaments.length + 1 });
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
      renumber();
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
      renumber();
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
    try { renumber(); next = validateWorking(); }
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
    window.addEventListener('focus', checkYear);
    // Check even when the management page stays open across midnight JST.
    window.setInterval(checkYear, 60 * 1000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) checkYear(); });
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
      try { renumber(); validateWorking(); }
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
      renumber();
      render();
      setDirty(canon(working) !== canon(baseline));
    } catch (error) {
      // Import remains usable even if offline or Pages are not yet configured.
      working = { schemaVersion: 1, tournaments: [], contrast: { threshold: 0.26, darkText: '#000000', lightText: '#FFFFFF' } };
      $('editStatus').textContent = '読み込みエラー';
      notify(`公開設定を取得できませんでした：${error.message}。サイトの公開後に再読み込みするか、JSONを取り込んでください。`, true);
      $('addButton').disabled = true;
      $('saveButton').disabled = true;
    }
  }
  init();
})();
