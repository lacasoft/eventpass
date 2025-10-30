export interface RefreshPayload {
  sub: string;
  email: string;
  refreshToken?: string;
}
