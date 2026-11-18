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
assert.equal(ui.version, 1);
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
[...timers.values()][0].fn();
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
[...timers.values()][0].fn();
assert.equal(button.textContent, "JSON保存");
assert.equal(button.disabled, true);
assert.equal(button.getAttribute("aria-live"), "off");
assert.ok(!classes.has("jbsui-button--complete"));
assert.throws(() => ui.showButtonFeedback(null), /requires a button/);
console.log("JBS shared UI button feedback tests passed.");
