import { ArchiveController } from './controllers/archive-controller.js';
import { ArchiveWorkspaceFilter } from './controllers/archive-workspace-filter.js';

const el = (id) => document.getElementById(id);

let archiveFilter = null;

function initArchive() {
  if (!archiveFilter) archiveFilter = new ArchiveWorkspaceFilter({ root: document }).init();
  if (!el('archiveSelectedButton') || !el('archiveLibraryButton')) return;
  new ArchiveController({
    archiveButton: el('archiveSelectedButton'),
    openArchiveButton: el('archiveLibraryButton'),
    sheet: el('archiveSheet'),
    closeButton: el('closeArchiveButton'),
    list: el('archiveList'),
    empty: el('archiveEmpty'),
    hint: el('hint'),
  }).init();
}

initArchive();
