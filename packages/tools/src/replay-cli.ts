import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GOLDEN_SCENARIOS } from './golden-scenarios';
import { REPLAY_FORMAT_VERSION, parseReplay, runReplay, type Replay } from './replay';

const dir = resolve(dirname(fileURLToPath(import.meta.url)), '../../../tests/replays');
const update = process.argv.includes('--update');
mkdirSync(dir, { recursive: true });

let failed = 0;
const build = (name: string): Replay => {
  const input = GOLDEN_SCENARIOS[name]!;
  return { formatVersion: REPLAY_FORMAT_VERSION, ...input, finalHash: runReplay(input).hash() };
};

if (update) {
  for (const name of Object.keys(GOLDEN_SCENARIOS)) {
    const file = resolve(dir, `${name}.json`);
    const old = existsSync(file) ? parseReplay(readFileSync(file, 'utf-8')).finalHash : '(新檔)';
    const next = build(name);
    writeFileSync(file, `${JSON.stringify(next, null, 2)}\n`);
    console.log(`  ${name}：${old} → ${next.finalHash}`);
  }
  console.log('\n黃金重播已更新。請在提交訊息裡說明為什麼結果改變了。');
} else {
  for (const name of Object.keys(GOLDEN_SCENARIOS)) {
    const file = resolve(dir, `${name}.json`);
    if (!existsSync(file)) {
      failed++;
      console.error(`  ✘ ${name}：缺少檔案，請執行 npm run replay:update`);
      continue;
    }
    const expected = parseReplay(readFileSync(file, 'utf-8')).finalHash;
    const actual = build(name).finalHash;
    if (expected === actual) console.log(`  ✔ ${name}`);
    else {
      failed++;
      console.error(`  ✘ ${name}：預期 ${expected}，實際 ${actual}`);
    }
  }
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
    if (!GOLDEN_SCENARIOS[f.replace(/\.json$/, '')]) console.log(`  ・${f} 不是由劇本產生的（手動匯出的重播檔），僅由測試驗證`);
  }
  if (failed) process.exit(1);
}
