/** يُحقن في <head> قبل تحميل React: يسجّل عامل الخدمة ويلتقط عرض التثبيت مبكرًا حتى لا يفوت الزر. */
export const PWA_BOOT_SCRIPT = `
if ("serviceWorker" in navigator) addEventListener("load", function () { navigator.serviceWorker.register("/sw.js").catch(function () {}); });
addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); window.__khsInstall = e; dispatchEvent(new Event("khs-installable")); });
addEventListener("appinstalled", function () { window.__khsInstall = null; dispatchEvent(new Event("khs-installable")); });
`;
