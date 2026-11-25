import { Check, Github } from "lucide-react";
import MockupRenderer from "../../components/project-visuals/MockupRenderer.jsx";
import ProjectVisual from "../../components/project-visuals/ProjectVisual.jsx";

export default function ProjectPreview({ project, presets, lang = "tr", screenshotPreviewUrl = "", publicSiteOrigin }) {
  const locale = project[lang];
  const legacyVisuals = Object.fromEntries([
    ["legacy-clipboard", "clipboard"],
    ["legacy-standby", "standby"],
    ["legacy-eyehealth", "eyehealth"],
  ].map(([componentId, visualId]) => [componentId, () => {
    const preset = presets.find((item) => item.id === visualId);
    return preset ? <MockupRenderer preset={preset} lang={lang} /> : null;
  }]));
  const visualReference = screenshotPreviewUrl && project.shared.visual.mode === "screenshot"
    ? { ...project.shared.visual, path: screenshotPreviewUrl }
    : project.shared.visual;
  return (
    <article className="grid grid-cols-1 gap-7 rounded-3xl border border-line bg-surface/40 p-5 lg:grid-cols-2 lg:p-7">
      <ProjectVisual reference={visualReference} presets={presets} lang={lang} legacyVisuals={legacyVisuals} publicSiteOrigin={publicSiteOrigin} requirePublicMediaOrigin />
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-3 text-xs text-faint">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-accent">(önizleme)</span>
            <span>·</span>
            <span>{locale.type}</span>
            <span>·</span>
            <span>{project.shared.year}</span>
          </div>
          {project.shared.license && (
            <span className="shrink-0 rounded-full border border-line px-2 py-0.5">
              {project.shared.license}
            </span>
          )}
        </div>
        <h3 className="mt-4 break-words font-display text-3xl font-semibold leading-none">{locale.name}</h3>
        {Array.isArray(locale.status) && locale.status.length > 0 && (
          <div className="mt-3.5 flex flex-wrap gap-2">
            {locale.status.map((status, index) => (
              <span
                key={`${status}-${index}`}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium before:inline-block before:h-1.5 before:w-1.5 before:rounded-full before:content-[''] ${
                  index === 0
                    ? "border-accent/25 bg-accent/10 text-accent before:bg-accent"
                    : "border-line bg-canvas/40 text-muted before:bg-faint"
                }`}
              >
                {status}
              </span>
            ))}
          </div>
        )}
        <p className="mt-4 text-sm leading-relaxed text-muted">{locale.description}</p>
        {Array.isArray(locale.features) && locale.features.length > 0 && (
          <ul className="mt-4 grid grid-cols-1 gap-x-5 gap-y-2 sm:grid-cols-2">
            {locale.features.map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-xs text-muted">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                {feature}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-5 flex flex-wrap gap-2">{project.shared.stack.map((item) => <span key={item} className="rounded-full border border-line px-2.5 py-1 font-mono text-[10px] text-faint">{item}</span>)}</div>
        <a href={project.shared.github} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-xs text-ink transition hover:border-accent/40 hover:text-accent"><Github className="h-4 w-4" />GitHub</a>
      </div>
    </article>
  );
}
