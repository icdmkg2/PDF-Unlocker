import { beforeEach, describe, expect, it } from "vitest";

class MemoryStorage {
  private map = new Map<string, string>();
  getItem(k: string) { return this.map.get(k) ?? null; }
  setItem(k: string, v: string) { this.map.set(k, String(v)); }
  removeItem(k: string) { this.map.delete(k); }
  clear() { this.map.clear(); }
}

// The module reads browser globals; give it a minimal window and localStorage.
const g = globalThis as unknown as { window: EventTarget; localStorage: MemoryStorage };
g.window = new EventTarget();
g.localStorage = new MemoryStorage();

const store = await import("@/lib/saved-passwords");

describe("saved passwords", () => {
  beforeEach(() => g.localStorage.clear());

  it("starts empty", () => {
    expect(store.getSavedPasswords()).toEqual([]);
  });

  it("saves with the given name and a default name when blank", () => {
    store.savePassword("hunter2", "  Bank  ");
    store.savePassword("s3cret", "");
    const names = store.getSavedPasswords().map((p) => p.name).sort();
    expect(names).toEqual(["Bank", "Password 2"]);
  });

  it("does not duplicate the same password; renames it instead", () => {
    store.savePassword("hunter2", "Bank");
    store.savePassword("hunter2", "Bank statements");
    const list = store.getSavedPasswords();
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe("Bank statements");
  });

  it("ignores empty passwords", () => {
    expect(store.savePassword("", "Nothing")).toBe(false);
    expect(store.getSavedPasswords()).toHaveLength(0);
  });

  it("renames, deletes and clears", () => {
    store.savePassword("a", "A");
    store.savePassword("b", "B");
    const [first] = store.getSavedPasswords();
    store.renamePassword(first.id, "Renamed");
    expect(store.getSavedPasswords().find((p) => p.id === first.id)?.name).toBe("Renamed");
    store.renamePassword(first.id, "   ");
    expect(store.getSavedPasswords().find((p) => p.id === first.id)?.name).toBe("Renamed");
    store.deletePassword(first.id);
    expect(store.getSavedPasswords()).toHaveLength(1);
    store.clearPasswords();
    expect(store.getSavedPasswords()).toHaveLength(0);
  });

  it("sorts recently used passwords first", () => {
    store.savePassword("old", "Old");
    store.savePassword("new", "New");
    store.markPasswordUsed("old");
    expect(store.sortForUse(store.getSavedPasswords()).map((p) => p.name)).toEqual(["Old", "New"]);
  });

  it("returns a stable snapshot until storage changes", () => {
    store.savePassword("x", "X");
    const a = store.getSavedPasswords();
    expect(store.getSavedPasswords()).toBe(a);
    store.savePassword("y", "Y");
    expect(store.getSavedPasswords()).not.toBe(a);
  });

  it("notifies subscribers on change", () => {
    let calls = 0;
    const unsubscribe = store.subscribe(() => calls++);
    store.savePassword("z", "Z");
    unsubscribe();
    store.savePassword("w", "W");
    expect(calls).toBe(1);
  });

  it("treats corrupt storage as empty", () => {
    g.localStorage.setItem("pdf-studio:saved-passwords", "{not json");
    expect(store.getSavedPasswords()).toEqual([]);
  });
});
