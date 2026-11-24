import { lazy, type ComponentType } from "react";

// After a new deploy, an open tab may ask for old code files that no longer exist.
// When that happens, reload the page once to pick up the new version instead of showing an error.
export function lazyWithReload<T extends ComponentType<any>>(load: () => Promise<{ default: T }>) {
  return lazy(async () => {
    try {
      const m = await load();
      sessionStorage.removeItem("raham-chunk-reload");
      return m;
    } catch (err) {
      if (typeof window !== "undefined" && !sessionStorage.getItem("raham-chunk-reload")) {
        sessionStorage.setItem("raham-chunk-reload", "1");
        window.location.reload();
        return new Promise<never>(() => {});
      }
      throw err;
    }
  });
}
