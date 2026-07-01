# BOONWAVE — пакет передачи в новый чат GPT

Дата: 2026-07-01

## Основная инструкция новому чату

Продолжай разработку BOONWAVE как production-проекта. Не возвращайся к старым монолитным PWA v6–v8 и не создавай отдельную несовместимую iOS-версию. Сохраняй одну доменную и UI-логику для web и будущего Capacitor/iOS.

Перед любым существенным изменением:

1. дай короткую профессиональную оценку пользы, риска и соответствия конечной цели;
2. проверь влияние на UX, iOS Safari, accessibility, storage, миграции и App Store;
3. не маскируй старую реализацию новым слоем — удаляй или мигрируй несовместимое;
4. после изменения запускай полный CI;
5. не утверждай готовность на iPhone без проверки пользователя на устройстве.

## Репозиторий

- GitHub: `wff828bgs6-prog/BOONWAVE`
- основная ветка: `main`
- архив старой v8: `archive/main-v8-before-core-634`
- production-аудит выполняется в: `codex/production-audit-appstore`
- подтверждённая пользователем база перед аудитом: `72d99163e836ae7015a7c8e3ba21c9c7267c07a4`

## Конечная цель

Не очередной PWA-прототип, а production-проект, который можно передать сильному разработчику для завершения native-слоя и публикации без повторной пересборки архитектуры.

Обязательная основа:

- единая доменная модель Node/Link;
- единый контроллер карточек;
- централизованная gesture state machine;
- IndexedDB для web и SQLite для iOS через один StorageAdapter contract;
- миграции;
- резервные копии;
- файловое хранение медиа;
- функциональный реестр;
- тесты;
- Capacitor/Xcode;
- CI;
- privacy и App Store preparation.

## Подтверждённое пользовательское управление

- одиночный тап без заметного движения открывает карточку;
- движение карточки возможно, когда замок открыт;
- при закрытом замке движение с карточки панорамирует весь рабочий стол;
- pinch изменяет масштаб;
- панорамирование имеет лёгкую инерцию;
- удержание не открывает редактирование;
- редактирование доступно внутри открытой карточки;
- активная карточка остаётся выбранной до выбора другой;
- режим связи переопределяет обычный тап;
- панель может быть справа, слева или снизу;
- пользователь подтвердил отсутствие iOS-selection артефактов и стабильную работу жестов.

Не менять эту модель без отдельного продуктового решения и регрессионной проверки.

## Текущая архитектура

- `app.js` — точка входа;
- `bootstrap/` — сборка runtime;
- `domain/` — Node/Link schemas and normalization;
- `state/` — единый store;
- `canvas/` — camera, gestures, card movement, links;
- `controllers/` — workspace, detail, display, rail, link and node flows;
- `services/` — node/media/workspace/self/summary operations;
- `storage/` — StorageAdapter, IndexedDB, migrations;
- `styles/` — tokens, shell, card views, rail;
- `tests/` — Node-based unit/integration/source-regression checks;
- `.github/workflows/core-quality.yml` — quality gate.

## Сильные стороны

- модульность;
- централизованные жесты;
- transactional IndexedDB;
- migration versioning;
- media ownership cleanup;
- проверенная iPhone interaction model;
- CI;
- отдельная архивная ветка старого приложения.

## Незавершённые блоки

- функциональный реестр;
- полноценное содержимое всех карточных типов;
- archive/trash/restore/permanent delete;
- undo/redo command history;
- backup/restore UX;
- browser E2E/WebKit;
- native SQLite;
- Capacitor/iOS project;
- privacy and App Store metadata;
- TestFlight and release pipeline.

## Критические запреты

- не писать SQLite-вызовы напрямую из UI-контроллеров;
- не создавать отдельную доменную модель для iOS;
- не добавлять кнопку без реализованной команды;
- не использовать несколько service workers;
- не возвращать double-tap или long-press edit без отдельного решения;
- не применять глобальный `user-select:none` к формам и полной карточке;
- не финализировать дизайн карточки до утверждения её информационной структуры;
- не объявлять проект App Store-ready до native storage, privacy и Xcode QA.

## Текущий рекомендуемый следующий шаг

Создать функциональный реестр и формальную модель жизненного цикла карточки:

`active → archived → trashed → restored/permanently deleted`

Одновременно определить command history для undo/redo и формат backup bundle. Только после этого реализовывать UI-кнопки архива, корзины и истории действий.

## Документы, которые нужно прочитать

1. `docs/BOONWAVE_PRODUCTION_AUDIT_2026-07-01_RU.md`
2. `docs/BOONWAVE_ROADMAP_TO_APP_STORE_RU.md`
3. `docs/BOONWAVE_HANDOFF_NEW_CHAT_RU.md`
4. `README.md`

## Формат ответа пользователю

Русский язык, тепло и прямо. Перед внедрением — короткая оценка. Пользователь обычно подтверждает действие символом `+`. После реализации — краткий отчёт, фиксированный commit preview и честное указание, что ещё требует проверки на iPhone.
