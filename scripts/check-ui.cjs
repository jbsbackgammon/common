"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

let nextTimer = 0;
const timers = new Map();
const context = {
  window: {},
  setTimeout(fn, delay) { const id = ++nextTimer; timers.set(id, { fn, delay }); return id; },
  clearTimeout(id) { timers.delete(id); }
};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, "..", "ui.js"), "utf8"), context);
const ui = context.window.JBSUI;
function flushTimer() {
  const [id, { fn }] = timers.entries().next().value;
  timers.delete(id);
  fn();
}
assert.equal(ui.version, 2);
const classes = new Set(["jbsui-button"]);
const attrs = new Map();
const button = {
  textContent: "設定保存", disabled: false,
  classList: { add(value) { classes.add(value); }, remove(value) { classes.delete(value); } },
  getAttribute(name) { return attrs.has(name) ? attrs.get(name) : null; },
  setAttribute(name, value) { attrs.set(name, value); },
  removeAttribute(name) { attrs.delete(name); }
};
ui.showButtonFeedback(button);
assert.equal(button.textContent, "保存完了");
assert.equal(button.disabled, true);
assert.ok(classes.has("jbsui-button--complete"));
assert.equal(attrs.get("aria-live"), "polite");
assert.deepEqual([...timers.values()].map(({ delay }) => delay), [2000]);
ui.showButtonFeedback(button);
assert.equal(timers.size, 1, "Repeated calls must replace the pending timer");
assert.equal(button.textContent, "保存完了");
flushTimer();
assert.equal(button.textContent, "設定保存");
assert.equal(button.disabled, false);
assert.ok(!classes.has("jbsui-button--complete"));
assert.equal(attrs.has("aria-live"), false);

button.textContent = "JSON保存";
button.disabled = true;
button.setAttribute("aria-live", "off");
ui.showButtonFeedback(button, { label: "登録完了", duration: 1500 });
assert.equal(button.textContent, "登録完了");
assert.equal([...timers.values()][0].delay, 1500);
flushTimer();
assert.equal(button.textContent, "JSON保存");
assert.equal(button.disabled, true);
assert.equal(button.getAttribute("aria-live"), "off");
assert.ok(!classes.has("jbsui-button--complete"));
assert.throws(() => ui.showButtonFeedback(null), /requires a button/);
console.log("JBS shared UI button feedback tests passed.");

let changeHandler;
let finishPhoto;
let calls = 0;
const selected = { dataset: { nameEn: "Test Player" } };
const select = {
  value: "player1",
  selectedOptions: [selected],
  addEventListener(type, handler) {
    assert.equal(type, "change");
    changeHandler = handler;
  }
};
ui.bindPresetSelect(select, async (value, option) => {
  assert.equal(select.value, "", "Reset must precede async photo loading");
  assert.equal(value, "player1");
  assert.equal(option, selected);
  calls++;
  await new Promise(resolve => { finishPhoto = resolve; });
});
const photoPending = changeHandler();
assert.equal(select.value, "");
assert.equal(calls, 1);
changeHandler();
assert.equal(calls, 1, "Empty selection must not trigger a callback");
finishPhoto();
photoPending.then(() => console.log("JBS shared preset reset tests passed."))
  .catch(error => { console.error(error); process.exitCode = 1; });

const css = fs.readFileSync(path.join(__dirname, "..", "ui.css"), "utf8");
assert.match(css, /body\.jbsui,\s*\.jbsui\.jbsui-tool-page,\s*\.jbsui\.jbsui-reference-page\s*\{\s*background:\s*var\(--color-100\)/);
assert.match(css, /\.jbsui \.jbsui-preview\s*\{[^}]*background:\s*var\(--color-95\)/);
assert.doesNotMatch(css, /\.jbsui\.jbsui-(?:tool|reference)-page\s*\{[^}]*background:\s*var\(--color-95\)/);
console.log("Shared white page / gray preview background checks passed.");

assert.match(fs.readFileSync(path.join(__dirname, "..", "ui.css"), "utf8"), /\.jbsui \.jbsui-reference-table thead th\s*\{\s*text-align:\s*center;/);

const referenceSectionRule = fs.readFileSync(path.join(__dirname, "..", "ui.css"), "utf8").match(/\.jbsui \.jbsui-reference-card\s*\{([^}]+)\}/);
assert.ok(referenceSectionRule);
assert.doesNotMatch(referenceSectionRule[1], /\bborder(?:-radius)?:/);
