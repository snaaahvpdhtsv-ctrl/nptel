import { createHash } from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import type { Plugin, ResolvedConfig } from "vite"

/** Matches the phone header in dark mode; src/lib/offline.ts swaps it for the light theme. */
const THEME_COLOR = "#121212"

// Scripts, styles and images, plus the Latin font files the pages use. Other font subsets
// are saved the first time a page needs one.
const isPrecachedBuildFile = (file: string) =>
  /\.(js|css|svg|png|jpe?g|webp|avif|gif|ico)$/.test(file) ||
  /-latin(-ext)?-\d+-normal-[\w-]+\.woff2$/.test(file)

// Home-screen icons are only read while installing, which needs a connection anyway.
const isPrecachedPublicFile = (file: string) =>
  !file.startsWith("icons/") && /\.(svg|png|ico|webmanifest)$/.test(file)

function listFiles(dir: string, prefix = ""): string[] {
  if (!dir || !fs.existsSync(dir)) return []
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name.startsWith(".")) return []
    const relative = `${prefix}${entry.name}`
    return entry.isDirectory()
      ? listFiles(path.join(dir, entry.name), `${relative}/`)
      : [relative]
  })
}

/**
 * Makes the built app installable and usable offline:
 * - adds the web app manifest, theme colour and iOS home-screen tags to index.html;
 * - at build time, emits sw.js from offline/service-worker.js with this build's file
 *   list, so the service worker can save the whole app on the first visit.
 * The app registers the worker itself (src/lib/offline.ts), and only in built versions.
 */
export function offlineSupport(): Plugin {
  let config: ResolvedConfig

  return {
    name: "app-offline-support",
    // Only `vite build` emits sw.js, so the app checks this rather than the mode or NODE_ENV,
    // which can say "development" in builds too.
    config(_config, { command }) {
      return {
        define: { __OFFLINE_BUILD__: JSON.stringify(command === "build") },
      }
    },
    configResolved(resolved) {
      config = resolved
    },
    transformIndexHtml() {
      const { base } = config
      return [
        {
          tag: "link",
          attrs: { rel: "manifest", href: `${base}manifest.webmanifest` },
          injectTo: "head",
        },
        {
          tag: "meta",
          attrs: { name: "theme-color", content: THEME_COLOR },
          injectTo: "head",
        },
        {
          tag: "link",
          attrs: {
            rel: "apple-touch-icon",
            href: `${base}icons/apple-touch-icon.png`,
          },
          injectTo: "head",
        },
        {
          tag: "meta",
          attrs: { name: "apple-mobile-web-app-title", content: "NPTEL Quiz" },
          injectTo: "head",
        },
        {
          tag: "meta",
          attrs: { name: "mobile-web-app-capable", content: "yes" },
          injectTo: "head",
        },
        {
          tag: "meta",
          attrs: { name: "apple-mobile-web-app-capable", content: "yes" },
          injectTo: "head",
        },
        {
          tag: "meta",
          attrs: {
            name: "apple-mobile-web-app-status-bar-style",
            content: "black",
          },
          injectTo: "head",
        },
      ]
    },
    generateBundle(_options, bundle) {
      if (config.command !== "build") return
      const builtFiles = Object.keys(bundle).filter(isPrecachedBuildFile)
      const publicFiles = listFiles(config.publicDir).filter(
        isPrecachedPublicFile,
      )
      const template = fs.readFileSync(
        path.resolve(config.root, "offline/service-worker.js"),
        "utf8",
      )
      // Built file names already carry content hashes; public files are hashed by content.
      const version = createHash("sha256").update(template)
      for (const file of builtFiles) version.update(file)
      for (const file of publicFiles)
        version
          .update(file)
          .update(fs.readFileSync(path.join(config.publicDir, file)))

      this.emitFile({
        type: "asset",
        fileName: "sw.js",
        source: [
          `const OFFLINE_VERSION = ${JSON.stringify(version.digest("hex").slice(0, 12))}`,
          `const ASSETS_DIR = ${JSON.stringify(config.build.assetsDir)}`,
          `const PRECACHE_FILES = ${JSON.stringify([...builtFiles, ...publicFiles].sort(), null, 2)}`,
          "",
          template,
        ].join("\n"),
      })
    },
  }
}
