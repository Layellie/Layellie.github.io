import { SafeIcon } from "./iconRegistry.jsx";
import { KNOWN_VISUAL_MODULE_TYPES, MODULE_SCHEMAS } from "../../content/visualModuleSchemas.js";

export { LIST_ROW_TONES, MODULE_SCHEMAS, normalizeListRowTone } from "../../content/visualModuleSchemas.js";

const cardClass = "h-full rounded-xl border border-line bg-canvas/40 p-4";

function SearchBar({ data }) {
  return (
    <div className="flex h-full items-center gap-2 rounded-lg border border-line bg-canvas/60 px-3 py-2.5 text-sm text-faint">
      <SafeIcon name={data.icon} /> {data.placeholder}
    </div>
  );
}

function ListRow({ data }) {
  return (
    <div className="flex h-full min-w-0 items-center gap-3 rounded-lg border border-line bg-canvas/40 px-3 py-2.5">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-line text-[10px] text-faint">
        {data.index}
      </span>
      {data.tone === "image" ? (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-gradient-to-br from-[#26262c] to-[#16161a] text-faint">
          <SafeIcon name={data.icon} />
        </span>
      ) : (
        <SafeIcon name={data.icon} className="h-4 w-4 shrink-0 text-muted" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          {data.badge && (
            <span className="rounded px-1.5 py-0.5 text-[9px] font-semibold text-[#08080a] [background:var(--mock-accent)]">
              {data.badge}
            </span>
          )}
          <span className={`truncate text-xs text-ink/90 ${data.tone === "code" ? "font-mono" : ""}`}>
            {data.text}
          </span>
        </div>
        {data.caption && <div className="truncate text-[10px] text-faint">{data.caption}</div>}
      </div>
      <span className="ml-auto shrink-0 rounded border border-line px-1.5 py-0.5 font-mono text-[10px] text-faint">
        {data.shortcut}
      </span>
    </div>
  );
}

function Metric({ data }) {
  return (
    <div className={`${cardClass} p-5`}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs uppercase tracking-wider text-faint">{data.label}</span>
        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] [background:color-mix(in_srgb,var(--mock-accent)_10%,transparent)] [color:var(--mock-accent)]">
          <SafeIcon name={data.icon} className="h-3 w-3" /> {data.status}
        </span>
      </div>
      <div className="mt-3 flex items-end gap-1.5">
        <span className="font-display text-5xl leading-none tracking-tight md:text-6xl">{data.value}</span>
        <span className="mb-1 text-lg text-muted">{data.unit}</span>
      </div>
    </div>
  );
}

function Progress({ value }) {
  return (
    <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-line">
      <div className="h-full rounded-full [background:var(--mock-accent)]" style={{ width: `${value}%` }} />
    </div>
  );
}

function StatCard({ data }) {
  return (
    <div className={cardClass}>
      <div className="flex items-center gap-2 text-xs text-faint">
        {data.icon && <SafeIcon name={data.icon} />} {data.label}
      </div>
      <div className="mt-2 font-display text-2xl text-ink">{data.value}</div>
      {data.caption && <div className="mt-1 text-[11px] text-faint">{data.caption}</div>}
      {data.progress !== undefined && <Progress value={data.progress} />}
    </div>
  );
}

function ToggleSwitch({ enabled }) {
  return (
    <span className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full px-0.5 ${enabled ? "[background:var(--mock-accent)]" : "bg-line"}`}>
      <span className={`h-4 w-4 rounded-full bg-canvas transition-transform ${enabled ? "ml-auto" : ""}`} />
    </span>
  );
}

function Toggle({ data }) {
  return (
    <div className={cardClass}>
      <div className="flex items-center gap-2 text-xs text-faint">
        {data.icon && <SafeIcon name={data.icon} />} {data.label}
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        {data.valueLabel && <span className="text-sm text-ink">{data.valueLabel}</span>}
        {!data.valueLabel && <span className="text-xs text-ink/90">{data.caption}</span>}
        <ToggleSwitch enabled={data.enabled} />
      </div>
      {data.valueLabel && data.caption && <div className="mt-2 text-[11px] text-faint">{data.caption}</div>}
    </div>
  );
}

function CircularProgress({ data }) {
  const degrees = Math.round((data.progress / 100) * 360);
  return (
    <div className={`${cardClass} flex min-h-52 flex-col items-center justify-center text-center`}>
      <div
        className="relative flex h-36 w-36 items-center justify-center rounded-full p-[7px]"
        style={{ background: `conic-gradient(var(--mock-accent) 0deg ${degrees}deg, var(--color-line) ${degrees}deg 360deg)` }}
      >
        <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-[#111114]">
          <span className="text-[10px] uppercase tracking-[0.18em] text-faint">{data.label}</span>
          <span className="mt-1 font-display text-4xl font-semibold tracking-tight text-ink">{data.value}</span>
        </div>
      </div>
      <div className="mt-4 inline-flex items-center gap-2 text-xs text-muted">
        {data.icon && <SafeIcon name={data.icon} className="h-3.5 w-3.5 [color:var(--mock-accent)]" />}
        {data.caption}
      </div>
    </div>
  );
}

function ProgressBar({ data }) {
  return <div className={cardClass}><div className="flex justify-between text-xs text-faint"><span>{data.label}</span><span>{data.value}%</span></div><Progress value={data.value} /><div className="mt-2 text-[11px] text-muted">{data.caption}</div></div>;
}

function StatusBadge({ data }) {
  return <div className={`${cardClass} flex items-center justify-between gap-3`}><span className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1 text-xs [color:var(--mock-accent)]"><span className="h-1.5 w-1.5 rounded-full [background:var(--mock-accent)]" />{data.label}</span><span className="text-xs text-faint">{data.caption}</span></div>;
}

function InfoBox({ data }) {
  return <div className={cardClass}><div className="flex items-center gap-2 text-sm font-medium"><SafeIcon name={data.icon} className="h-4 w-4 [color:var(--mock-accent)]" />{data.title}</div><p className="mt-2 text-xs leading-relaxed text-muted">{data.text}</p></div>;
}

function CodeLines({ data }) {
  return <div className={`${cardClass} font-mono text-xs`}><div className="mb-3 flex items-center gap-2 text-faint"><SafeIcon name={data.icon} />{data.title}</div>{data.lines.map((line, index) => <div key={`${line}-${index}`} className="truncate py-0.5 text-ink/80"><span className="mr-2 text-faint">{String(index + 1).padStart(2, "0")}</span>{line}</div>)}</div>;
}

function TableModule({ data }) {
  return <div className={`${cardClass} overflow-hidden`}><div className="mb-3 text-xs font-medium">{data.title}</div><div className="overflow-x-auto"><table className="w-full text-left text-[11px]"><thead className="text-faint"><tr>{data.headers.map((header) => <th key={header} className="border-b border-line px-2 py-1.5 font-medium">{header}</th>)}</tr></thead><tbody className="text-muted">{data.rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={`${rowIndex}-${cellIndex}`} className="border-b border-line/60 px-2 py-1.5">{cell}</td>)}</tr>)}</tbody></table></div></div>;
}

function LineChart({ data }) {
  const min = Math.min(...data.values); const max = Math.max(...data.values); const range = max - min || 1;
  const points = data.values.map((value, index) => `${(index / (data.values.length - 1)) * 100},${36 - ((value - min) / range) * 30}`).join(" ");
  return <div className={cardClass}><div className="mb-3 text-xs text-faint">{data.title}</div><svg viewBox="0 0 100 40" role="img" aria-label={data.title} className="h-24 w-full"><polyline points={points} fill="none" stroke="var(--mock-accent)" strokeWidth="2" vectorEffect="non-scaling-stroke" /></svg></div>;
}

function BarChart({ data }) {
  const max = Math.max(...data.values, 1);
  return <div className={cardClass}><div className="mb-3 text-xs text-faint">{data.title}</div><div className="flex h-24 items-end gap-2">{data.values.map((value, index) => <div key={index} className="min-w-0 flex-1 rounded-t [background:var(--mock-accent)]" style={{ height: `${Math.max(4, (value / max) * 100)}%`, opacity: 0.45 + index / data.values.length / 2 }} />)}</div></div>;
}

function IconText({ data }) { return <div className={cardClass}><div className="flex items-center gap-2 font-medium"><SafeIcon name={data.icon} className="h-5 w-5 [color:var(--mock-accent)]" />{data.title}</div><p className="mt-2 text-xs text-muted">{data.text}</p></div>; }
function Badge({ data }) { return <div className={`${cardClass} flex items-center justify-center`}><span className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-xs [color:var(--mock-accent)]">{data.icon && <SafeIcon name={data.icon} />}{data.label}</span></div>; }
function TechTags({ data }) { return <div className={cardClass}><div className="mb-3 text-xs text-faint">{data.title}</div><div className="flex flex-wrap gap-2">{data.tags.map((tag) => <span key={tag} className="rounded-full border border-line px-2.5 py-1 font-mono text-[10px] text-muted">{tag}</span>)}</div></div>; }
function ButtonModule({ data }) { return <div className={`${cardClass} flex items-center justify-center`}><span className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium text-[#08080a] [background:var(--mock-accent)]">{data.icon && <SafeIcon name={data.icon} />}{data.label}</span></div>; }
function Tabs({ data }) { return <div className={`${cardClass} flex items-start gap-1 overflow-x-auto`}>{data.items.map((item, index) => <span key={item} className={`shrink-0 rounded-md px-3 py-1.5 text-xs ${index === data.activeIndex ? "text-[#08080a] [background:var(--mock-accent)]" : "text-muted"}`}>{item}</span>)}</div>; }
function Notification({ data }) { return <div className={`${cardClass} flex gap-3`}><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-elevated [color:var(--mock-accent)]"><SafeIcon name={data.icon} /></span><div><div className="text-sm font-medium">{data.title}</div><p className="mt-1 text-xs text-muted">{data.text}</p></div></div>; }

export const MODULE_COMPONENTS = {
  searchBar: SearchBar,
  listRow: ListRow,
  metric: Metric,
  statCard: StatCard,
  circularProgress: CircularProgress,
  progressBar: ProgressBar,
  toggle: Toggle,
  statusBadge: StatusBadge,
  infoBox: InfoBox,
  codeLines: CodeLines,
  table: TableModule,
  lineChart: LineChart,
  barChart: BarChart,
  iconText: IconText,
  badge: Badge,
  techTags: TechTags,
  button: ButtonModule,
  tabs: Tabs,
  notification: Notification,
};

export const MODULE_CATALOG = KNOWN_VISUAL_MODULE_TYPES;
