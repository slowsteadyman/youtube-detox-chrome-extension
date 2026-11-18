const DEFAULTS = { home: true, related: true, endscreen: true, comments: true, center: true };
const switches = document.querySelectorAll(".switch");

chrome.storage.sync.get(DEFAULTS, (stored) => {
  const settings = { ...DEFAULTS, ...stored };
  switches.forEach((el) => {
    el.setAttribute("aria-checked", String(!!settings[el.dataset.key]));
  });
});

switches.forEach((el) => {
  el.addEventListener("click", () => {
    const next = el.getAttribute("aria-checked") !== "true";
    el.setAttribute("aria-checked", String(next));
    chrome.storage.sync.set({ [el.dataset.key]: next });
  });
});
