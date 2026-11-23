import {
  BellRing,
  ClipboardList,
  Code2,
  Cpu,
  Eye,
  Gamepad2,
  Gauge,
  Image as ImageIcon,
  Link2,
  Lock,
  MemoryStick,
  Monitor,
  ScanText,
  Search,
} from "lucide-react";

function WindowDots() {
  return (
    <div className="flex gap-1.5">
      <span className="h-3 w-3 rounded-full bg-[#3a3a40]" />
      <span className="h-3 w-3 rounded-full bg-[#3a3a40]" />
      <span className="h-3 w-3 rounded-full bg-[#3a3a40]" />
    </div>
  );
}

function ClipboardMock({ m }) {
  return (
    <div className="relative w-full rounded-2xl border border-line bg-elevated/90 shadow-2xl shadow-black/40">
      <div className="flex items-center gap-3 border-b border-line px-5 py-4">
        <WindowDots />
        <div className="ml-2 inline-flex items-center gap-2 text-xs text-muted">
          <ClipboardList className="h-3.5 w-3.5" /> AIO Hybrid Clipboard
        </div>
        <span className="ml-auto rounded-md border border-line px-2 py-1 font-mono text-[10px] text-faint">
          ALT + SPACE
        </span>
      </div>

      <div className="px-5 pt-5">
        <div className="flex items-center gap-2 rounded-lg border border-line bg-canvas/60 px-3 py-2.5 text-sm text-faint">
          <Search className="h-4 w-4" /> {m.search}
        </div>
      </div>

      <div className="space-y-2 p-5">
        <div className="flex items-center gap-3 rounded-lg border border-line bg-canvas/40 px-3 py-2.5">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-line text-[10px] text-faint">
            1
          </span>
          <Code2 className="h-4 w-4 shrink-0 text-muted" />
          <span className="truncate font-mono text-xs text-ink/90">
            git commit -m "perf: 0.5ms timer"
          </span>
          <span className="ml-auto shrink-0 rounded border border-line px-1.5 py-0.5 font-mono text-[10px] text-faint">
            ALT+1
          </span>
        </div>

        <div className="flex items-center gap-3 rounded-lg border border-line bg-canvas/40 px-3 py-2.5">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-line text-[10px] text-faint">
            2
          </span>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-gradient-to-br from-[#26262c] to-[#16161a] text-faint">
            <ImageIcon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="rounded bg-accent px-1.5 py-0.5 text-[9px] font-semibold text-canvas">
                OCR
              </span>
              <span className="truncate text-xs text-ink/90">
                Fatura No: 2026-0192
              </span>
            </div>
            <div className="truncate text-[10px] text-faint">{m.ocrCaption}</div>
          </div>
          <span className="ml-auto shrink-0 rounded border border-line px-1.5 py-0.5 font-mono text-[10px] text-faint">
            ALT+2
          </span>
        </div>

        <div className="flex items-center gap-3 rounded-lg border border-line bg-canvas/40 px-3 py-2.5">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-line text-[10px] text-faint">
            3
          </span>
          <Link2 className="h-4 w-4 shrink-0 text-muted" />
          <span className="truncate font-mono text-xs text-ink/90">
            github.com/Layellie
          </span>
          <span className="ml-auto shrink-0 rounded border border-line px-1.5 py-0.5 font-mono text-[10px] text-faint">
            ALT+3
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-line px-5 py-3 text-[11px] text-faint">
        <span className="inline-flex items-center gap-1.5">
          <ScanText className="h-3.5 w-3.5" /> {m.ocrEngine}
        </span>
        <span className="rounded-full border border-line px-2 py-0.5">
          {m.reverse}
        </span>
      </div>
    </div>
  );
}

function TimerMock({ m }) {
  return (
    <div className="relative w-full rounded-2xl border border-line bg-elevated/90 shadow-2xl shadow-black/40">
      <div className="flex items-center gap-3 border-b border-line px-5 py-4">
        <WindowDots />
        <div className="ml-2 inline-flex items-center gap-2 text-xs text-muted">
          <Gauge className="h-3.5 w-3.5" /> StandbyAndTimer
        </div>
        <span className="ml-auto inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-[10px] text-faint">
          <Lock className="h-3 w-3" /> {m.admin}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 p-5">
        <div className="col-span-2 rounded-xl border border-line bg-canvas/40 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-faint">
              {m.timerRes}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] text-accent">
              <Lock className="h-3 w-3" /> {m.locked}
            </span>
          </div>
          <div className="mt-3 flex items-end gap-1.5">
            <span className="font-display text-5xl leading-none tracking-tight md:text-6xl">
              0.50
            </span>
            <span className="mb-1 text-lg text-muted">ms</span>
          </div>
        </div>

        <div className="rounded-xl border border-line bg-canvas/40 p-5">
          <div className="flex items-center gap-2 text-xs text-faint">
            <MemoryStick className="h-4 w-4" /> {m.standbyMem}
          </div>
          <div className="mt-3 font-display text-2xl">3.4 GB</div>
          <div className="mt-1 text-[11px] text-faint">{m.cleared}</div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-line">
            <div className="h-full w-[82%] rounded-full bg-accent" />
          </div>
        </div>

        <div className="rounded-xl border border-line bg-canvas/40 p-5">
          <div className="flex items-center gap-2 text-xs text-faint">
            <Gamepad2 className="h-4 w-4" /> {m.gameMode}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="relative inline-flex h-5 w-9 items-center rounded-full bg-accent px-0.5">
              <span className="ml-auto h-4 w-4 rounded-full bg-canvas" />
            </span>
            <span className="text-sm text-ink">{m.on}</span>
          </div>
          <div className="mt-2 text-[11px] text-faint">{m.affinity}</div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-line px-5 py-3 text-[11px] text-faint">
        <span className="inline-flex items-center gap-1.5">
          <Cpu className="h-3.5 w-3.5" /> NtSetTimerResolution · Win32 P/Invoke
        </span>
        <span className="rounded-full border border-line px-2 py-0.5">MVVM</span>
      </div>
    </div>
  );
}

