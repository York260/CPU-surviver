/** 把鍵盤輸入整理成移動方向。只在方向改變時才通知，避免每個畫面都送一次指令。 */
export class MoveInput {
  private readonly down = new Set<string>();
  private lastX = 0;
  private lastY = 0;

  constructor(private readonly onChange: (x: number, y: number) => void) {
    window.addEventListener('keydown', (e) => {
      if (isTypingTarget(e.target)) return;
      if (MOVE_KEYS.has(e.code)) {
        e.preventDefault();
        this.down.add(e.code);
      }
    });
    window.addEventListener('keyup', (e) => this.down.delete(e.code));
    // 切到別的分頁時，放開所有按鍵，避免角色一直走
    window.addEventListener('blur', () => this.down.clear());
  }

  /** 每個畫面呼叫一次。 */
  poll(): void {
    const x = (this.has('KeyD', 'ArrowRight') ? 1 : 0) - (this.has('KeyA', 'ArrowLeft') ? 1 : 0);
    const y = (this.has('KeyS', 'ArrowDown') ? 1 : 0) - (this.has('KeyW', 'ArrowUp') ? 1 : 0);
    if (x !== this.lastX || y !== this.lastY) {
      this.lastX = x;
      this.lastY = y;
      this.onChange(x, y);
    }
  }

  private has(...codes: string[]): boolean {
    return codes.some((c) => this.down.has(c));
  }
}

const MOVE_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

function isTypingTarget(t: EventTarget | null): boolean {
  return t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement;
}
