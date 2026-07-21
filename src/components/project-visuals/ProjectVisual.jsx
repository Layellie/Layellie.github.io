import MockupRenderer, { UnknownModuleFallback } from "./MockupRenderer.jsx";
import { resolveMediaUrl } from "./mediaUrl.js";

export default function ProjectVisual({ reference, presets, lang, legacyVisuals = {}, publicSiteOrigin, requirePublicMediaOrigin = false }) {
  if (!reference) return <UnknownModuleFallback module={{ id: "missing", type: "visual" }} reason="Missing project visual" />;

  if (reference.mode === "screenshot") {
    const source = resolveMediaUrl(reference.path, { publicSiteOrigin, requirePublicOrigin: requirePublicMediaOrigin });
    if (!source) return <UnknownModuleFallback module={{ id: "media-origin", type: "screenshot" }} reason="Public media origin is not configured" />;
    return <div className="overflow-hidden rounded-2xl border border-line bg-elevated/90 shadow-2xl shadow-black/40"><img src={source} alt={reference.alt?.[lang] || reference.alt?.tr || ""} className={`aspect-[4/3] w-full ${reference.objectFit === "cover" ? "object-cover" : "object-contain"}`} loading="lazy" /></div>;
  }

  if (reference.mode === "custom") {
    const Legacy = legacyVisuals[reference.componentId];
    return Legacy ? <Legacy /> : <UnknownModuleFallback module={{ id: reference.componentId, type: "custom" }} reason="Unknown custom visual" />;
  }

  if (reference.mode === "builder") {
    const preset = presets.find((item) => item.id === reference.visualId);
    if (preset) return <MockupRenderer preset={preset} lang={lang} />;
    const Legacy = reference.fallbackComponentId ? legacyVisuals[reference.fallbackComponentId] : null;
    return Legacy ? <Legacy /> : <UnknownModuleFallback module={{ id: reference.visualId, type: "builder" }} reason="Missing visual preset" />;
  }

  return <UnknownModuleFallback module={{ id: "invalid", type: reference.mode }} />;
}
