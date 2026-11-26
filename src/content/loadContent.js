import siteJson from "./site.json";
import projectsJson from "./projects.json";
import certificatesJson from "./certificates.json";
import skillsJson from "./skills.json";
import visualsJson from "./visuals.json";
import { parsePortfolioFiles } from "./schemas.js";
import { buildContentView } from "./contentView.js";
import { buildSkillRelationIndex } from "./skillRelations.js";

export { buildContentView };
export { selectSkillsTicker } from "./skillsTicker.js";

export const portfolioFiles = parsePortfolioFiles({
  site: siteJson,
  projects: projectsJson,
  certificates: certificatesJson,
  skills: skillsJson,
  visuals: visualsJson,
});

const hydrated = buildContentView(portfolioFiles);

export const IDENTITY = hydrated.identity;
export const DISCORD_PRESENCE = hydrated.discordPresence;
export const AVAILABILITY_TONE = hydrated.availabilityTone;
export const AVAILABILITY = hydrated.availability;
export const CONTENT = hydrated.content;
export const SKILL_RELATIONS = buildSkillRelationIndex(portfolioFiles);
