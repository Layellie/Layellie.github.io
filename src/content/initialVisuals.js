const place = (mobileColSpan, desktopColSpan, rowSpan = 1) => ({
  mobileColSpan,
  desktopColSpan,
  rowSpan,
  height: "normal",
});

export function createInitialVisuals(content) {
  const tr = content.tr.mock;
  const en = content.en.mock;

  return {
    schemaVersion: 1,
    presets: [
      {
        id: "clipboard",
        name: "AIO Hybrid Clipboard",
        shared: {
          accent: "lime",
          window: {
            title: "AIO Hybrid Clipboard",
            icon: "ClipboardList",
            controls: "neutral",
            trailing: "ALT + SPACE",
          },
          footer: { icon: "Code2", badge: "Reverse Search" },
        },
        tr: { footerText: tr.ocrEngine, footerBadge: tr.reverse },
        en: { footerText: en.ocrEngine, footerBadge: en.reverse },
        modules: [
          {
            id: "clipboard-search",
            type: "searchBar",
            shared: { placement: place(12, 12), icon: "Search" },
            tr: { placeholder: tr.search },
            en: { placeholder: en.search },
          },
          {
            id: "clipboard-row-code",
            type: "listRow",
            shared: {
              placement: place(12, 12),
              index: "1",
              icon: "Code2",
              shortcut: "ALT+1",
              tone: "code",
            },
            tr: { text: "git commit -m \"perf: 0.5ms timer\"", caption: "" },
            en: { text: "git commit -m \"perf: 0.5ms timer\"", caption: "" },
          },
          {
            id: "clipboard-row-ocr",
            type: "listRow",
            shared: {
              placement: place(12, 12),
              index: "2",
              icon: "Image",
              shortcut: "ALT+2",
              badge: "OCR",
              tone: "image",
            },
            tr: { text: "Fatura No: 2026-0192", caption: tr.ocrCaption },
            en: { text: "Invoice No: 2026-0192", caption: en.ocrCaption },
          },
          {
            id: "clipboard-row-link",
            type: "listRow",
            shared: {
              placement: place(12, 12),
              index: "3",
              icon: "Link2",
              shortcut: "ALT+3",
              tone: "code",
            },
            tr: { text: "github.com/Layellie", caption: "" },
            en: { text: "github.com/Layellie", caption: "" },
          },
        ],
      },
      {
        id: "standby",
        name: "StandbyAndTimer",
        shared: {
          accent: "lime",
          window: {
            title: "StandbyAndTimer",
            icon: "Gauge",
            controls: "neutral",
            trailing: "Admin",
            trailingIcon: "Lock",
          },
          footer: { icon: "Cpu", badge: "MVVM" },
        },
        tr: {
          windowTrailing: tr.admin,
          footerText: "NtSetTimerResolution · Win32 P/Invoke",
          footerBadge: "MVVM",
        },
        en: {
          windowTrailing: en.admin,
          footerText: "NtSetTimerResolution · Win32 P/Invoke",
          footerBadge: "MVVM",
        },
        modules: [
          {
            id: "timer-resolution",
            type: "metric",
            shared: {
              placement: place(12, 12),
              value: "0.50",
              unit: "ms",
              icon: "Lock",
            },
            tr: { label: tr.timerRes, status: tr.locked },
            en: { label: en.timerRes, status: en.locked },
          },
          {
            id: "timer-memory",
            type: "statCard",
            shared: {
              placement: place(6, 6),
              icon: "MemoryStick",
              value: "3.4 GB",
              progress: 82,
            },
            tr: { label: tr.standbyMem, caption: tr.cleared },
            en: { label: en.standbyMem, caption: en.cleared },
          },
          {
            id: "timer-game-mode",
            type: "toggle",
            shared: {
              placement: place(6, 6),
              icon: "Gamepad2",
              enabled: true,
            },
            tr: { label: tr.gameMode, valueLabel: tr.on, caption: tr.affinity },
            en: { label: en.gameMode, valueLabel: en.on, caption: en.affinity },
          },
        ],
      },
      {
        id: "eyehealth",
        name: "EyeHealth",
        shared: {
          accent: "lime",
          glow: true,
          window: {
            title: "EyeHealth",
            icon: "Eye",
            controls: "neutral",
            trailing: "Running",
          },
          footer: { icon: "Eye", badge: "TR / EN" },
        },
        tr: {
          windowTrailing: tr.eyeRunning,
          footerText: tr.eyeNative,
          footerBadge: "TR / EN",
        },
        en: {
          windowTrailing: en.eyeRunning,
          footerText: en.eyeNative,
          footerBadge: "TR / EN",
        },
        modules: [
          {
            id: "eye-next-break",
            type: "circularProgress",
            shared: {
              placement: { ...place(12, 7, 3), height: "tall" },
              value: "19:42",
              progress: 81,
              icon: "BellRing",
            },
            tr: { label: tr.eyeNext, caption: tr.eyeRule },
            en: { label: en.eyeNext, caption: en.eyeRule },
          },
          {
            id: "eye-work",
            type: "statCard",
            shared: { placement: place(6, 5), value: "20 min" },
            tr: { label: tr.eyeWork, caption: "" },
            en: { label: en.eyeWork, caption: "" },
          },
          {
            id: "eye-break",
            type: "statCard",
            shared: { placement: place(6, 5), value: "20 sec" },
            tr: { label: tr.eyeBreak, caption: "" },
            en: { label: en.eyeBreak, caption: "" },
          },
          {
            id: "eye-fullscreen",
            type: "toggle",
            shared: {
              placement: place(12, 5),
              icon: "Monitor",
              enabled: true,
            },
            tr: { label: tr.eyeFullscreen, valueLabel: "", caption: tr.eyePostpone },
            en: { label: en.eyeFullscreen, valueLabel: "", caption: en.eyePostpone },
          },
        ],
      },
    ],
  };
}
