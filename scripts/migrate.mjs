/**
 * 부팅 시 자동 마이그레이션 (D-3)
 *
 * 프로덕션 start 경로에서 실행된다. drizzle-kit(devDependency)은 Render 런타임에 없을 수 있으므로
 * 프로덕션 의존성(drizzle-orm, mysql2)만 사용한다.
 *
 * 마이그레이터는 __drizzle_migrations 마지막 행의 created_at 만 비교하므로,
 * 베이스라인이 최신이면 아무것도 적용하지 않고 즉시 종료한다.
 */
import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";

// 보안 감사 #2: 프로덕션 start 경로의 첫 단계이므로 여기서도 시크릿을 검증한다.
const MIN_SECRET_LENGTH = 32;
const jwtSecret = process.env.JWT_SECRET ?? "";
if (!jwtSecret) {
  console.error("[보안] JWT_SECRET 이 설정되지 않았습니다. 기동을 중단합니다.");
  process.exit(1);
}
if (jwtSecret.length < MIN_SECRET_LENGTH) {
  console.error(`[보안] JWT_SECRET 이 너무 짧습니다 (${jwtSecret.length}자). 최소 ${MIN_SECRET_LENGTH}자 필요.`);
  process.exit(1);
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("[migrate] DATABASE_URL 이 설정되지 않았습니다. 마이그레이션을 중단합니다.");
  process.exit(1);
}

let connection;
try {
  // 보안 감사 #12: ssl 옵션을 명시해 전송 구간 암호화를 강제한다.
  const u = new URL(url);
  const ca = process.env.DATABASE_CA_CERT;
  connection = await mysql.createConnection({
    host: u.hostname,
    port: Number(u.port || 3306),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, ""),
    ssl: ca ? { ca, rejectUnauthorized: true } : { rejectUnauthorized: false },
  });
  const db = drizzle(connection);
  console.log("[migrate] 마이그레이션 검사 시작 (folder=./drizzle)");
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("[migrate] 완료 — 적용할 마이그레이션 없음 또는 적용 성공");
} catch (error) {
  console.error("[migrate] 실패:", error?.message ?? error);
  if (error?.code) console.error("[migrate] code:", error.code);
  process.exit(1);
} finally {
  if (connection) await connection.end().catch(() => {});
}
