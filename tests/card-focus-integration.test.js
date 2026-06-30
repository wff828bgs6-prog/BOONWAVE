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
  assert.match(controller, /onKeyDown/);
  assert.match(controller, /focusin/);
});

test('focus mode avoids the unstable iOS inert implementation', () => {
  const controller = read('controllers/card-focus-controller.js');
  assert.doesNotMatch(controller, /\.inert\s*=|setAttribute\('inert'|removeAttribute\('inert'/);
  assert.match(controller, /card-focus-active/);
  assert.match(controller, /pointer-events:none/);
  assert.match(
    controller,
    /close\(\{ immediate = false \} = \{\}\) \{[\s\S]*?this\.unlockApplication\(\);[\s\S]*?if \(!this\.isOpen\(\)\) return;/,
  );
  assert.match(controller, /destroy\(\) \{[\s\S]*?this\.unlockApplication\(\)/);
});

test('long press releases pointer capture before opening the overlay', () => {
  const controller = read('canvas/card-controller.js');
  assert.match(controller, /lostpointercapture/);
  assert.match(controller, /resetInteraction\(\)/);
  assert.match(
    controller,
    /this\.resetInteraction\(\);[\s\S]*?this\.onLongPress\(currentCard, sourceElement\)/,
  );
});

test('focus lift uses a smoother low-cost animation', () => {
  const controller = read('controllers/card-focus-controller.js');
  assert.match(controller, /const TRANSITION_MS = 300/);
  assert.match(controller, /blur\(5px\)/);
  assert.match(controller, /cubic-bezier\(\.16,1,\.3,1\)/);
});

test('link mode suppresses focus gestures', () => {
  const bootstrap = read('bootstrap/boonwave-bootstrap.js');
  assert.match(bootstrap, /setLinkModeProvider/);
  assert.match(bootstrap, /linkController\.isActive\(\)/);
});
