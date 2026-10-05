import Phaser from 'phaser';
import type { EntityView } from '@cpu/sim';
import { theme } from '@cpu/content';
import { MoveInput } from '../input';
import type { GameSession } from '../session';
import {
  DEFAULT_FLOOR,
  PLAYER_COLORS,
  WALL_COLOR,
  WALL_TOP,
  ZONE_FLOOR,
  shadowCanvas,
  studentCanvas,
} from '../sprites';

interface Actor {
  sprite: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
}

/**
 * 遊戲畫面。只讀取連線階段給的快照來繪圖，只送出輸入，
 * 不直接碰任何遊戲狀態。
 */
export class GameScene extends Phaser.Scene {
  private actors = new Map<number, Actor>();
  private input2!: MoveInput;
  private followed = false;

  constructor(private readonly session: GameSession) {
    super('game');
  }

  create(): void {
    PLAYER_COLORS.forEach((color, i) => this.textures.addCanvas(`student-${i}`, studentCanvas(color)));
    this.textures.addCanvas('shadow', shadowCanvas());
    this.drawMap();
    const { map } = this.session;
    this.cameras.main.setBounds(0, 0, map.width * map.tileSize, map.height * map.tileSize);
    this.cameras.main.setBackgroundColor('#0b0f17');
    this.input2 = new MoveInput((x, y) => this.session.sendMove(x, y));
  }

  override update(_time: number, delta: number): void {
    this.input2.poll();
    this.session.advance(delta);
    const { prev, curr, alpha } = this.session.frame();
    const before = new Map(prev.entities.map((e) => [e.id, e]));
    const seen = new Set<number>();

    for (const e of curr.entities) {
      seen.add(e.id);
      const p = before.get(e.id) ?? e;
      const x = Math.round(p.x + (e.x - p.x) * alpha);
      const y = Math.round(p.y + (e.y - p.y) * alpha);
      const actor = this.actors.get(e.id) ?? this.createActor(e);
      actor.sprite.setPosition(x, y + 6);
      actor.shadow.setPosition(x, y + 6);
      actor.label.setPosition(x, y - 12);
      actor.sprite.setDepth(y);
      actor.shadow.setDepth(y - 1);
      actor.label.setDepth(10000);
      if (e.playerId === this.session.localPlayerId && !this.followed) {
        this.cameras.main.startFollow(actor.sprite, true, 0.15, 0.15);
        this.cameras.main.roundPixels = true;
        this.followed = true;
      }
    }

    for (const [id, actor] of this.actors) {
      if (seen.has(id)) continue;
      actor.sprite.destroy();
      actor.shadow.destroy();
      actor.label.destroy();
      this.actors.delete(id);
    }
  }

  private createActor(e: EntityView): Actor {
    const color = e.id % PLAYER_COLORS.length;
    const sprite = this.add.image(e.x, e.y, `student-${color}`).setOrigin(0.5, 1);
    const shadow = this.add.image(e.x, e.y, 'shadow').setOrigin(0.5, 1);
    const label = this.makeText(e.x, e.y, e.name ?? '', { fontSize: '10px', color: '#ffffff', stroke: '#000000', strokeThickness: 2 }).setOrigin(0.5, 1);
    const actor = { sprite, shadow, label };
    this.actors.set(e.id, actor);
    return actor;
  }

  /**
   * 文字用平滑縮放。整個遊戲是像素風（最近鄰縮放），
   * 但文字如果也用最近鄰，縮小後會糊成一團，中文尤其嚴重。
   */
  private makeText(x: number, y: number, text: string, style: Phaser.Types.GameObjects.Text.TextStyle): Phaser.GameObjects.Text {
    const t = this.add.text(x, y, text, { fontFamily: '"Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif', ...style });
    t.setResolution(4);
    t.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
    return t;
  }

  /** 地圖是靜態的，只畫一次。 */
  private drawMap(): void {
    const { map } = this.session;
    const ts = map.tileSize;
    const g = this.add.graphics().setDepth(-1000);

    g.fillStyle(hex(DEFAULT_FLOOR), 1);
    g.fillRect(0, 0, map.width * ts, map.height * ts);
    for (const z of map.zones) {
      g.fillStyle(hex(ZONE_FLOOR[z.id] ?? DEFAULT_FLOOR), 1);
      g.fillRect(z.x * ts, z.y * ts, z.w * ts, z.h * ts);
    }
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        if (map.solid[y * map.width + x] !== 1) continue;
        g.fillStyle(hex(WALL_COLOR), 1);
        g.fillRect(x * ts, y * ts, ts, ts);
        g.fillStyle(hex(WALL_TOP), 1);
        g.fillRect(x * ts, y * ts, ts, 3);
      }
    }

    for (const z of map.zones) {
      const name = theme.zones[z.id] ?? z.id;
      this.makeText((z.x + z.w / 2) * ts, (z.y + z.h / 2) * ts, name, { fontSize: '11px', color: '#ffffff' })
        .setOrigin(0.5)
        .setAlpha(0.4)
        .setDepth(-999);
    }
  }
}

function hex(color: string): number {
  return Number.parseInt(color.slice(1), 16);
}
