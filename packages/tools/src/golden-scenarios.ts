import { makeCommand, type Command, type CommandKind, type CommandTypes } from '@cpu/sim';
import type { ReplayInput } from './replay';

let seq = 0;
const c = <K extends CommandKind>(tick: number, playerId: string, kind: K, data: CommandTypes[K]): Command => ({
  ...makeCommand(playerId, seq++, kind, data),
  tick,
});

/**
 * 黃金重播的劇本。每個劇本都會產生一份 tests/replays/<名稱>.json。
 * 新增功能後，如果想把新行為也納入保護，就在這裡加一個劇本。
 */
export const GOLDEN_SCENARIOS: Record<string, Omit<ReplayInput, 'contentVersion'>> = {
  'i0-four-players-walk': {
    description: 'I0：四位玩家加入，往不同方向走，撞牆、換方向、中途離開一人',
    seed: 'golden-i0',
    ticks: 600,
    commands: [
      c(0, 'a', 'join', { name: '小明' }),
      c(0, 'b', 'join', { name: '小華' }),
      c(0, 'c', 'join', { name: '小美' }),
      c(0, 'd', 'join', { name: '小強' }),
      c(5, 'a', 'move', { x: 1, y: 0 }),
      c(5, 'b', 'move', { x: -1, y: 0 }),
      c(5, 'c', 'move', { x: 0, y: 1 }),
      c(5, 'd', 'move', { x: 0.7, y: -0.7 }),
      c(150, 'a', 'move', { x: 0, y: -1 }),
      c(150, 'b', 'move', { x: 1, y: 1 }),
      c(150, 'c', 'move', { x: 0, y: 0 }),
      c(300, 'd', 'leave', {}),
      c(300, 'a', 'move', { x: -1, y: 0.5 }),
      c(450, 'b', 'move', { x: 0, y: 0 }),
    ],
  },
};
