const badge = document.querySelector('.preview-badge span');
if (badge) badge.textContent = 'Production Core · Modular Runtime';

document.getElementById('editButton')?.remove();
document.querySelector('.zoom-row')?.classList.add('zoom-row-with-create');

if (!document.getElementById('utilityRail')) {
  const rail = document.createElement('aside');
  rail.id = 'utilityRail';
  rail.className = 'utility-rail';
  rail.dataset.side = 'right';
  rail.setAttribute('aria-label', 'Быстрые действия, справа');
  rail.innerHTML = `
    <button id="homeSelfButton" class="utility-button" type="button" aria-label="Вернуться к карточке Я Есмь">
      <svg class="bw-icon" viewBox="0 0 24 24"><circle cx="12" cy="8" r="3"/><path d="M6 19c.6-3.2 2.6-5 6-5s5.4 1.8 6 5"/><path d="M4 12a8 8 0 0 1 16 0"/></svg>
    </button>
    <span class="utility-divider" aria-hidden="true"></span>
    <button id="cardLockButton" class="utility-button" type="button" aria-label="Зафиксировать расположение карточек" aria-pressed="false">
      <svg class="bw-icon lock-closed" viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="10" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/><path d="M12 14v2"/></svg>
      <svg class="bw-icon lock-open" viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="10" rx="3"/><path d="M16 10V7a4 4 0 0 0-7.5-2"/><path d="M12 14v2"/></svg>
    </button>
  `;
  document.querySelector('.preview-shell')?.append(rail);

  const style = document.createElement('style');
  style.textContent = `
    .utility-rail{position:fixed;top:max(112px,calc(env(safe-area-inset-top) + 72px));right:12px;z-index:29;width:58px;padding:5px;border:1px solid var(--bw-border-medium);border-radius:29px;background:var(--bw-bg-control);box-shadow:var(--bw-shadow-control);backdrop-filter:blur(16px);display:grid;justify-items:center}.utility-rail[data-side="left"]{left:12px;right:auto}.utility-button{width:46px;height:46px;padding:0;border:1px solid transparent;border-radius:50%;background:transparent;display:grid;place-items:center}.utility-button[aria-pressed="true"]{border-color:rgba(var(--bw-brand-violet),.5);background:rgba(var(--bw-brand-violet),.16)}.utility-divider{width:28px;height:1px;background:var(--bw-border-soft)}#cardLockButton .lock-closed{display:none}#cardLockButton .lock-open{display:block}#cardLockButton[aria-pressed="true"] .lock-closed{display:block}#cardLockButton[aria-pressed="true"] .lock-open{display:none}
  `;
  document.head.append(style);
}

import('./app.js').catch((error) => {
  console.error('BOONWAVE production entry failed:', error);
  const hint = document.getElementById('hint');
  if (hint) hint.textContent = 'Ошибка модульного запуска. Обновите страницу.';
});
