const badge = document.querySelector('.preview-badge span');
if (badge) badge.textContent = 'Production Core · Modular Runtime';

import('./app.js').catch((error) => {
  console.error('BOONWAVE production entry failed:', error);
  const hint = document.getElementById('hint');
  if (hint) hint.textContent = 'Ошибка модульного запуска. Обновите страницу.';
});
