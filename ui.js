/* Shared JBS UI interaction helpers. Pair with common/ui.css v50. */
(function (root) {
  "use strict";
  const feedbackByButton = new WeakMap();

  // Call only after the underlying operation has succeeded.
  function showButtonFeedback(button, { label = "保存完了", duration = 2000 } = {}) {
    if (!button?.classList || typeof button.textContent !== "string") {
      throw new TypeError("showButtonFeedback requires a button element");
    }
    const previous = feedbackByButton.get(button);
    if (previous) clearTimeout(previous.timer);
    const original = previous?.original || {
      text: button.textContent,
      disabled: Boolean(button.disabled),
      ariaLive: button.getAttribute("aria-live")
    };
    button.textContent = label;
    button.classList.add("jbsui-button--complete");
    button.disabled = true;
    button.setAttribute("aria-live", "polite");

    const timer = setTimeout(() => {
      if (feedbackByButton.get(button)?.timer !== timer) return;
      button.textContent = original.text;
      button.disabled = original.disabled;
      button.classList.remove("jbsui-button--complete");
      if (original.ariaLive === null) button.removeAttribute("aria-live");
      else button.setAttribute("aria-live", original.ariaLive);
      feedbackByButton.delete(button);
    }, Math.max(0, Number(duration) || 0));
    feedbackByButton.set(button, { original, timer });
  }

  root.JBSUI = Object.freeze({ version: 1, showButtonFeedback });
})(window);
