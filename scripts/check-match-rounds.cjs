'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'data/brand.json'), 'utf8'));
const context = { window: {}, URL, document: { currentScript: { src: 'https://example.com/common/brand.js' } },
  fetch: async () => ({ ok: true, json: async () => JSON.parse(JSON.stringify(data)) }) };
vm.runInNewContext(fs.readFileSync(path.join(root, 'brand.js'), 'utf8'), context);
(async () => {
  const api = context.window.JBSBrand;
  await api.load();
  const cases = [
    ['盤聖戦', 6, 'ROUND OF 64'], ['名人戦', 6, 'ROUND OF 64'],
    ['王位戦', 6, 'ROUND OF 64'], ['大阪オープン', 6, 'ROUND OF 64'],
    ['名古屋オープン', 6, 'ROUND OF 64'], ['賽王戦', 5, 'ROUND OF 32'],
    ['棋聖戦', 4, 'ROUND OF 16'], ['新鋭戦', 4, 'ROUND OF 16'],
    ['東京オープン', 4, 'ROUND OF 16'], ['女王戦', 3, null],
    ['日本選手権', 12, 'ROUND OF 16']
  ];
  for (const [title, count, firstRound] of cases) {
    const rounds = api.getMatchRounds(title);
    assert.equal(rounds.length, count, title);
    assert.equal(api.getMatchRoundEnglish(title, '１回戦'), firstRound, title);
    assert.equal(api.getMatchRoundEnglish(title, '1回戦'), firstRound, title);
    assert.equal(api.getMatchRoundEnglish(title, '準々決勝'), 'QUARTERFINAL');
    assert.equal(rounds[0].name, '決勝');
  }
  assert.equal(api.getMatchRoundEnglish('盤聖戦', '３回戦'), 'ROUND OF 16');
  assert.equal(api.getMatchRoundEnglish('賽王戦', '２回戦'), 'ROUND OF 16');
  assert.equal(api.getMatchRoundEnglish('日本選手権', 'リーグ８回戦'), 'ROUND 8');
  assert.equal(api.getMatchRoundEnglish('日本選手権', 'リーグ１回戦'), 'ROUND 1');
  assert.equal(api.getMatchRoundEnglish('盤聖戦', 'リーグ１回戦'), null);
  assert.equal(api.getMatchRoundEnglish('SAIO', '１回戦'), 'ROUND OF 32');
  assert.equal(api.getMatchFormats().length, 5);
  const copy = api.getMatchRounds('日本選手権');
  copy[0].name = 'changed';
  assert.equal(api.getMatchRounds('日本選手権')[0].name, '決勝');
  const legacy = JSON.parse(JSON.stringify(data));
  delete legacy.matchFormats;
  legacy.tournaments.forEach(t => delete t.matchFormat);
  assert.equal(api.validate(legacy).tournaments.length, 11);
  const invalid = JSON.parse(JSON.stringify(data));
  invalid.tournaments[0].matchFormat = 'unknown';
  assert.throws(() => api.validate(invalid), /試合形式/);
  console.log('All 11 tournament match-round mappings passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
