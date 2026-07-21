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
        <div className="flex flex-wrap items-center gap-2 text-xs text-faint"><span className="text-accent">(önizleme)</span><span>·</span><span>{locale.type}</span><span>·</span><span>{project.shared.year}</span></div>
        <h3 className="mt-4 break-words font-display text-3xl font-semibold leading-none">{locale.name}</h3>
        <p className="mt-4 text-sm leading-relaxed text-muted">{locale.description}</p>
        <ul className="mt-4 space-y-2">{locale.features.slice(0, 4).map((feature) => <li key={feature} className="flex gap-2 text-xs text-muted"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />{feature}</li>)}</ul>
        <div className="mt-5 flex flex-wrap gap-2">{project.shared.stack.map((item) => <span key={item} className="rounded-full border border-line px-2.5 py-1 font-mono text-[10px] text-faint">{item}</span>)}</div>
        <a href={project.shared.github} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 text-xs text-accent"><Github className="h-4 w-4" />GitHub</a>
      </div>
    </article>
  );
}
