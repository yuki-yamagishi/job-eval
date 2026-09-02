import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("PWA Manifest & Service Worker Assets", () => {
  const rootDir = process.cwd();

  it("has a valid public/manifest.json complying with PWA standards", () => {
    const manifestPath = path.join(rootDir, "public", "manifest.json");
    expect(fs.existsSync(manifestPath)).toBe(true);

    const content = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    expect(content.name).toContain("JobEval");
    expect(content.short_name).toBe("JobEval");
    expect(content.start_url).toBe("/");
    expect(content.display).toBe("standalone");
    expect(content.background_color).toBe("#0f172a");
    expect(content.theme_color).toBe("#4f46e5");
    expect(Array.isArray(content.icons)).toBe(true);
    expect(content.icons.length).toBeGreaterThan(0);
    expect(content.icons[0].src).toBe("/icons/icon.svg");
  });

  it("has a valid public/sw.js implementing offline caching", () => {
    const swPath = path.join(rootDir, "public", "sw.js");
    expect(fs.existsSync(swPath)).toBe(true);

    const swContent = fs.readFileSync(swPath, "utf-8");
    expect(swContent).toContain("CACHE_NAME");
    expect(swContent).toContain("addEventListener(\"install\"");
    expect(swContent).toContain("addEventListener(\"fetch\"");
    expect(swContent).toContain("caches.match");
  });

  it("has the application icon asset at public/icons/icon.svg", () => {
    const iconPath = path.join(rootDir, "public", "icons", "icon.svg");
    expect(fs.existsSync(iconPath)).toBe(true);
    const iconContent = fs.readFileSync(iconPath, "utf-8");
    expect(iconContent).toContain("<svg");
  });
});
