// ⚠️ 이름은 Manus지만 현행 인증의 코어다. 삭제 금지.
// sdk.ts가 이 타입에 의존하며, 이메일·LINE JWT 발급(routers.ts:701,738)과
// 전 요청 인증(context.ts:17)이 여기서 나온다. 파일명 변경은 별도 작업.
// WebDev Auth TypeScript types
// Auto-generated from protobuf definitions
// Generated on: 2025-09-24T05:57:57.338Z

export interface AuthorizeRequest {
  redirectUri: string;
  projectId: string;
  state: string;
  responseType: string;
  scope: string;
}

export interface AuthorizeResponse {
  redirectUrl: string;
}

export interface ExchangeTokenRequest {
  grantType: string;
  code: string;
  refreshToken?: string;
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
}

export interface ExchangeTokenResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  refreshToken?: string;
  scope: string;
  idToken: string;
}

export interface GetUserInfoRequest {
  accessToken: string;
}

export interface GetUserInfoResponse {
  openId: string;
  projectId: string;
  name: string;
  email?: string | null;
  platform?: string | null;
  loginMethod?: string | null;
}

export interface CanAccessRequest {
  openId: string;
  projectId: string;
}

export interface CanAccessResponse {
  canAccess: boolean;
}

export interface GetUserInfoWithJwtRequest {
  jwtToken: string;
  projectId: string;
}

export interface GetUserInfoWithJwtResponse {
  openId: string;
  projectId: string;
  name: string;
  email?: string | null;
  platform?: string | null;
  loginMethod?: string | null;
  /** Cron-only; references `schedule_task.uid`. */
  taskUid?: string | null;
}
