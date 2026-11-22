import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const TEXT = {
  tr: {
    snakeTitle: "snake.exe · terminal modu",
    snakeControls: "Ok tuşları / WASD · Space: duraklat · R: sıfırla · Esc: çık",
    score: "Skor",
    best: "Rekor",
    paused: "DURAKLATILDI",
    gameOver: "OYUN BİTTİ",
    restart: "Tekrar oyna",
    resume: "Devam et",
    pause: "Duraklat",
    quit: "Çık (ESC)",
    typingTitle: "typing-bench · kod yazma hız testi",
    typingHint: "Aşağıdaki kodu yazmaya başlayınca sayaç başlar · Esc: çık",
    wpm: "WPM",
    accuracy: "Doğruluk",
    time: "Süre",
    done: "Tamamlandı",
    nextSnippet: "Yeni kod",
    retry: "Tekrar dene",
    typePlaceholder: "Yazmaya başla…",
    snakeExit: (score, best) => `snake kapatıldı · skor: ${score} · rekor: ${best}`,
    typingExit: (wpm, acc) =>
      wpm > 0
        ? `typing testi kapatıldı · son: ${wpm} WPM · %${acc} doğruluk`
        : "typing testi kapatıldı.",
  },
  en: {
    snakeTitle: "snake.exe · terminal mode",
    snakeControls: "Arrow keys / WASD · Space: pause · R: restart · Esc: quit",
    score: "Score",
    best: "Best",
    paused: "PAUSED",
    gameOver: "GAME OVER",
    restart: "Play again",
    resume: "Resume",
    pause: "Pause",
    quit: "Quit (ESC)",
    typingTitle: "typing-bench · code speed test",
    typingHint: "Timer starts on your first keystroke · Esc: quit",
    wpm: "WPM",
    accuracy: "Accuracy",
    time: "Time",
    done: "Completed",
    nextSnippet: "Next snippet",
    retry: "Retry",
    typePlaceholder: "Start typing…",
    snakeExit: (score, best) => `snake exited · score: ${score} · best: ${best}`,
    typingExit: (wpm, acc) =>
      wpm > 0
        ? `typing test exited · last: ${wpm} WPM · ${acc}% accuracy`
        : "typing test exited.",
  },
};

function readStoredNumber(key) {
  try {
    const raw = window.localStorage.getItem(key);
    const num = Number(raw);
    return Number.isFinite(num) && num >= 0 ? num : 0;
  } catch {
    return 0;
  }
}

function writeStoredNumber(key, value) {
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    /* depolama reddedilirse sessizce geç */
  }
}

/* ================================================================== */
/*  SNAKE                                                              */
/* ================================================================== */
const COLS = 20;
const ROWS = 12;
const INITIAL_SNAKE = [
  { x: 6, y: 6 },
  { x: 5, y: 6 },
  { x: 4, y: 6 },
];
const INITIAL_DIR = { x: 1, y: 0 };

function spawnFood(snake) {
  const occupied = new Set(snake.map((cell) => `${cell.x},${cell.y}`));
  const free = [];
  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      if (!occupied.has(`${x},${y}`)) free.push({ x, y });
    }
  }
  if (!free.length) return null;
  return free[Math.floor(Math.random() * free.length)];
}

