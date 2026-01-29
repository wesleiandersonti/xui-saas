export interface AuthUser {
  sub: number;
  tenantId: number;
  role: string;
  email: string;
  tokenUse: 'access' | 'refresh';
  jti?: string;
}
