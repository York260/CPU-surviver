import { z } from 'zod';

/** 主題層：校名、區域名稱、介面文字。換舞台只需要改這份。 */
export const ThemeSchema = z.object({
  gameTitle: z.string().min(1),
  schoolName: z.string().min(1),
  zones: z.record(z.string(), z.string().min(1)),
  ui: z.object({
    subtitle: z.string(),
    controls: z.string(),
    defaultPlayerName: z.string().min(1),
  }),
});
export type Theme = z.infer<typeof ThemeSchema>;

/** 玩家手感參數。 */
export const PlayerTuningSchema = z.object({
  speed: z.number().positive().max(300),
  half: z.number().positive().max(7.5),
});
export type PlayerTuning = z.infer<typeof PlayerTuningSchema>;

/** 內容檔清單：路徑 → 驗證格式。content:check 會逐一檢查。 */
export const CONTENT_FILES: Record<string, z.ZodType> = {
  'theme/zh-TW.json': ThemeSchema,
  'tuning/players.json': PlayerTuningSchema,
};
