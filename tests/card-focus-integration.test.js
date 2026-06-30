import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const read = (path) => readFileSync(join(ROOT, path), 'utf8');

test('workspace owns one focus controller and exposes both gestures', () => {
  const workspace = read('controllers/workspace-controller.js');
  assert.match(workspace, /CardFocusController/);
  assert.match(workspace, /onLongPress/);
  assert.match(workspace, /onDoubleTap/);
  assert.match(workspace, /focusController\?\.destroy\(\)/);
});

test('focus mode includes accessible close fullscreen and reduced motion behavior', () => {
  const controller = read('controllers/card-focus-controller.js');
  assert.match(controller, /aria-modal="true"/);
  assert.match(controller, /card-focus-backdrop/);
  assert.match(controller, /enterFullscreen/);
  assert.match(controller, /prefers-reduced-motion/);
  assert.match(controller, /appShell\.inert/);
});

test('link mode suppresses focus gestures', () => {
  const bootstrap = read('bootstrap/boonwave-bootstrap.js');
  assert.match(bootstrap, /setLinkModeProvider/);
  assert.match(bootstrap, /linkController\.isActive\(\)/);
});
