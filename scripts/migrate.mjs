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

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("[migrate] DATABASE_URL 이 설정되지 않았습니다. 마이그레이션을 중단합니다.");
  process.exit(1);
}

let connection;
try {
  connection = await mysql.createConnection(url);
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
