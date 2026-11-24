'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const data = { members: [
  { id: 'm', name: '水谷 晋', nameEn: 'MIZUTANI Sam', photo: 'images/m.png' },
  { id: 'o', name: '岡 美穂', nameEn: 'Miho Oka Macleod', photo: 'images/o.png' },
  { id: 'z', name: 'Zoe Baker', nameEn: 'Zoe Baker' },
  { id: 'a', name: 'Álvaro Cruz', nameEn: 'Álvaro Cruz' },
  { id: 'k', nameJa: 'きむら 一郎', nameEn: 'KIMURA Ichiro', photo: '../images/k.png' },
  { id: 'invalid', name: '' }
] };
let request;
const context = { window: {}, URL, AbortController, setTimeout, clearTimeout, fetch: async (url, options) => {
  request = { url, options };
  return { ok: true, json: async () => data };
} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../members.js'), 'utf8'), context);
(async () => {
  const api = context.window.JBSMembers;
  const members = await api.load({ cacheKey: 42 });
  assert.equal(request.url, 'https://jbsbackgammon.github.io/member/data/members.json?v=42');
  assert.equal(request.options.cache, 'no-store');
  assert.equal(Array.from(members, m => m.id).join(','), 'o,k,m,a,z');
  assert.equal(api.japaneseSurnameSortKey(members[0]), 'おか');
  assert.equal(api.japaneseSurnameSortKey(members[2]), 'みずたに');
  assert.equal(api.romajiToHiragana('YAMAGUCHI'), 'やまぐち');
  assert.equal(api.isLatinName('François Dupont'), true);
  assert.equal(api.isLatinName('柳 John'), false);
  assert.equal(api.photoUrl(members[1], { cacheKey: 42 }), 'https://jbsbackgammon.github.io/member/images/k.png?v=42');
  assert.equal(api.photoUrl(members[3]), '');
  assert.ok(api.photoUrl(members[3], { fallback: true }).includes('images/'));
  assert.throws(() => api.normalizeMembers({}), /会員一覧/);
  assert.equal(api.photoUrl({ photo: 'javascript:alert(1)' }), '');
  assert.equal(api.photoUrl({ photo: 'https://example.com/a.png' }), '');
  assert.equal(api.photoUrl({ photo: '../../private.png' }), '');
  console.log('Shared member loading, photo URLs and name ordering passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
