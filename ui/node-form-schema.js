export const NODE_FORM_SCHEMA = Object.freeze({
  project: [
    { key: 'status', label: 'Статус', type: 'select', required: true, options: [['preparation', 'Подготовка'], ['in_progress', 'В работе'], ['paused', 'На паузе'], ['completed', 'Завершено']] },
    { key: 'address', label: 'Адрес', type: 'text', maxlength: 120 },
  ],
  process: [
    { key: 'status', label: 'Статус', type: 'select', required: true, options: [['planned', 'Запланировано'], ['in_progress', 'В работе'], ['paused', 'На паузе'], ['completed', 'Завершено']] },
    { key: 'progress', label: 'Прогресс, %', type: 'number', min: 0, max: 100, step: 1, required: true },
  ],
  person: [
    { key: 'role', label: 'Роль', type: 'text', maxlength: 80 },
    { key: 'organization', label: 'Организация', type: 'text', maxlength: 100 },
  ],
  idea: [
    { key: 'status', label: 'Статус', type: 'select', required: true, options: [['draft', 'Черновик'], ['active', 'Активно'], ['completed', 'Реализовано']] },
    { key: 'category', label: 'Категория', type: 'text', maxlength: 80 },
  ],
  goal: [
    { key: 'status', label: 'Статус', type: 'select', required: true, options: [['active', 'Активно'], ['paused', 'На паузе'], ['completed', 'Достигнута']] },
    { key: 'progress', label: 'Прогресс, %', type: 'number', min: 0, max: 100, step: 1, required: true },
  ],
});

export function getNodeFormFields(type) {
  return NODE_FORM_SCHEMA[type] ?? [];
}
