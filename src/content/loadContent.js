import siteJson from "./site.json";
import projectsJson from "./projects.json";
import certificatesJson from "./certificates.json";
import skillsJson from "./skills.json";
import visualsJson from "./visuals.json";
import { parsePortfolioFiles } from "./schemas.js";
import { buildContentView } from "./contentView.js";

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
export const CONTENT = hydrated.content;
