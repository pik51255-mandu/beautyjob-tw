/**
 * DB 접속 설정 빌더 (보안 감사 #12)
 *
 * DATABASE_URL 을 mysql2 에 문자열로 그대로 넘기면 쿼리스트링의 `ssl-mode=REQUIRED` 를
 * mysql2 가 인식하지 못해(기동 시 "Ignoring invalid configuration option" 경고) 평문으로 붙는다.
 * 실측 결과 Ssl_cipher 가 비어 있었으므로, ssl 옵션을 코드에서 명시한다.
 *
 * 1단계: rejectUnauthorized:false — 전송 구간 암호화는 성립하나 CA 검증은 하지 않는다.
 * 2단계(후속): Aiven 콘솔의 ca.pem 을 DATABASE_CA_CERT 로 주입하면 CA 고정까지 적용된다.
 */
export type DbConnectionConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  ssl: { rejectUnauthorized: boolean; ca?: string };
};

export function buildDbConfig(rawUrl: string): DbConnectionConfig {
  const url = new URL(rawUrl);
  const ca = process.env.DATABASE_CA_CERT;
  return {
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
    // ca 가 주입되면 CA 고정, 아니면 암호화만 성립시킨다.
    ssl: ca ? { ca, rejectUnauthorized: true } : { rejectUnauthorized: false },
  };
}
