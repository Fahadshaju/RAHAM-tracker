import { lazy, type ComponentType } from "react";

const KEY = "raham-chunk-reload";

// After a new deploy, an open tab may ask for old code files that no longer exist.
// When that happens, reload the page once to pick up the new version instead of showing an error.
export async function importWithReload<M>(load: () => Promise<M>): Promise<M> {
  try {
    const m = await load();
    if (typeof window !== "undefined") sessionStorage.removeItem(KEY);
    return m;
  } catch (err) {
    if (typeof window !== "undefined" && !sessionStorage.getItem(KEY)) {
      sessionStorage.setItem(KEY, "1");
      window.location.reload();
      return new Promise<never>(() => {});
    }
    throw err;
  }
}

export function lazyWithReload<T extends ComponentType<any>>(load: () => Promise<{ default: T }>) {
  return lazy(() => importWithReload(load));
}