function SnakeGame({ lang, onExit }) {
  const t = TEXT[lang] || TEXT.tr;
  const [snake, setSnake] = useState(INITIAL_SNAKE);
  const [food, setFood] = useState(() => spawnFood(INITIAL_SNAKE));
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => readStoredNumber("layellie-snake-best"));
  const [paused, setPaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const dirRef = useRef(INITIAL_DIR);
  const queueRef = useRef([]);
  const scoreRef = useRef(0);
  const bestRef = useRef(best);

  const queueDirection = useCallback((next) => {
    const last = queueRef.current.at(-1) || dirRef.current;
    if (last.x + next.x === 0 && last.y + next.y === 0) return;
    if (last.x === next.x && last.y === next.y) return;
    if (queueRef.current.length < 2) {
      queueRef.current.push(next);
    }
  }, []);

  const reset = useCallback(() => {
    dirRef.current = INITIAL_DIR;
    queueRef.current = [];
    scoreRef.current = 0;
    setSnake(INITIAL_SNAKE);
    setFood(spawnFood(INITIAL_SNAKE));
    setScore(0);
    setPaused(false);
    setGameOver(false);
  }, []);

  const exitGame = useCallback(() => {
    onExit(t.snakeExit(scoreRef.current, bestRef.current));
  }, [onExit, t]);

  useEffect(() => {
    const onKeyDown = (e) => {
      const key = e.key.toLowerCase();
      if (key === "escape" || key === "q") {
        e.preventDefault();
        exitGame();
        return;
      }
      if (key === "r") {
        e.preventDefault();
        reset();
        return;
      }
      if (key === " ") {
        e.preventDefault();
        setPaused((p) => !p);
        return;
      }
      if (key === "arrowup" || key === "w") {
        e.preventDefault();
        queueDirection({ x: 0, y: -1 });
      } else if (key === "arrowdown" || key === "s") {
        e.preventDefault();
        queueDirection({ x: 0, y: 1 });
      } else if (key === "arrowleft" || key === "a") {
        e.preventDefault();
        queueDirection({ x: -1, y: 0 });
      } else if (key === "arrowright" || key === "d") {
        e.preventDefault();
        queueDirection({ x: 1, y: 0 });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [exitGame, queueDirection, reset]);

  useEffect(() => {
    if (paused || gameOver) return undefined;
    const speed = Math.max(72, 120 - score * 2.5);
    const id = window.setInterval(() => {
      setSnake((prev) => {
        const nextDir = queueRef.current.shift() || dirRef.current;
        dirRef.current = nextDir;
        const head = prev[0];
        const nextHead = { x: head.x + nextDir.x, y: head.y + nextDir.y };

        const hitWall =
          nextHead.x < 0 || nextHead.x >= COLS || nextHead.y < 0 || nextHead.y >= ROWS;
        const ate = food && nextHead.x === food.x && nextHead.y === food.y;
        const bodyToCheck = ate ? prev : prev.slice(0, -1);
        const hitSelf = bodyToCheck.some(
          (segment) => segment.x === nextHead.x && segment.y === nextHead.y
        );

        if (hitWall || hitSelf) {
          setGameOver(true);
          return prev;
        }

        const nextSnake = ate ? [nextHead, ...prev] : [nextHead, ...prev.slice(0, -1)];
        if (ate) {
          const nextScore = scoreRef.current + 1;
          scoreRef.current = nextScore;
          setScore(nextScore);
          if (nextScore > bestRef.current) {
            bestRef.current = nextScore;
            setBest(nextScore);
            writeStoredNumber("layellie-snake-best", nextScore);
          }
          const nextFood = spawnFood(nextSnake);
          if (!nextFood) setGameOver(true);
          setFood(nextFood);
        }
        return nextSnake;
      });
    }, speed);
    return () => window.clearInterval(id);
  }, [paused, gameOver, food, score]);

  const cellMap = useMemo(() => {
    const map = new Map();
    snake.forEach((seg, idx) => map.set(`${seg.x},${seg.y}`, idx));
    return map;
  }, [snake]);

  return (
    <div className="flex h-full flex-col justify-between gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/70 pb-2 text-xs">
        <span className="font-semibold text-accent">{t.snakeTitle}</span>
        <div className="flex items-center gap-3 text-muted">
          <span>
            {t.score}: <strong className="text-ink">{score}</strong>
          </span>
          <span>
            {t.best}: <strong className="text-accent">{best}</strong>
          </span>
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            disabled={gameOver}
            className="rounded border border-line px-2 py-0.5 text-[11px] text-muted transition hover:border-accent/50 hover:text-ink disabled:opacity-40"
          >
            {paused ? t.resume : t.pause}
          </button>
          <button
            type="button"
            onClick={exitGame}
            className="rounded border border-line px-2 py-0.5 text-[11px] text-muted transition hover:border-red-400/50 hover:text-red-300"
          >
            {t.quit}
          </button>
        </div>
      </div>

      <div className="relative mx-auto w-full max-w-[440px]">
        <div
          role="img"
          aria-label={`Snake board score ${score}`}
          className="grid gap-[2px] rounded-xl border border-line bg-[#060608] p-2"
          style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: ROWS * COLS }, (_, index) => {
            const x = index % COLS;
            const y = Math.floor(index / COLS);
            const segIdx = cellMap.get(`${x},${y}`);
            const isFood = food && food.x === x && food.y === y;
            let cls = "bg-[#121216]";
            if (segIdx === 0) {
              cls = "bg-accent shadow-[0_0_8px_rgba(214,255,63,0.85)]";
            } else if (segIdx !== undefined) {
              cls = segIdx < 4 ? "bg-accent/70" : "bg-accent/40";
            } else if (isFood) {
              cls = "rounded-full bg-[#ff5f57] shadow-[0_0_8px_rgba(255,95,87,0.8)]";
            }
            return <div key={index} className={`aspect-square rounded-[3px] ${cls}`} />;
          })}
        </div>

        {(paused || gameOver) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-canvas/85 backdrop-blur-[2px]">
            <div className="font-display text-xl font-semibold tracking-wide text-accent">
              {gameOver ? t.gameOver : t.paused}
            </div>
            <div className="mt-1 text-xs text-muted">
              {t.score}: {score} · {t.best}: {best}
            </div>
            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={gameOver ? reset : () => setPaused(false)}
                className="rounded-lg bg-accent px-3.5 py-1.5 text-xs font-semibold text-canvas transition hover:opacity-90"
              >
                {gameOver ? t.restart : t.resume}
              </button>
              <button
                type="button"
                onClick={exitGame}
                className="rounded-lg border border-line px-3.5 py-1.5 text-xs text-muted transition hover:border-accent/40 hover:text-ink"
              >
                {t.quit}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobil yön tuşları + masaüstü ipucu */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-faint">
        <span>{t.snakeControls}</span>
        <div className="flex items-center gap-1 md:hidden">
          <button
            type="button"
            aria-label="Left"
            onClick={() => queueDirection({ x: -1, y: 0 })}
            className="h-7 w-7 rounded border border-line bg-surface text-ink active:border-accent"
          >
            ←
          </button>
          <button
            type="button"
            aria-label="Up"
            onClick={() => queueDirection({ x: 0, y: -1 })}
            className="h-7 w-7 rounded border border-line bg-surface text-ink active:border-accent"
          >
            ↑
          </button>
          <button
            type="button"
            aria-label="Down"
            onClick={() => queueDirection({ x: 0, y: 1 })}
            className="h-7 w-7 rounded border border-line bg-surface text-ink active:border-accent"
          >
            ↓
          </button>
          <button
            type="button"
            aria-label="Right"
            onClick={() => queueDirection({ x: 1, y: 0 })}
            className="h-7 w-7 rounded border border-line bg-surface text-ink active:border-accent"
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  CODE TYPING SPEED TEST (WPM)                                       */
/* ================================================================== */
const SNIPPETS = [
  {
    lang: "C# · Win32",
    code: "NtSetTimerResolution(5000, true, out uint currentResolution);",
  },
  {
    lang: "C++20 · Qt",
    code: "const auto monitors = detectFullscreenApps(QGuiApplication::screens());",
  },
  {
    lang: "C# · WPF",
    code: "await ClipboardEngine.CaptureAsync(useWinRtOcr: true, token);",
  },
  {
    lang: "SQL",
    code: "SELECT name, stars FROM projects WHERE published = 1 ORDER BY stars DESC;",
  },
  {
    lang: "React",
    code: "const [activeSkill, setActiveSkill] = useState(null);",
  },
  {
    lang: "Worker · TS",
    code: "const hash = await analyticsVisitorHash(visitorId, day, secret);",
  },
];

function TypingGame({ lang, onExit }) {
  const t = TEXT[lang] || TEXT.tr;
  const [snippetIndex, setSnippetIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [startedAt, setStartedAt] = useState(null);
  const [finishedAt, setFinishedAt] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const [bestWpm, setBestWpm] = useState(() => readStoredNumber("layellie-typing-best"));

  const inputRef = useRef(null);
  const snippet = SNIPPETS[snippetIndex];
  const target = snippet.code;
  const isComplete = typed.length >= target.length;

  useEffect(() => {
    inputRef.current?.focus();
  }, [snippetIndex]);

  useEffect(() => {
    if (!startedAt || finishedAt) return undefined;
    const id = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(id);
  }, [startedAt, finishedAt]);

  const stats = useMemo(() => {
    let correct = 0;
    for (let i = 0; i < typed.length; i += 1) {
      if (typed[i] === target[i]) correct += 1;
    }
    const elapsedMs = startedAt ? Math.max(250, (finishedAt || now) - startedAt) : 0;
    const elapsedSec = startedAt ? elapsedMs / 1000 : 0;
    const wpm = startedAt ? Math.round((correct / 5) / (elapsedMs / 60_000)) : 0;
    const accuracy = typed.length > 0 ? Math.round((correct / typed.length) * 100) : 100;
    return { correct, wpm, accuracy, elapsedSec };
  }, [typed, target, startedAt, finishedAt, now]);

  const exitGame = useCallback(() => {
    onExit(t.typingExit(stats.wpm, stats.accuracy));
  }, [onExit, stats.accuracy, stats.wpm, t]);

  const selectSnippet = useCallback((nextIdx) => {
    setSnippetIndex(nextIdx % SNIPPETS.length);
    setTyped("");
    setStartedAt(null);
    setFinishedAt(null);
    setNow(Date.now());
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const handleChange = (e) => {
    if (isComplete) return;
    const value = e.target.value.slice(0, target.length);
    const stamp = Date.now();
    if (!startedAt && value.length > 0) {
      setStartedAt(stamp);
      setNow(stamp);
    }
    setTyped(value);
    if (value.length >= target.length) {
      const start = startedAt || stamp - 250;
      setFinishedAt(stamp);
      setNow(stamp);
      let correct = 0;
      for (let i = 0; i < value.length; i += 1) {
        if (value[i] === target[i]) correct += 1;
      }
      const finalWpm = Math.round((correct / 5) / (Math.max(250, stamp - start) / 60_000));
      if (finalWpm > bestWpm) {
        setBestWpm(finalWpm);
        writeStoredNumber("layellie-typing-best", finalWpm);
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      exitGame();
    } else if (e.key === "Enter" && isComplete) {
      e.preventDefault();
      selectSnippet(snippetIndex + 1);
    }
  };

  return (
    <div
      className="flex h-full flex-col justify-between gap-4"
      onClick={() => inputRef.current?.focus()}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/70 pb-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-accent">{t.typingTitle}</span>
          <span className="rounded border border-line px-1.5 py-0.5 text-[10px] text-faint">
            {snippet.lang}
          </span>
        </div>
        <div className="flex items-center gap-3 text-muted">
          <span>
            {t.wpm}: <strong className="text-ink">{stats.wpm}</strong>
          </span>
          <span>
            {t.accuracy}: <strong className="text-ink">%{stats.accuracy}</strong>
          </span>
          <span>
            {t.best}: <strong className="text-accent">{bestWpm}</strong>
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              exitGame();
            }}
            className="rounded border border-line px-2 py-0.5 text-[11px] text-muted transition hover:border-red-400/50 hover:text-red-300"
          >
            {t.quit}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-line bg-[#060608] p-4 md:p-5">
        <div
          aria-label="Code typing prompt"
          className="select-none break-words font-mono text-sm leading-7 tracking-wide md:text-base"
        >
          {target.split("").map((char, i) => {
            let cls = "text-faint";
            if (i < typed.length) {
              cls =
                typed[i] === char
                  ? "text-accent"
                  : "rounded bg-red-500/25 text-red-300 underline decoration-red-400";
            } else if (i === typed.length && !isComplete) {
              cls = "rounded-sm bg-accent text-canvas";
            }
            return (
              <span key={i} className={cls}>
                {char}
              </span>
            );
          })}
        </div>

        <input
          ref={inputRef}
          value={typed}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onPaste={(e) => e.preventDefault()}
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="off"
          aria-label={t.typePlaceholder}
          placeholder={t.typePlaceholder}
          className="mt-4 w-full rounded-lg border border-line bg-surface/60 px-3 py-2 font-mono text-xs text-ink outline-none focus:border-accent/50"
        />

        {isComplete && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-accent/30 bg-accent/10 px-3.5 py-2.5 text-xs">
            <span className="font-medium text-accent">
              ✓ {t.done} · {stats.wpm} WPM · %{stats.accuracy} · {stats.elapsedSec.toFixed(1)}s
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  selectSnippet(snippetIndex);
                }}
                className="rounded border border-line bg-canvas/70 px-2.5 py-1 text-ink transition hover:border-accent/50"
              >
                {t.retry}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  selectSnippet(snippetIndex + 1);
                }}
                className="rounded bg-accent px-2.5 py-1 font-semibold text-canvas transition hover:opacity-90"
              >
                {t.nextSnippet}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-faint">
        <span>{t.typingHint}</span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            selectSnippet(snippetIndex + 1);
          }}
          className="text-muted underline-offset-2 hover:text-accent hover:underline"
        >
          {t.nextSnippet} →
        </button>
      </div>
    </div>
  );
}

export default function TerminalGames({ mode, lang = "tr", onExit }) {
  if (mode === "snake") return <SnakeGame lang={lang} onExit={onExit} />;
  return <TypingGame lang={lang} onExit={onExit} />;
}
