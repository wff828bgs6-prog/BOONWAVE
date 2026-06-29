const badge = document.querySelector('.preview-badge span');
if (badge) badge.textContent = 'Production Core · Modular Runtime';

const fallback = document.createElement('a');
fallback.id = 'legacyFallback';
fallback.href = './legacy-v8.html';
fallback.textContent = 'Открыть Legacy v8';
fallback.hidden = true;
fallback.style.cssText = 'position:fixed;top:max(68px,calc(env(safe-area-inset-top) + 58px));left:14px;z-index:100;padding:10px 12px;border:1px solid rgba(143,151,184,.35);border-radius:14px;background:rgba(18,22,40,.94);color:white;text-decoration:none;font:12px -apple-system,BlinkMacSystemFont,sans-serif';
document.body.append(fallback);

import('./app.js').catch((error) => {
  console.error('BOONWAVE production entry failed:', error);
  fallback.hidden = false;
  const hint = document.getElementById('hint');
  if (hint) hint.textContent = 'Ошибка модульного запуска. Доступна Legacy v8.';
});
