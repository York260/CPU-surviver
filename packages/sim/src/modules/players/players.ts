import type { GameModule } from '../../core/simulation';
import type { System } from '../../core/system';
import type { EntityId } from '../../core/types';
import '../common';
import { sanitizeIntent } from '../m02-movement';

export interface PlayerControl {
  playerId: string;
  name: string;
}

export interface PlayerConfig {
  /** 移動速度（像素／秒）。 */
  speed: number;
  /** 碰撞箱半邊長（像素）。 */
  half: number;
}

declare module '../../core/registry' {
  interface ComponentTypes {
    PlayerControl: PlayerControl;
  }
  interface CommandTypes {
    join: { name: string };
    move: { x: number; y: number };
    leave: Record<string, never>;
  }
  interface EventTypes {
    PlayerJoined: { playerId: string; entity: EntityId; name: string };
    PlayerLeft: { playerId: string; entity: EntityId };
  }
}

/** 名字最長 16 個字，去掉頭尾空白；空的就用預設名。 */
export function sanitizeName(name: unknown): string {
  const s = typeof name === 'string' ? name.trim().slice(0, 16) : '';
  return s || '無名的學生';
}

export function createPlayersSystem(config: PlayerConfig): System {
  return {
    name: 'players',
    structural: true,
    commands: ['join', 'move', 'leave'],
    reads: [],
    writes: ['PlayerControl', 'Position', 'MoveIntent', 'Speed', 'Collider', 'Faction', 'Traits', 'Renderable'],
    resources: ['map'],
    emits: ['PlayerJoined', 'PlayerLeft'],
    run(ctx) {
      const controls = ctx.write('PlayerControl');
      const findPlayer = (playerId: string): EntityId | undefined =>
        ctx.query('PlayerControl').find((e) => controls.get(e)!.playerId === playerId);

      for (const cmd of ctx.commands('join')) {
        if (findPlayer(cmd.playerId) !== undefined) continue;
        const map = ctx.resource('map');
        const index = ctx.query('PlayerControl').length;
        const spawn = map.spawns[index % map.spawns.length]!;
        const e = ctx.spawn();
        const name = sanitizeName(cmd.data.name);
        controls.set(e, { playerId: cmd.playerId, name });
        ctx.write('Position').set(e, { x: spawn.x, y: spawn.y });
        ctx.write('MoveIntent').set(e, { x: 0, y: 0 });
        ctx.write('Speed').set(e, { value: config.speed });
        ctx.write('Collider').set(e, { half: config.half });
        ctx.write('Faction').set(e, { side: 'human' });
        ctx.write('Traits').set(e, { tags: ['hands'] });
        ctx.write('Renderable').set(e, { sprite: 'student' });
        ctx.emit('PlayerJoined', { playerId: cmd.playerId, entity: e, name });
      }

      for (const cmd of ctx.commands('move')) {
        const e = findPlayer(cmd.playerId);
        if (e === undefined) continue;
        ctx.write('MoveIntent').set(e, sanitizeIntent(cmd.data.x, cmd.data.y));
      }

      for (const cmd of ctx.commands('leave')) {
        const e = findPlayer(cmd.playerId);
        if (e === undefined) continue;
        ctx.destroy(e);
        ctx.emit('PlayerLeft', { playerId: cmd.playerId, entity: e });
      }
    },
  };
}

export function playersModule(config: PlayerConfig): GameModule {
  return { id: 'players', systems: [createPlayersSystem(config)] };
}
