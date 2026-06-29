export const NODE_TYPES = Object.freeze(['project', 'process', 'person', 'idea', 'goal']);

const DEFAULT_TITLES = Object.freeze({
  project: 'Новый проект',
  process: 'Новый процесс',
  person: 'Новый человек',
  idea: 'Новая идея',
  goal: 'Новая цель',
});

export function createNode({ type, title, description = '', x = 0, y = 0 } = {}) {
  if (!NODE_TYPES.includes(type)) {
    throw new TypeError(`Unsupported BOONWAVE node type: ${type}`);
  }

  const id = `${type}_${crypto.randomUUID?.() ?? `${Date.now()}_${Math.random().toString(16).slice(2)}`}`;
  const cleanTitle = String(title ?? '').trim() || DEFAULT_TITLES[type];

  return {
    id,
    type,
    title: cleanTitle,
    description: String(description ?? '').trim(),
    x: Math.round(Number(x) || 0),
    y: Math.round(Number(y) || 0),
    width: 230,
    height: 138,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
