/**
 * Authentication and Authorization Types
 */

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: 'free' | 'pro' | 'enterprise';
  created_at: number;
  updated_at: number;
}

export interface User {
  id: string;
  organization_id: string;
  email: string;
  name?: string;
  role: 'owner' | 'admin' | 'member';
  created_at: number;
  last_login_at?: number;
}

export interface UserWithPassword extends User {
  password_hash: string;
}

export interface ApiKey {
  id: string;
  user_id: string;
  organization_id: string;
  key_hash: string;
  name?: string;
  scopes: string[];
  last_used_at?: number;
  expires_at?: number;
  created_at: number;
}

export interface ApiKeyCreate {
  user_id: string;
  organization_id: string;
  name?: string;
  scopes: string[];
  expires_at?: number;
}

export interface RefreshToken {
  id: string;
  user_id: string;
  token: string;
  expires_at: number;
  created_at: number;
  revoked_at?: number;
}

export interface JwtPayload {
  sub: string; // user_id
  email: string;
  organization_id: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RegisterRequest {
  organization_name: string;
  organization_slug?: string;
  email: string;
  password: string;
  name?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface AuthResponse {
  user: Omit<User, 'password_hash'>;
  tokens: AuthTokens;
  organization: Organization;
}
