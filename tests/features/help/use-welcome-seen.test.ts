import { afterEach, describe, expect, it, vi } from "vitest";
import { readWelcomeSeen, markWelcomeSeen } from "@/features/help/use-welcome-seen";

// The React hook is a thin wrapper over these pure helpers; testing the helpers
// (which own all the localStorage logic) covers the real regression risk without
// pulling in jsdom just to render a hook. Each test installs its own in-memory
// localStorage on globalThis and restores afterward.
function installStorage(impl: Partial<Storage>): void {
  vi.stubGlobal("localStorage", impl as Storage);
}

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
    clear: () => map.clear(),
    key: () => null,
    length: 0,
  } as Storage;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("use-welcome-seen storage helpers", () => {
  it("reads false when the flag has never been set", () => {
    installStorage(memoryStorage());
    expect(readWelcomeSeen()).toBe(false);
  });

  it("persists the flag so a later read returns true", () => {
    installStorage(memoryStorage());
    markWelcomeSeen();
    expect(readWelcomeSeen()).toBe(true);
  });

  it("fails closed (reads true) when getItem throws", () => {
    installStorage({
      getItem: () => {
        throw new Error("storage disabled");
      },
    });
    expect(readWelcomeSeen()).toBe(true);
  });

  it("does not throw when setItem is unavailable", () => {
    installStorage({
      setItem: () => {
        throw new Error("storage disabled");
      },
    });
    expect(() => markWelcomeSeen()).not.toThrow();
  });
});
