import { initHandlers, initTabs, initTemplates } from "./handlers.js";
import { refreshAll } from "./render.js";
import { initState, saveData } from "./state.js";
import { initI18n } from "./i18n.js";
import { ui } from "./ui.js";

async function boot() {
  initI18n();
  await initState();
  await initVersionLabel();
  initTabs();
  initTemplates();
  initHandlers();
  refreshAll(saveData);
}

void boot();

async function initVersionLabel() {
  if (!ui.brandSub) return;
  let version = "1.0";
  try {
    const res = await fetch("version.md", { cache: "no-store" });
    if (res.ok) {
      const text = (await res.text()).trim();
      if (text) version = text;
    }
  } catch {
    // Ignore version fetch errors; fall back to default.
  }
  const host = window.location.hostname || "local";
  ui.brandSub.textContent = `${host} - v${version}`;
}
