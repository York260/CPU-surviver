import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * 分層鐵則（見 docs/04-architecture.md）：
 * 1. sim 是純邏輯：不能 import 其他套件、框架、Node 或瀏覽器 API，也不能用隨機數和現實時間。
 * 2. client、tools 只能從 '@cpu/sim' 的公開入口取用，不能伸手進它的內部檔案。
 * 3. 模組只能依賴更低層的模組，不能 import 其他模組的內部檔案（只能走 index）。
 */
export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', 'test-results/**', 'playwright-report/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/no-non-null-assertion': 'off',
      eqeqeq: 'error',
      'no-irregular-whitespace': ['error', { skipStrings: true, skipTemplates: true, skipComments: true }],
    },
  },
  {
    files: ['packages/sim/src/**/*.ts'],
    ignores: ['**/*.test.ts'],
    languageOptions: { globals: {} },
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['@cpu/client*', '@cpu/tools*', '@cpu/content*', '@cpu/server*'], message: 'sim 是純邏輯層，不能依賴其他套件。內容資料要由外面傳進來。' },
            { group: ['phaser', 'ws', 'vite', 'node:*'], message: 'sim 不能使用框架、網路或 Node API。' },
            { group: ['**/modules/*/*'], message: '要用別的模組，只能 import 它的 index（例如 "./modules/m01-map"），不能伸手進內部檔案。' },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'window', message: 'sim 不能使用瀏覽器 API。' },
        { name: 'document', message: 'sim 不能使用瀏覽器 API。' },
        { name: 'process', message: 'sim 不能使用 Node API。' },
        { name: 'setTimeout', message: 'sim 只認 Tick，不認現實時間。' },
        { name: 'setInterval', message: 'sim 只認 Tick，不認現實時間。' },
        { name: 'performance', message: 'sim 只認 Tick，不認現實時間。' },
      ],
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: '請改用命名亂數流：ctx.rng("名稱")，才能重現。' },
        { object: 'Date', property: 'now', message: 'sim 只認 Tick，不認現實時間。' },
      ],
      'no-restricted-syntax': [
        'error',
        { selector: "NewExpression[callee.name='Date']", message: 'sim 只認 Tick，不認現實時間。' },
        { selector: "CallExpression[callee.name='structuredClone']", message: '請用 core/hash 的 cloneData。' },
      ],
    },
  },
  {
    // 模組資料夾內：往上一層再進入別的模組的內部檔案（../m01-map/map）也不行
    files: ['packages/sim/src/modules/**/*.ts'],
    ignores: ['**/*.test.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['@cpu/client*', '@cpu/tools*', '@cpu/content*', '@cpu/server*'], message: 'sim 是純邏輯層，不能依賴其他套件。內容資料要由外面傳進來。' },
            { group: ['phaser', 'ws', 'vite', 'node:*'], message: 'sim 不能使用框架、網路或 Node API。' },
            { regex: '^\\.\\./(?!\\.)[^/]+/[^/]+', message: '要用別的模組，只能 import 它的 index（例如 "../m01-map"），不能伸手進內部檔案。' },
          ],
        },
      ],
    },
  },
  {
    files: ['packages/client/src/**/*.ts', 'packages/tools/src/**/*.ts', 'tests/**/*.ts', 'content/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['@cpu/sim/*', '**/sim/src/**', '**/packages/sim/**'], message: '只能從 "@cpu/sim" 的公開入口取用。' },
            { group: ['@cpu/client*'], message: '客戶端是最上層，不能被別的套件依賴。' },
          ],
        },
      ],
    },
  },
  {
    files: ['packages/client/**/*.ts'],
    languageOptions: { globals: { ...globals.browser } },
  },
  {
    files: ['packages/tools/**/*.ts', 'tests/**/*.ts', 'e2e/**/*.ts', '*.config.{js,ts}'],
    languageOptions: { globals: { ...globals.node } },
  },
);
