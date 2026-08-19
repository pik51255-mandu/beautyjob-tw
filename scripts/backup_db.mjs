/**
 * 프로덕션 DB 스냅샷 (보안 감사 #15 / 적재 전 필수 절차)
 *
 * mysqldump --single-transaction 으로 일관된 스냅샷을 뜬 뒤 gzip 압축한다.
 * 레포 밖(~/beautyjob-data/backups)에 저장하며, 자격증명은 인자로 넘기지 않고
 * MYSQL_PWD 환경변수로 전달해 프로세스 목록에 노출되지 않게 한다.
 */
import { spawn } from "node:child_process";
import { createWriteStream, mkdirSync, statSync } from "node:fs";
import { createGzip } from "node:zlib";
import os from "node:os";
import path from "node:path";

const MYSQLDUMP = process.env.MYSQLDUMP_BIN || "/opt/homebrew/opt/mysql-client/bin/mysqldump";

const raw = process.env.DATABASE_URL;
if (!raw) {
  console.error("[backup] DATABASE_URL 이 없습니다.");
  process.exit(1);
}
const u = new URL(raw);
const outDir = process.env.BACKUP_DIR || path.join(os.homedir(), "beautyjob-data", "backups");
mkdirSync(outDir, { recursive: true });

const stamp = process.argv[2] || new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const outFile = path.join(outDir, `${stamp}.sql.gz`);

const args = [
  `--host=${u.hostname}`,
  `--port=${u.port || 3306}`,
  `--user=${decodeURIComponent(u.username)}`,
  "--single-transaction",
  "--skip-lock-tables",
  "--set-gtid-purged=OFF",
  "--ssl-mode=REQUIRED",
  u.pathname.replace(/^\//, ""),
];

console.log(`[backup] 스냅샷 시작 → ${outFile}`);
const child = spawn(MYSQLDUMP, args, {
  env: { ...process.env, MYSQL_PWD: decodeURIComponent(u.password) },
});
const gz = createGzip();
const out = createWriteStream(outFile);
child.stdout.pipe(gz).pipe(out);

let stderr = "";
child.stderr.on("data", (d) => { stderr += d.toString(); });

child.on("close", (code) => {
  out.on("close", () => {
    if (code !== 0) {
      console.error(`[backup] 실패 (exit ${code}): ${stderr.trim().slice(0, 300)}`);
      process.exit(1);
    }
    const size = statSync(outFile).size;
    if (size < 1024) {
      console.error(`[backup] 산출물이 비정상적으로 작습니다 (${size} bytes).`);
      process.exit(1);
    }
    console.log(`[backup] 완료: ${outFile} (${(size / 1024).toFixed(1)} KB)`);
  });
});
