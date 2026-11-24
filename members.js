/* JBS shared member lookup, name sorting and photo URLs. */
(function (root) {
  'use strict';
  const baseUrl = 'https://jbsbackgammon.github.io/member/';
  const jaCollator = new Intl.Collator('ja', { sensitivity: 'base', numeric: true });
  const enCollator = new Intl.Collator('en', { sensitivity: 'base', numeric: true });

  function isLatinName(value) {
    const name = String(value || "");
    return /\p{Script=Latin}/u.test(name)
      && !/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(name);
  }

  function isForeignMember(member) {
    return isLatinName(member.nameJa);
  }

  function katakanaToHiragana(value) {
    return String(value || '').replace(/[\u30a1-\u30f6]/g, (character) =>
      String.fromCharCode(character.charCodeAt(0) - 0x60)
    );
  }

  const ROMAJI_TO_HIRAGANA = new Map(Object.entries({
    kya:'きゃ', kyu:'きゅ', kyo:'きょ', gya:'ぎゃ', gyu:'ぎゅ', gyo:'ぎょ',
    sha:'しゃ', shu:'しゅ', sho:'しょ', sya:'しゃ', syu:'しゅ', syo:'しょ',
    ja:'じゃ', ju:'じゅ', jo:'じょ', jya:'じゃ', jyu:'じゅ', jyo:'じょ',
    cha:'ちゃ', chu:'ちゅ', cho:'ちょ', cya:'ちゃ', cyu:'ちゅ', cyo:'ちょ',
    tya:'ちゃ', tyu:'ちゅ', tyo:'ちょ', nya:'にゃ', nyu:'にゅ', nyo:'にょ',
    hya:'ひゃ', hyu:'ひゅ', hyo:'ひょ', bya:'びゃ', byu:'びゅ', byo:'びょ',
    pya:'ぴゃ', pyu:'ぴゅ', pyo:'ぴょ', mya:'みゃ', myu:'みゅ', myo:'みょ',
    rya:'りゃ', ryu:'りゅ', ryo:'りょ', fa:'ふぁ', fi:'ふぃ', fe:'ふぇ', fo:'ふぉ',
    va:'ゔぁ', vi:'ゔぃ', vu:'ゔ', ve:'ゔぇ', vo:'ゔぉ', shi:'し', chi:'ち', tsu:'つ',
    si:'し', ti:'ち', tu:'つ', hu:'ふ', ji:'じ', zi:'じ',
    a:'あ', i:'い', u:'う', e:'え', o:'お', ka:'か', ki:'き', ku:'く', ke:'け', ko:'こ',
    ga:'が', gi:'ぎ', gu:'ぐ', ge:'げ', go:'ご', sa:'さ', su:'す', se:'せ', so:'そ',
    za:'ざ', zu:'ず', ze:'ぜ', zo:'ぞ', ta:'た', te:'て', to:'と', da:'だ', di:'ぢ',
    du:'づ', de:'で', do:'ど', na:'な', ni:'に', nu:'ぬ', ne:'ね', no:'の',
    ha:'は', hi:'ひ', fu:'ふ', he:'へ', ho:'ほ', ba:'ば', bi:'び', bu:'ぶ', be:'べ', bo:'ぼ',
    pa:'ぱ', pi:'ぴ', pu:'ぷ', pe:'ぺ', po:'ぽ', ma:'ま', mi:'み', mu:'む', me:'め', mo:'も',
    ya:'や', yu:'ゆ', yo:'よ', ra:'ら', ri:'り', ru:'る', re:'れ', ro:'ろ',
    wa:'わ', wi:'ゐ', we:'ゑ', wo:'を', n:'ん'
  }));

  function romajiToHiragana(value) {
    const source = String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[’']/g, "'").replace(/[^A-Za-z'-]/g, '').toLowerCase();
    if (!source) return '';
    let result = '';
    let index = 0;
    while (index < source.length) {
      if (source[index] === '-' || source[index] === "'") { index += 1; continue; }
      if (index > 0 && source[index] === 'h' && source[index - 1] === 'o') { index += 1; continue; }
      if (index + 1 < source.length && source[index] === source[index + 1]
        && /[bcdfghjklmpqrstvwxyz]/.test(source[index]) && source[index] !== 'n') {
        result += 'っ'; index += 1; continue;
      }
      if (source[index] === 'm' && index + 1 < source.length && /[bmp]/.test(source[index + 1])) {
        result += 'ん'; index += 1; continue;
      }
      if (source[index] === 'n' && (index === source.length - 1 || source[index + 1] === "'" || !/[aiueoy]/.test(source[index + 1]))) {
        result += 'ん'; index += 1; if (source[index] === "'") index += 1; continue;
      }
      let matched = false;
      for (const length of [3, 2, 1]) {
        const kana = ROMAJI_TO_HIRAGANA.get(source.slice(index, index + length));
        if (kana) { result += kana; index += length; matched = true; break; }
      }
      if (!matched) return '';
    }
    return result;
  }

  function japaneseSurnameSortKey(member) {
    const surnameJa = String(member.nameJa || '').trim().split(/\s+/)[0] || '';
    if (surnameJa && /^[\u3040-\u30ffー]+$/.test(surnameJa)) return katakanaToHiragana(surnameJa);
    const tokens = String(member.nameEn || '').trim().split(/\s+/)
      .map((token) => token.replace(/^[^A-Za-z]+|[^A-Za-z'-]+$/g, '')).filter(Boolean);
    const uppercaseSurname = tokens.find((token) => /[A-Z]/.test(token) && token === token.toUpperCase() && /^[A-Z'-]+$/.test(token));
    const japaneseLikeTokens = tokens.filter((token) => romajiToHiragana(token));
    const surnameRomaji = uppercaseSurname || japaneseLikeTokens.at(-1) || tokens[0] || '';
    return romajiToHiragana(surnameRomaji) || surnameRomaji.toLocaleLowerCase('en');
  }

  function foreignFirstNameSortKey(member) {
    return String(member.nameJa || '').trim().split(/\s+/)[0].toLocaleLowerCase('en');
  }

  function compareMembers(a, b) {
    const aForeign = isForeignMember(a), bForeign = isForeignMember(b);
    if (aForeign !== bForeign) return aForeign ? 1 : -1;
    if (!aForeign) {
      return jaCollator.compare(japaneseSurnameSortKey(a), japaneseSurnameSortKey(b))
        || enCollator.compare(a.nameEn, b.nameEn)
        || jaCollator.compare(a.nameJa, b.nameJa);
    }
    return enCollator.compare(foreignFirstNameSortKey(a), foreignFirstNameSortKey(b))
      || enCollator.compare(a.nameJa, b.nameJa);
  }

  function normalizeMembers(data) {
    const source = Array.isArray(data) ? data : data?.members;
    if (!Array.isArray(source)) throw new Error('会員一覧の形式が正しくありません。');
    return source.map((member, index) => ({
      id: String(member?.id || member?.filename || 'member-' + (index + 1)),
      nameJa: String(member?.name ?? member?.nameJa ?? '').trim(),
      nameEn: String(member?.nameEn ?? '').trim(),
      photo: String(member?.photo ?? '').trim()
    })).filter(member => member.nameJa).sort(compareMembers);
  }

  function photoUrl(member, { fallback = false, cacheKey = null } = {}) {
    const photo = String(member?.photo || '').trim();
    if (!photo && !(fallback && member?.nameJa && member?.nameEn)) return '';
    const path = photo || 'images/' + encodeURIComponent(member.nameJa + '_' + member.nameEn + '.png');
    let url;
    try { url = new URL(path.replace(/^\.\.\//, '').replace(/^\//, ''), baseUrl); }
    catch { return ''; }
    // The member master may only point to the same HTTPS member site.
    if (url.origin !== new URL(baseUrl).origin || !url.pathname.startsWith('/member/')) return '';
    if (cacheKey !== null) url.searchParams.set('v', String(cacheKey));
    return url.href;
  }

  async function load({ cacheKey = Date.now() } = {}) {
    const url = new URL('data/members.json', baseUrl);
    url.searchParams.set('v', String(cacheKey));
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(url.href, { cache: 'no-store', signal: controller.signal });
      if (!response.ok) throw new Error('会員一覧の取得に失敗しました (HTTP ' + response.status + ')');
      const result = normalizeMembers(await response.json());
      if (controller.signal.aborted) throw new Error('会員一覧の取得がタイムアウトしました。');
      return result;
    } finally { clearTimeout(timer); }
  }

  root.JBSMembers = Object.freeze({ version: 2, baseUrl, load, normalizeMembers, compareMembers,
    photoUrl, isLatinName, romajiToHiragana, japaneseSurnameSortKey });
})(window);
