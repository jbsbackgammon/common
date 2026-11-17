'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.resolve(__dirname, '../naming.js'), 'utf8'), context);
const naming = context.window.JBSNaming;
assert.equal(naming.version, 1);
const values = {
  edition: 'JBS 第15回', title: '新鋭戦', round: '決勝',
  topName: 'Benjamin Friesen', bottomName: 'Jay Bidal'
};
assert.equal(naming.formatEventName(values),
  'JBS 第15回_新鋭戦_決勝_Benjamin Friesen-Jay Bidal');
assert.equal(naming.makeFileName({ prefix: '配信盤面', ...values }),
  '配信盤面_JBS 第15回_新鋭戦_決勝_Benjamin Friesen-Jay Bidal.json');
const savedAt = new Date(2026, 10, 17, 14, 49, 0);
assert.equal(naming.formatSavedLabel({ savedAt, ...values }),
  '2026-11-17 14:49:00・JBS 第15回_新鋭戦_決勝_Benjamin Friesen-Jay Bidal');
assert.equal(naming.formatSavedLabel({ ...values, topName: '', bottomName: '' }),
  'JBS 第15回_新鋭戦_決勝');
assert.equal(naming.makeFileName({ prefix: '配信盤面', title: '新鋭戦', round: '決勝' }),
  '配信盤面_新鋭戦_決勝.json');
assert.equal(naming.makeFileName({
  prefix: '配信盤面', title: '関東/関西:決勝', topName: 'A*B', bottomName: 'C?D'
}), '配信盤面_関東-関西-決勝_A-B-C-D.json');
assert.equal(naming.makeFileName({ prefix: 'トーナメント', extension: 'png', ...values }),
  'トーナメント_JBS 第15回_新鋭戦_決勝_Benjamin Friesen-Jay Bidal.png');
assert.equal(naming.formatSavedAt('bad date'), '');
console.log('JBS common naming tests passed.');