function EyeHealthMock({ m }) {
  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-line bg-elevated/90 shadow-2xl shadow-black/40">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-40 opacity-70"
        style={{
          background:
            "radial-gradient(circle at 50% 0%, rgba(214,255,63,0.13), transparent 68%)",
        }}
      />

      <div className="relative flex items-center gap-3 border-b border-line px-5 py-4">
        <WindowDots />
        <div className="ml-2 inline-flex items-center gap-2 text-xs text-muted">
          <Eye className="h-4 w-4 text-accent" /> EyeHealth
        </div>
        <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-accent/20 bg-accent/10 px-2 py-1 text-[10px] text-accent">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" /> {m.eyeRunning}
        </span>
      </div>

      <div className="relative grid gap-4 p-5 sm:grid-cols-[1.15fr_0.85fr]">
        <div className="flex min-h-52 flex-col items-center justify-center rounded-xl border border-line bg-canvas/40 p-5 text-center">
          <div
            className="relative flex h-36 w-36 items-center justify-center rounded-full p-[7px]"
            style={{
              background:
                "conic-gradient(var(--color-accent) 0deg 292deg, var(--color-line) 292deg 360deg)",
            }}
          >
            <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-[#111114]">
              <span className="text-[10px] uppercase tracking-[0.18em] text-faint">
                {m.eyeNext}
              </span>
              <span className="mt-1 font-display text-4xl font-semibold tracking-tight text-ink">
                19:42
              </span>
            </div>
          </div>
          <div className="mt-4 inline-flex items-center gap-2 text-xs text-muted">
            <BellRing className="h-3.5 w-3.5 text-accent" /> {m.eyeRule}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-1">
          <div className="rounded-xl border border-line bg-canvas/40 p-4">
            <div className="text-[10px] uppercase tracking-wider text-faint">
              {m.eyeWork}
            </div>
            <div className="mt-1 font-display text-2xl text-ink">20 min</div>
          </div>
          <div className="rounded-xl border border-line bg-canvas/40 p-4">
            <div className="text-[10px] uppercase tracking-wider text-faint">
              {m.eyeBreak}
            </div>
            <div className="mt-1 font-display text-2xl text-ink">20 sec</div>
          </div>
          <div className="col-span-2 rounded-xl border border-line bg-canvas/40 p-4 sm:col-span-1">
            <div className="flex items-center gap-2 text-xs text-faint">
              <Monitor className="h-4 w-4" /> {m.eyeFullscreen}
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-xs text-ink/90">{m.eyePostpone}</span>
              <span className="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full bg-accent px-0.5">
                <span className="ml-auto h-4 w-4 rounded-full bg-canvas" />
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="relative flex items-center justify-between border-t border-line px-5 py-3 text-[11px] text-faint">
        <span className="inline-flex items-center gap-1.5">
          <Eye className="h-3.5 w-3.5" /> {m.eyeNative}
        </span>
        <span className="rounded-full border border-line px-2 py-0.5">TR / EN</span>
      </div>
    </div>
  );
}

const LEGACY_MAP = {
  "legacy-clipboard": ClipboardMock,
  "legacy-standby": TimerMock,
  "legacy-eyehealth": EyeHealthMock,
};

export default function LegacyProjectVisual({ componentId, mock }) {
  const Comp = LEGACY_MAP[componentId];
  return Comp ? <Comp m={mock} /> : null;
}
