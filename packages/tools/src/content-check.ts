import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONTENT_FILES } from '@cpu/content/schema';
import { createTestMap, validateMap } from '@cpu/sim';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../content');
let failed = 0;

for (const [file, schema] of Object.entries(CONTENT_FILES)) {
  try {
    const result = schema.safeParse(JSON.parse(readFileSync(resolve(root, file), 'utf-8')));
    if (result.success) {
      console.log(`  ✔ ${file}`);
    } else {
      failed++;
      console.error(`  ✘ ${file}`);
      for (const issue of result.error.issues) console.error(`      ${issue.path.join('.') || '(根)'}：${issue.message}`);
    }
  } catch (err) {
    failed++;
    console.error(`  ✘ ${file}：${(err as Error).message}`);
  }
}

try {
  validateMap(createTestMap());
  console.log('  ✔ 測試地圖');
} catch (err) {
  failed++;
  console.error(`  ✘ 測試地圖：${(err as Error).message}`);
}

if (failed > 0) {
  console.error(`\n內容檢查失敗：${failed} 項有問題`);
  process.exit(1);
}
console.log('\n內容檢查通過');
