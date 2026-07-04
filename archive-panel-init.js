import { ArchiveController } from './controllers/archive-controller.js';

const el = (id) => document.getElementById(id);

function initArchive() {
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
