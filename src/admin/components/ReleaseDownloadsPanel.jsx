import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, ExternalLink, RefreshCw } from "lucide-react";
import { githubRepositoryName } from "../../content/githubUrls.js";
import { adminApi } from "../api/client.js";
import { Button, Panel } from "./AdminUi.jsx";

export default function ReleaseDownloadsPanel({ projects }) {
  const [state, setState] = useState({ status: "idle", rows: [], error: "" });

  const publishedRepos = useMemo(
    () =>
      (projects?.items || [])
        .filter((item) => item.publicationStatus === "published")
        .map((item) => ({
          id: item.id,
          name: item.tr?.name || item.en?.name || item.id,
          repo: githubRepositoryName(item.shared?.github),
          github: item.shared?.github || "",
        }))
        .filter((item) => Boolean(item.repo)),
    [projects],
  );

  const loadDownloads = useCallback(async () => {
    if (!publishedRepos.length) {
      setState({ status: "ready", rows: [], error: "" });
      return;
    }
    if (typeof adminApi.releases !== "function") {
      setState({ status: "error", rows: [], error: "GitHub Release indirme verileri şu anda alınamadı." });
      return;
    }
    setState((current) => ({ ...current, status: "loading", error: "" }));
    try {
      const payload = await adminApi.releases(publishedRepos.map((entry) => entry.repo));
      const byRepo = new Map(
        (Array.isArray(payload?.releases) ? payload.releases : []).map((item) => [
          String(item.repo || "").toLowerCase(),
          item,
        ]),
      );
      const rows = publishedRepos.map((entry) => {
        const match = byRepo.get(entry.repo.toLowerCase());
        return {
          ...entry,
          downloads: Number(match?.downloads || 0),
          latestTag: typeof match?.latestTag === "string" ? match.latestTag : "",
          failed: !match || match.ok === false,
        };
      });
      const anyFailed = rows.some((row) => row.failed);
      setState({
        status: "ready",
        rows,
        error: anyFailed ? "Bazı repoların GitHub API yanıtı alınamadı (kota sınırı olabilir)." : "",
        updatedAt: new Date(),
      });
    } catch (error) {
      setState((current) => ({
        ...current,
        status: "error",
        error: error?.status === 429
          ? "Çok sık yenilendi; biraz sonra tekrar dene."
          : "GitHub Release indirme verileri şu anda alınamadı.",
      }));
    }
  }, [publishedRepos]);

  useEffect(() => {
    void loadDownloads();
  }, [loadDownloads]);

  const totalDownloads = state.rows.reduce((sum, row) => sum + (row.downloads || 0), 0);
  const isLoading = state.status === "loading";

  return (
    <Panel className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Download className="h-4 w-4 text-accent" />
          <h2 className="font-display text-xl font-semibold">Proje indirmeleri</h2>
          {state.rows.length > 0 && (
            <span className="rounded-full border border-accent/30 bg-accent/10 px-2.5 py-0.5 font-mono text-[11px] font-medium text-accent">
              {totalDownloads.toLocaleString("tr-TR")} toplam
            </span>
          )}
        </div>
        <Button variant="ghost" aria-label="İndirme sayılarını yenile" onClick={() => void loadDownloads()} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin motion-reduce:animate-none" : ""}`} />
          Yenile
        </Button>
      </div>

      <p className="mt-1.5 text-[11px] text-faint">
        GitHub Releases üzerindeki gerçek kurulum / portable indirmeleri (checksum ve imza dosyaları hariç).
      </p>

      {state.rows.length > 0 ? (
        <div className="mt-4 space-y-2">
          {state.rows.map((row) => (
            <div
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-canvas/40 px-3.5 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-ink">{row.name}</span>
                  {row.latestTag && (
                    <span className="rounded-full border border-accent/25 bg-accent/10 px-2 py-0.5 font-mono text-[10px] text-accent">
                      {row.latestTag}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="font-mono text-sm font-semibold tabular-nums text-ink">
                  {row.downloads.toLocaleString("tr-TR")}
                </span>
                {row.github && (
                  <a
                    href={`${row.github.replace(/\/$/, "")}/releases`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${row.name} GitHub Releases`}
                    className="rounded-lg border border-line p-1.5 text-faint transition hover:border-accent/40 hover:text-ink"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : isLoading ? (
        <div className="mt-4 text-xs text-muted">GitHub Release indirmeleri alınıyor…</div>
      ) : state.status === "error" ? null : (
        <div className="mt-4 text-xs text-faint">Yayınlı GitHub projesi bulunamadı.</div>
      )}

      {state.error && <div className="mt-2.5 text-xs text-amber-100">{state.error}</div>}
      {state.updatedAt && (
        <div className="mt-2.5 text-[10px] text-faint">
          Son kontrol: {state.updatedAt.toLocaleTimeString("tr-TR")}
        </div>
      )}
    </Panel>
  );
}
