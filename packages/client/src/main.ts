import Phaser from 'phaser';
import { theme } from '@cpu/content';
import { mountDebugPanel } from './debug/debugPanel';
import { GameScene } from './scenes/GameScene';
import { LocalSession } from './session';

const params = new URLSearchParams(location.search);
const seed = params.get('seed') ?? 'local-dev';
const name = params.get('name') ?? theme.ui.defaultPlayerName;

const session = new LocalSession({ seed, playerName: name });

/**
 * 畫布大小 = 螢幕的實際像素（視窗大小 × 螢幕縮放比例）。
 * 以前用 480×270 的小畫布再放大，文字會跟著糊掉；現在文字和圖都以實際解析度繪製。
 * 像素風靠「整數倍放大」維持：由 GameScene 依畫面大小挑一個整數的鏡頭縮放。
 */
const deviceSize = () => {
  const dpr = window.devicePixelRatio || 1;
  return { width: Math.max(1, Math.floor(window.innerWidth * dpr)), height: Math.max(1, Math.floor(window.innerHeight * dpr)) };
};

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  ...deviceSize(),
  pixelArt: true,
  roundPixels: true,
  backgroundColor: '#0b0f17',
  scale: { mode: Phaser.Scale.NONE },
  scene: [new GameScene(session)],
});

window.addEventListener('resize', () => {
  const { width, height } = deviceSize();
  game.scale.resize(width, height);
});

document.title = theme.gameTitle;
const hud = document.getElementById('hud');
if (hud) hud.innerHTML = `<b>${theme.gameTitle}</b>　${theme.ui.subtitle}<br>${theme.ui.controls}`;

const debugEl = document.getElementById('debug');
if (debugEl) mountDebugPanel(debugEl, session, session.localPlayerId);

// 給自動化測試和除錯用的掛鉤（唯讀用途）
(window as unknown as { __cpu: unknown }).__cpu = { session, game };
