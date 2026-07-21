import { visualPresetSchema } from "../../content/schemas.js";
import { MODULE_COMPONENTS, MODULE_SCHEMAS } from "./moduleRegistry.jsx";
import { SafeIcon } from "./iconRegistry.jsx";

export const ACCENT_COLORS = {
  lime: "#d6ff3f",
  cyan: "#54e6df",
  blue: "#70a7ff",
  violet: "#b697ff",
  amber: "#ffc857",
  rose: "#ff7aa8",
};

const MOBILE_SPANS = { 1: "col-span-1", 2: "col-span-2", 3: "col-span-3", 4: "col-span-4", 5: "col-span-5", 6: "col-span-6", 7: "col-span-7", 8: "col-span-8", 9: "col-span-9", 10: "col-span-10", 11: "col-span-11", 12: "col-span-12" };
const DESKTOP_SPANS = { 1: "sm:col-span-1", 2: "sm:col-span-2", 3: "sm:col-span-3", 4: "sm:col-span-4", 5: "sm:col-span-5", 6: "sm:col-span-6", 7: "sm:col-span-7", 8: "sm:col-span-8", 9: "sm:col-span-9", 10: "sm:col-span-10", 11: "sm:col-span-11", 12: "sm:col-span-12" };
const ROW_SPANS = { 1: "row-span-1", 2: "sm:row-span-2", 3: "sm:row-span-3" };
const EXPLICIT_ROW_SPANS = { 1: "row-span-1", 2: "row-span-2", 3: "row-span-3" };
const HEIGHTS = { compact: "min-h-10", normal: "min-h-20", tall: "min-h-52" };

export function modulePlacementClasses(placement = {}, viewportMode = "responsive") {
  const mobile = Math.min(12, Math.max(1, Number(placement.mobileColSpan) || 12));
  const desktop = Math.min(12, Math.max(1, Number(placement.desktopColSpan) || mobile));
  const rows = Math.min(3, Math.max(1, Number(placement.rowSpan) || 1));
  const height = HEIGHTS[placement.height] || HEIGHTS.normal;
  if (viewportMode === "mobile") return `${MOBILE_SPANS[mobile]} ${height}`;
  if (viewportMode === "desktop") return `${MOBILE_SPANS[desktop]} ${EXPLICIT_ROW_SPANS[rows]} ${height}`;
  return `${MOBILE_SPANS[mobile]} ${DESKTOP_SPANS[desktop]} ${ROW_SPANS[rows]} ${height}`;
}

export function UnknownModuleFallback({ module, reason = "Unsupported module" }) {
  return (
    <div role="status" className="flex h-full min-h-20 items-center gap-3 rounded-xl border border-dashed border-amber-400/40 bg-amber-400/5 p-4 text-xs text-amber-200">
      <SafeIcon name="Info" />
      <span><strong className="font-medium">{reason}</strong><span className="mt-0.5 block text-amber-200/60">{module?.type || "unknown"} · {module?.id || "missing-id"}</span></span>
    </div>
  );
}

function WindowDots({ mode }) {
  if (mode === "traffic") {
    return <div className="flex gap-1.5"><span className="h-3 w-3 rounded-full bg-[#ff5f57]" /><span className="h-3 w-3 rounded-full bg-[#febc2e]" /><span className="h-3 w-3 rounded-full bg-[#28c840]" /></div>;
  }
  return <div className="flex gap-1.5"><span className="h-3 w-3 rounded-full bg-[#3a3a40]" /><span className="h-3 w-3 rounded-full bg-[#3a3a40]" /><span className="h-3 w-3 rounded-full bg-[#3a3a40]" /></div>;
}

export default function MockupRenderer({ preset, lang = "tr", className = "", viewportMode = "responsive" }) {
  const parsed = visualPresetSchema.safeParse(preset);
  if (!parsed.success) {
    return <UnknownModuleFallback module={{ id: preset?.id, type: "visual" }} reason="Invalid visual preset" />;
  }

  const visual = parsed.data;
  const locale = visual[lang] || visual.tr;
  const windowTrailing = locale.windowTrailing || visual.shared.window.trailing || "";
  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl border border-line bg-elevated/90 shadow-2xl shadow-black/40 ${className}`}
      data-preview-viewport={viewportMode}
      style={{ "--mock-accent": ACCENT_COLORS[visual.shared.accent] || ACCENT_COLORS.lime }}
    >
      {visual.shared.glow && <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-40 opacity-70" style={{ background: "radial-gradient(circle at 50% 0%, color-mix(in srgb, var(--mock-accent) 13%, transparent), transparent 68%)" }} />}
      <div className="relative flex items-center gap-3 border-b border-line px-5 py-4">
        <WindowDots mode={visual.shared.window.controls} />
        <div className="ml-2 inline-flex min-w-0 items-center gap-2 truncate text-xs text-muted">
          <SafeIcon name={visual.shared.window.icon} className="h-3.5 w-3.5 shrink-0 [color:var(--mock-accent)]" />
          <span className="truncate">{visual.shared.window.title}</span>
        </div>
        {windowTrailing && <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-md border border-line px-2 py-1 font-mono text-[10px] text-faint">{visual.shared.window.trailingIcon && <SafeIcon name={visual.shared.window.trailingIcon} className="h-3 w-3" />}{windowTrailing}</span>}
      </div>

      <div className="relative grid grid-cols-12 gap-3 p-5 [grid-auto-flow:dense]">
        {visual.modules.map((module) => {
          const Component = MODULE_COMPONENTS[module.type];
          const schema = MODULE_SCHEMAS[module.type];
          const data = { ...module.shared, ...(module[lang] || module.tr) };
          const placement = module.shared?.placement;
          return (
            <div key={module.id} data-module-id={module.id} className={modulePlacementClasses(placement, viewportMode)}>
              {!Component || !schema ? (
                <UnknownModuleFallback module={module} />
              ) : (() => {
                const moduleResult = schema.safeParse(data);
                return moduleResult.success ? <Component data={moduleResult.data} /> : <UnknownModuleFallback module={module} reason="Invalid module data" />;
              })()}
            </div>
          );
        })}
      </div>

      <div className="relative flex items-center justify-between gap-4 border-t border-line px-5 py-3 text-[11px] text-faint">
        <span className="inline-flex min-w-0 items-center gap-1.5 truncate"><SafeIcon name={visual.shared.footer.icon} className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{locale.footerText}</span></span>
        <span className="shrink-0 rounded-full border border-line px-2 py-0.5">{locale.footerBadge}</span>
      </div>
    </div>
  );
}
