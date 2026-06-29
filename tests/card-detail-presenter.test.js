import test from 'node:test';
import assert from 'node:assert/strict';

import { formatCardDetails, getCardDetailLines } from '../ui/card-detail-presenter.js';

test('process details use readable labels and hide technical empty values', () => {
  const text = formatCardDetails({
    type: 'process',
    data: {
      status: 'in_progress',
      priority: 'medium',
      progress: 62,
      tasks: [],
      attachments: [],
      notes: '',
    },
  });

  assert.match(text, /Статус: В работе/);
  assert.match(text, /Приоритет: Средний/);
  assert.match(text, /Прогресс: 62%/);
  assert.doesNotMatch(text, /in_progress|medium|tasks|\[\]/);
});

test('project details format dates and nested contact data', () => {
  const lines = getCardDetailLines({
    type: 'project',
    data: {
      status: 'preparation',
      contractDate: '2026-06-29',
      budget: 125000,
      primaryContact: {
        name: 'Анна',
        phone: '+7 900 000-00-00',
        email: 'anna@example.com',
      },
      images: ['one', 'two'],
    },
  });

  assert.ok(lines.includes('Дата договора: 29.06.2026'));
  assert.ok(lines.some((line) => line.startsWith('Бюджет: 125')));
  assert.ok(lines.includes('Основной контакт: Анна'));
  assert.ok(lines.includes('Изображения: 2 файлов'));
});

test('empty unknown card produces no debug output', () => {
  assert.equal(formatCardDetails({ type: 'unknown', data: { raw: [] } }), '');
});
