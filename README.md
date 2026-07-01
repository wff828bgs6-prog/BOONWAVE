# BOONWAVE Production Core

BOONWAVE — пространственный визуальный планировщик с карточками проектов, процессов, людей, идей, целей и системной карточкой «Я Есмь».

## Текущий статус

Проект находится в стадии production-oriented web core.

Уже реализованы:

- модульная архитектура;
- единая модель Node/Link;
- централизованное управление жестами;
- pan, drag, pinch, zoom и лёгкая инерция;
- блокировка положения карточек;
- панель управления справа, слева или снизу;
- IndexedDB-хранилище;
- миграции базы;
- транзакционное сохранение карточек, связей и медиа;
- unit/integration/regression tests;
- GitHub Actions quality gate;
- один канонический service worker.

Проект ещё не готов к публикации в App Store. Не завершены native SQLite, Capacitor/Xcode, backup/restore, archive/trash, undo/redo, browser E2E, privacy и release pipeline.

## Проверка

```bash
npm install --ignore-scripts --no-audit --no-fund
npm run check
```

`npm run check` выполняет:

1. проверку целостности репозитория и отсутствие устаревших артефактов;
2. проверку синтаксиса JavaScript;
3. полный набор автоматических тестов.

До добавления `package-lock.json` установка зависимостей не является полностью воспроизводимой. Lockfile должен быть добавлен до native/release-сборок.

## Главные документы

- `docs/BOONWAVE_PRODUCTION_AUDIT_2026-07-01_RU.md`
- `docs/BOONWAVE_ROADMAP_TO_APP_STORE_RU.md`
- `docs/BOONWAVE_HANDOFF_NEW_CHAT_RU.md`

## Ветки

- `main` — каноническая production-core основа;
- `archive/main-v8-before-core-634` — сохранённая старая BOONWAVE v8;
- рабочие изменения выполняются в отдельных ветках и проходят CI до переноса в `main`.

## Архитектурные правила

- web и iOS используют одну доменную и UI-логику;
- storage доступен только через адаптер;
- жесты добавляются через централизованные контроллеры;
- новые кнопки появляются только после реализации команды;
- старый несовместимый код удаляется, а не маскируется новым слоем;
- App Store readiness не заявляется до завершения native storage, privacy и Xcode QA.
