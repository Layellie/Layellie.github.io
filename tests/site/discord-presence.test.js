import { describe, expect, it, vi } from "vitest";
import { portfolioFiles } from "../../src/content/loadContent.js";
import { parsePortfolioFiles } from "../../src/content/schemas.js";
import { createDiffSummary } from "../../src/admin/data/model.js";
import {
  fetchDiscordPresence,
  isProfessionalActivity,
  isValidDiscordUserId,
  parseLanyardPresence,
} from "../../src/presence/discordPresence.js";

const SAMPLE_ID = "123456789012345678";

describe("discord presence (Lanyard) parser & professional filter", () => {
  it("validates Discord snowflake user IDs strictly", () => {
    expect(isValidDiscordUserId(SAMPLE_ID)).toBe(true);
    expect(isValidDiscordUserId("12345678901234567")).toBe(true);
    expect(isValidDiscordUserId("12345678901234567890")).toBe(true);
    expect(isValidDiscordUserId("")).toBe(false);
    expect(isValidDiscordUserId("12345")).toBe(false);
    expect(isValidDiscordUserId("12345678901234567a")).toBe(false);
    expect(isValidDiscordUserId("../users/123")).toBe(false);
  });

  it("hides games and Spotify when professionalFilter is ON and falls back to clean online status", () => {
    const payload = {
      success: true,
      data: {
        discord_status: "online",
        listening_to_spotify: true,
        spotify: { song: "Starboy", artist: "The Weeknd" },
        activities: [
          { type: 0, name: "Valorant", details: "Competitive" },
          { type: 4, name: "Custom Status", state: "chilling" },
        ],
      },
    };

    const trResult = parseLanyardPresence(payload, { professionalFilter: true, lang: "tr" });
    expect(trResult).toEqual({
      status: "online",
      kind: "status",
      app: "Discord",
      detail: "",
      label: "Discord · Çevrimiçi",
    });

    const enResult = parseLanyardPresence(payload, { professionalFilter: true, lang: "en" });
    expect(enResult?.label).toBe("Discord · Online");
  });

  it("shows allowlisted IDE activity even when professionalFilter is ON", () => {
    const payload = {
      success: true,
      data: {
        discord_status: "dnd",
        activities: [
          { type: 0, name: "Valorant" },
          { type: 0, name: "Visual Studio Code", details: "Workspace: Websitem" },
        ],
      },
    };

    expect(isProfessionalActivity({ type: 0, name: "Visual Studio Code" })).toBe(true);
    expect(isProfessionalActivity({ type: 0, name: "Valorant" })).toBe(false);

    const parsed = parseLanyardPresence(payload, { professionalFilter: true, lang: "tr" });
    expect(parsed).toEqual({
      status: "dnd",
      kind: "coding",
      app: "VS Code",
      detail: "Websitem",
      label: "VS Code · Websitem",
    });
  });

  it("shows Spotify or game activity when professionalFilter is OFF", () => {
    const spotifyPayload = {
      success: true,
      data: {
        discord_status: "online",
        listening_to_spotify: true,
        spotify: { song: "Instant Crush", artist: "Daft Punk" },
        activities: [],
      },
    };
    const spotify = parseLanyardPresence(spotifyPayload, { professionalFilter: false, lang: "tr" });
    expect(spotify?.kind).toBe("spotify");
    expect(spotify?.label).toBe("Spotify · Instant Crush — Daft Punk");

    const gamePayload = {
      success: true,
      data: {
        discord_status: "idle",
        listening_to_spotify: false,
        activities: [{ type: 0, name: "Counter-Strike 2", details: "Mirage" }],
      },
    };
    const game = parseLanyardPresence(gamePayload, { professionalFilter: false, lang: "tr" });
    expect(game?.kind).toBe("activity");
    expect(game?.label).toBe("Counter-Strike 2 · Mirage");
  });

  it("returns null when offline or payload is invalid", () => {
    expect(parseLanyardPresence({ success: true, data: { discord_status: "offline", activities: [] } })).toBeNull();
    expect(parseLanyardPresence({ success: false })).toBeNull();
    expect(parseLanyardPresence(null)).toBeNull();
  });

  it("never fetches for invalid IDs and swallows network/HTTP errors silently", async () => {
    const fetcher = vi.fn();
    expect(await fetchDiscordPresence("not-an-id", { fetcher })).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();

    const failFetcher = vi.fn().mockRejectedValue(new Error("offline"));
    expect(await fetchDiscordPresence(SAMPLE_ID, { fetcher: failFetcher })).toBeNull();

    const okFetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { discord_status: "online", activities: [] } }),
    });
    const payload = await fetchDiscordPresence(SAMPLE_ID, { fetcher: okFetcher });
    expect(payload?.success).toBe(true);
    expect(okFetcher).toHaveBeenCalledWith(
      `https://api.lanyard.rest/v1/users/${SAMPLE_ID}`,
      expect.objectContaining({ mode: "cors", credentials: "omit" })
    );
  });

  it("enforces Discord User ID in Zod schema when enabled and tracks diff in model", () => {
    const invalid = structuredClone(portfolioFiles);
    invalid.site.shared.discordPresence = {
      enabled: true,
      userId: "invalid",
      professionalFilter: true,
    };
    expect(() => parsePortfolioFiles(invalid)).toThrow();

    const valid = structuredClone(portfolioFiles);
    valid.site.shared.discordPresence = {
      enabled: true,
      userId: SAMPLE_ID,
      professionalFilter: false,
    };
    const parsed = parsePortfolioFiles(valid);
    expect(parsed.site.shared.discordPresence).toEqual({
      enabled: true,
      userId: SAMPLE_ID,
      professionalFilter: false,
    });

    const diff = createDiffSummary(portfolioFiles, parsed);
    expect(diff.site.changed).toContain("shared.discordPresence");
  });
});
