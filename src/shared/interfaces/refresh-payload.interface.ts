export interface RefreshPayload {
  sub: string;
  email: string;
  refreshToken?: string;
  iat?: number; // issued at timestamp
}
