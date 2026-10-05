import Phaser from 'phaser';
import { theme } from '@cpu/content';
import { mountDebugPanel } from './debug/debugPanel';
import { GameScene } from './scenes/GameScene';
import { LocalSession } from './session';

const params = new URLSearchParams(location.search);
const seed = params.get('seed') ?? 'local-dev';
const name = params.get('name') ?? theme.ui.defaultPlayerName;

const session = new LocalSession({ seed, playerName: name });

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 480,
  height: 270,
  pixelArt: true,
  roundPixels: true,
  backgroundColor: '#0b0f17',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [new GameScene(session)],
});

document.title = theme.gameTitle;
const hud = document.getElementById('hud');
if (hud) hud.innerHTML = `<b>${theme.gameTitle}</b>　${theme.ui.subtitle}<br>${theme.ui.controls}`;

const debugEl = document.getElementById('debug');
if (debugEl) mountDebugPanel(debugEl, session, session.localPlayerId);

// 給自動化測試和除錯用的掛鉤（唯讀用途）
(window as unknown as { __cpu: unknown }).__cpu = { session, game };
