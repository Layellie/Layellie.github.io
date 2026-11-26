// Public site'ın içerik girişi.
//
// - `vite dev` / testler: Zod ile çalışma zamanında doğrulanan `loadContent.js` kullanılır.
// - `vite build`: build/precomputed-content.js bu modülü, doğrulanmış hazır veriyle
//   değiştirir; böylece Zod ve ayrıştırma maliyeti ziyaretçinin tarayıcısına gitmez.
export { AVAILABILITY_TONE, CONTENT, DISCORD_PRESENCE, IDENTITY, SKILL_RELATIONS, portfolioFiles, selectSkillsTicker } from "./loadContent.js";
