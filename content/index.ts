import { PlayerTuningSchema, ThemeSchema } from './schema';
import themeJson from './theme/zh-TW.json';
import playersJson from './tuning/players.json';

/** 載入時就驗證；格式錯誤會立刻丟出清楚的錯誤訊息。 */
export const theme = ThemeSchema.parse(themeJson);
export const playerTuning = PlayerTuningSchema.parse(playersJson);

export * from './schema';
