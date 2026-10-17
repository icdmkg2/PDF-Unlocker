import { beforeEach, describe, expect, it } from "vitest";

class MemoryStorage {
  private map = new Map<string, string>();
  getItem(k: string) { return this.map.get(k) ?? null; }
  setItem(k: string, v: string) { this.map.set(k, String(v)); }
  clear() { this.map.clear(); }
}
const g = globalThis as unknown as { window: EventTarget; localStorage: MemoryStorage };
g.window ??= new EventTarget();
g.localStorage ??= new MemoryStorage();

const fav = await import("@/lib/favorites");
const { allTools, toolSections } = await import("@/lib/tools");

describe("favorites", () => {
  beforeEach(() => g.localStorage.clear());

  it("toggles in the order tools were starred", () => {
    fav.toggleFavorite("/sign");
    fav.toggleFavorite("/merge");
    expect(fav.getFavorites()).toEqual(["/sign", "/merge"]);
    fav.toggleFavorite("/sign");
    expect(fav.getFavorites()).toEqual(["/merge"]);
  });

  it("ignores unknown tools and drops ones that no longer exist", () => {
    fav.toggleFavorite("/nope");
    expect(fav.getFavorites()).toEqual([]);
    g.localStorage.setItem("pdf-studio:favorite-tools", JSON.stringify(["/merge", "/removed-tool"]));
    expect(fav.getFavorites()).toEqual(["/merge"]);
  });

  it("reorders", () => {
    ["/merge", "/split", "/sign"].forEach(fav.toggleFavorite);
    fav.moveFavorite("/sign", -1);
    expect(fav.getFavorites()).toEqual(["/merge", "/sign", "/split"]);
    fav.moveFavorite("/merge", -1);
    expect(fav.getFavorites()).toEqual(["/merge", "/sign", "/split"]);
  });

  it("notifies subscribers", () => {
    let n = 0;
    const off = fav.subscribeFavorites(() => n++);
    fav.toggleFavorite("/merge");
    off();
    fav.toggleFavorite("/split");
    expect(n).toBe(1);
  });
});

describe("tool catalog", () => {
  it("lists every tool exactly once", () => {
    const hrefs = allTools.map((t) => t.href);
    expect(hrefs).toHaveLength(24);
    expect(new Set(hrefs).size).toBe(24);
  });

  it("gives every group a description", () => {
    for (const s of toolSections) expect(s.blurb.length).toBeGreaterThan(0);
  });
});
