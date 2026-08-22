import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin, type ViteDevServer } from "vite";
import { SITE_ROBOTS_CONTENT } from "./shared/const";

// =============================================================================
// Dev Debug Collector - Vite Plugin (개발 전용)
// Writes browser logs directly to files, trimmed when exceeding size limit
// =============================================================================

const PROJECT_ROOT = import.meta.dirname;
const LOG_DIR = path.join(PROJECT_ROOT, ".devtools-logs");
const MAX_LOG_SIZE_BYTES = 1 * 1024 * 1024; // 1MB per log file
const TRIM_TARGET_BYTES = Math.floor(MAX_LOG_SIZE_BYTES * 0.6); // Trim to 60% to avoid constant re-trimming

type LogSource = "browserConsole" | "networkRequests" | "sessionReplay";

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function trimLogFile(logPath: string, maxSize: number) {
  try {
    if (!fs.existsSync(logPath) || fs.statSync(logPath).size <= maxSize) {
      return;
    }

    const lines = fs.readFileSync(logPath, "utf-8").split("\n");
    const keptLines: string[] = [];
    let keptBytes = 0;

    // Keep newest lines (from end) that fit within 60% of maxSize
    const targetSize = TRIM_TARGET_BYTES;
    for (let i = lines.length - 1; i >= 0; i--) {
      const lineBytes = Buffer.byteLength(`${lines[i]}\n`, "utf-8");
      if (keptBytes + lineBytes > targetSize) break;
      keptLines.unshift(lines[i]);
      keptBytes += lineBytes;
    }

    fs.writeFileSync(logPath, keptLines.join("\n"), "utf-8");
  } catch {
    /* ignore trim errors */
  }
}

function writeToLogFile(source: LogSource, entries: unknown[]) {
  if (entries.length === 0) return;

  ensureLogDir();
  const logPath = path.join(LOG_DIR, `${source}.log`);

  // Format entries with timestamps
  const lines = entries.map((entry) => {
    const ts = new Date().toISOString();
    return `[${ts}] ${JSON.stringify(entry)}`;
  });

  // Append to log file
  fs.appendFileSync(logPath, `${lines.join("\n")}\n`, "utf-8");

  // Trim if exceeds max size
  trimLogFile(logPath, MAX_LOG_SIZE_BYTES);
}

/**
 * Vite plugin to collect browser debug logs
 * - GET  /__devtools__/debug-collector.js: 디스크(tools/devtools/)에서 직접 서빙 —
 *   client/public/ 에 두면 프로덕션 번들에 그대로 실려 나간다(v19 3c).
 * - POST /__devtools__/logs: Browser sends logs, written directly to files
 * - Files: browserConsole.log, networkRequests.log, sessionReplay.log
 * - Auto-trimmed when exceeding 1MB (keeps newest entries)
 */
function vitePluginDevDebugCollector(): Plugin {
  return {
    name: "dev-debug-collector",

    transformIndexHtml(html) {
      if (process.env.NODE_ENV === "production") {
        return html;
      }
      return {
        html,
        tags: [
          {
            tag: "script",
            attrs: {
              src: "/__devtools__/debug-collector.js",
              defer: true,
            },
            injectTo: "head",
          },
        ],
      };
    },

    configureServer(server: ViteDevServer) {
      // GET /__devtools__/debug-collector.js — public/ 밖 디스크에서 서빙한다.
      server.middlewares.use("/__devtools__/debug-collector.js", (_req, res) => {
        const file = path.join(PROJECT_ROOT, "tools", "devtools", "debug-collector.js");
        if (!fs.existsSync(file)) {
          res.writeHead(404);
          res.end("// dev debug collector not found");
          return;
        }
        res.writeHead(200, { "Content-Type": "text/javascript; charset=utf-8" });
        res.end(fs.readFileSync(file, "utf-8"));
      });

      // POST /__devtools__/logs: Browser sends logs (written directly to files)
      server.middlewares.use("/__devtools__/logs", (req, res, next) => {
        if (req.method !== "POST") {
          return next();
        }

        const handlePayload = (payload: any) => {
          // Write logs directly to files
          if (payload.consoleLogs?.length > 0) {
            writeToLogFile("browserConsole", payload.consoleLogs);
          }
          if (payload.networkRequests?.length > 0) {
            writeToLogFile("networkRequests", payload.networkRequests);
          }
          if (payload.sessionEvents?.length > 0) {
            writeToLogFile("sessionReplay", payload.sessionEvents);
          }

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true }));
        };

        const reqBody = (req as { body?: unknown }).body;
        if (reqBody && typeof reqBody === "object") {
          try {
            handlePayload(reqBody);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
          return;
        }

        let body = "";
        req.on("data", (chunk) => {
          body += chunk.toString();
        });

        req.on("end", () => {
          try {
            const payload = JSON.parse(body);
            handlePayload(payload);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
        });
      });
    },
  };
}

/**
 * SPA 진입 HTML(index.html)에 meta robots 를 **빌드 시** 박는다.
 *
 * 왜 런타임(JS)이 아니라 빌드 시인가: 크롤러가 처음 받는 건 원본 HTML 이다.
 * JS 로 붙이면 렌더링을 돌리는 봇만 보고, 그마저 타이밍에 걸린다.
 * 원본에 박혀 있으면 JS 를 안 돌리는 봇도 즉시 읽는다.
 *
 * 값은 shared/const.ts 의 SITE_PUBLIC 하나에서 나온다. 재공개는 그 한 줄만 바꾸면 된다.
 */
function vitePluginSiteRobots(): Plugin {
  return {
    name: "site-robots",
    transformIndexHtml(html) {
      return {
        html,
        tags: [
          {
            tag: "meta",
            attrs: { name: "robots", content: SITE_ROBOTS_CONTENT },
            injectTo: "head-prepend",
          },
        ],
      };
    },
  };
}

// vitePluginManusRuntime 제거 (2026-08-20 정찰 확정): Manus 비주얼 에디터 전용 브릿지로
// 독립 배포에선 전 기능 도먼트. index.html 에 366KB 인라인 + 무인증 postMessage 채널만 남기므로 적출.
const plugins = [react(), tailwindcss(), jsxLocPlugin(), vitePluginDevDebugCollector(), vitePluginSiteRobots()];

export default defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    host: true,
    // Manus VM 호스트 5종 제거(v24) — Manus 비주얼 에디터를 쓰지 않게 되면서
    // 이 dev 서버를 외부 VM 도메인으로 열어둘 이유가 사라졌다. 로컬만 허용한다.
    allowedHosts: ["localhost", "127.0.0.1"],
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
