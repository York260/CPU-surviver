import { exportReplay } from '@cpu/tools';
import type { DebugHandle } from '../session';

/**
 * 除錯面板（按 ` 鍵開關）。
 * 排查問題的主要工具：看事件流、看實體資料、單獨關掉某個系統、
 * 暫停／逐格／加速，以及「匯出重播」。
 */
export function mountDebugPanel(el: HTMLElement, handle: DebugHandle, localPlayerId: string): void {
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Backquote') {
      e.preventDefault();
      el.classList.toggle('open');
      if (el.classList.contains('open')) render();
    }
  });

  el.addEventListener('click', (ev) => {
    const t = ev.target as HTMLElement;
    const act = t.dataset.act;
    if (act === 'pause') handle.paused = !handle.paused;
    if (act === 'step') {
      handle.paused = true;
      handle.stepOnce();
    }
    if (act === 'speed') handle.speed = Number(t.dataset.v);
    if (act === 'export') download();
    // 只有按鈕才需要重畫。勾選框如果在 click 時被重畫，後面的 change 事件就送不出去了
    if (act) render();
  });
  el.addEventListener('change', (ev) => {
    const t = ev.target as HTMLInputElement;
    if (t.dataset.sys) {
      handle.sim.setSystemEnabled(t.dataset.sys, t.checked);
      render();
    }
  });

  /** 每個元件一行，比整份縮排的 JSON 好讀。 */
  function components(c: Record<string, unknown>): string {
    return Object.entries(c)
      .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
      .join('\n');
  }

  function download(): void {
    const replay = exportReplay(handle.sim, '從除錯面板匯出');
    const blob = new Blob([`${JSON.stringify(replay, null, 2)}\n`], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `replay-${replay.seed}-t${replay.ticks}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function render(): void {
    const sim = handle.sim;
    const me = sim.world.query('PlayerControl').find((e) => sim.world.get(e, 'PlayerControl')?.playerId === localPlayerId);
    const systems = sim
      .listSystems()
      .map((s) => `<label><input type="checkbox" data-sys="${s.name}" ${s.enabled ? 'checked' : ''}> ${s.name}</label>`)
      .join('');
    const events = sim
      .recentEvents(6)
      .map((e) => `t${e.tick} ${e.type} ${JSON.stringify(e.data)}`)
      .join('\n');
    el.innerHTML = `
      <h4>時間</h4>
      <div>Tick ${sim.tick}　種子 ${sim.seed}　實體 ${sim.world.entityCount()}</div>
      <div>
        <button data-act="pause">${handle.paused ? '繼續' : '暫停'}</button>
        <button data-act="step">逐格</button>
        <button data-act="speed" data-v="1">×1</button>
        <button data-act="speed" data-v="4">×4</button>
      </div>
      <h4>系統開關</h4>${systems}
      <h4>我的角色</h4><pre>${me === undefined ? '（尚未加入）' : components(sim.inspect(me))}</pre>
      <h4>最近事件</h4><pre>${events || '（沒有）'}</pre>
      <h4>狀態雜湊</h4><pre>${sim.hash()}</pre>
      <h4>重現問題</h4>
      <button data-act="export">匯出重播檔</button>`;
  }

  // 面板開著時，每半秒更新一次
  setInterval(() => {
    if (el.classList.contains('open') && !el.contains(document.activeElement)) render();
  }, 500);
}
