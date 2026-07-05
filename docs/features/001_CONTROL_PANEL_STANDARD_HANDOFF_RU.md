# CONTROL PANEL STANDARD HANDOFF

Дата фиксации: 2026-07-05  
Фрагмент: Control Panel Standard  
Ветка: `codex/control-panel-standard`  
PR: `#4`  
Статус: фрагмент панели управления описан и отделён как самостоятельная рабочая область; PR #4 пока не считать чистым merge-кандидатом, потому что в нём смешаны панель, архив, логотип/brand header, service worker и debug-страница.

---

## 1. Что считается панелью управления

К фрагменту Control Panel Standard относится только:

- основной rail/panel управления одной рукой;
- положения панели: справа, слева, снизу;
- порядок кнопок панели;
- визуальный стиль панели и иконок;
- ползунок масштаба;
- lock-кнопка;
- кнопка добавления карточки;
- кнопка главного обзора;
- кнопка контактов как вход в отдельный раздел;
- кнопка дополнительных действий;
- microinteractions панели;
- haptic/press feedback;
- сохранение позиции панели;
- отсутствие конфликтов с pan / drag / pinch / lock.

---

## 2. Что НЕ входит в этот фрагмент

Следующее не должно мержиться как часть чистой панели управления:

- модель Archive / Trash / Restore;
- `archive-panel-init.js`;
- `controllers/archive-controller.js`;
- `controllers/archive-workspace-filter.js`;
- `services/archive-service.js`;
- `docs/BOONWAVE_ARCHIVE_MODEL_RU.md` как реализационный scope;
- brand header / logo integration;
- `styles/brand-control-bar.css`;
- PNG/SVG логотипы и brand assets;
- `debug-logo.html`;
- cache-busting, связанный только с логотипом;
- изменения `sw.js`, добавляющие brand/logo assets;
- Permanent Delete;
- Undo/Redo command history;
- изменение доменной модели карточек вне нужд панели.

Эти части должны быть вынесены в отдельные фрагменты:

1. `codex/header-logo-integration`
2. `codex/archive-trash`
3. `codex/command-history`
4. `codex/service-worker-cache-cleanup`, если потребуется отдельно

---

## 3. Текущее состояние PR #4

В PR #4 присутствует полезная работа по панели, но PR смешан с соседними задачами.

Полезное для панели:

- обновление `styles/one-hand-rail-v3.css`;
- новый `controllers/panel-feedback-controller.js`;
- новый `styles/control-panel-microinteractions.css`;
- улучшения `controllers/utility-rail-controller.js`;
- улучшения `controllers/zoom-controller.js`;
- переход home-кнопки к главному обзору через `focusHomeOverview()`;
- описание панели в `docs/BOONWAVE_CONTROL_PANEL_SPEC_RU.md`.

Смешанное и требующее выноса:

- архивные контроллеры и сервисы;
- archive-sheet разметка и стили;
- logo/header assets;
- `debug-logo.html`;
- изменения service worker под logo assets;
- документы визуальной системы, если они описывают не только панель.

---

## 4. Чистые границы будущего merge

Чтобы панель была зафиксирована как чистый фрагмент, финальный PR панели должен менять только файлы, относящиеся к панели:

- `index.html` — только разметка rail/tools без архива и нового header/logo;
- `app.js` — только подключение panel feedback, без archive init;
- `bootstrap/boonwave-bootstrap.js` — только корректная home-команда панели;
- `controllers/utility-rail-controller.js`;
- `controllers/zoom-controller.js`;
- `controllers/workspace-controller.js` — только `focusHomeOverview()`;
- `controllers/panel-feedback-controller.js`;
- `styles/one-hand-rail-v3.css`;
- `styles/control-panel-microinteractions.css`;
- `docs/BOONWAVE_CONTROL_PANEL_SPEC_RU.md`;
- `docs/features/001_CONTROL_PANEL_STANDARD_HANDOFF_RU.md`.

Если в финальном PR есть archive/logo/debug/cache-файлы, такой PR нельзя считать чистой фиксацией панели.

---

## 5. Правила панели после фиксации

Панель одна. Старые реализации не должны оставаться скрытыми через CSS.

Запрещено:

- держать старую панель через `display:none`;
- иметь две разные кнопки `contactsButton`;
- иметь одновременно `utility-button` и `rail-button` как конкурирующие реализации;
- добавлять кнопку без команды;
- менять смысл home-кнопки обратно на карточку «Я Есмь»;
- смешивать Archive/Trash с визуальным стандартом панели;
- добавлять логотип как часть панели без отдельного фрагмента header/logo.

---

## 6. Проверки перед финальным merge панели

Ручная проверка на iPhone:

- панель справа;
- панель слева;
- панель снизу;
- переключение позиции без рывка;
- zoom-slider работает вертикально и горизонтально;
- pinch zoom не конфликтует с rail zoom;
- pan canvas работает;
- drag card работает, когда lock выключен;
- при включённом lock карточки не двигаются случайно;
- кнопка add открывает создание карточки;
- кнопка contacts открывает контакты;
- кнопка more открывает дополнительные действия;
- кнопка home возвращает к главному обзору;
- touch target удобен большим пальцем;
- старой панели визуально нет;
- нет белого фона/артефактов от логотипа.

Автоматическая/техническая проверка:

- нет второго service worker;
- нет скрытого legacy UI-layer;
- нет debug-страницы в финальном panel PR;
- нет неиспользуемых imports;
- нет broken links в `index.html`;
- `sw.js` не содержит assets, не относящиеся к панели;
- `npm test` / quality gate проходят, если окружение доступно.

---

## 7. Решение по текущему PR #4

PR #4 нельзя мержить в `main` как чистую панель управления в текущем виде.

Правильное действие:

1. оставить PR #4 как рабочую ветку-источник;
2. не считать его финальным;
3. выделить из него чистый PR панели;
4. отдельно вынести archive;
5. отдельно вынести header/logo;
6. удалить `debug-logo.html` из финального runtime scope;
7. после чистого PR панели провести визуальную проверку пользователем на iPhone;
8. только после подтверждения мержить.

---

## 8. Следующий безопасный шаг

Создать новую ветку от текущего `main`:

`codex/control-panel-fragment-clean`

В неё перенести только panel-scope изменения из PR #4, без archive, logo, debug и лишних cache-правок.

После этого открыть новый Draft PR:

`Draft: control panel standard clean fragment`

Только этот PR может стать чистой фиксацией панели управления.
