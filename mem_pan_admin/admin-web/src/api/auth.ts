import { apiClient } from "./client";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginUser {
  userId: string;
  username: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  role: string;
  emailVerified: boolean;
  createdAt: string;
}

export interface LoginResponse {
  tokenId?: string;
  token?: string;
  accessToken?: string;
  refreshToken?: string;
  accessTokenExpiresAt?: string;
  refreshTokenExpiresAt?: string;
  user?: LoginUser;
  data?: {
    accessToken?: string;
    refreshToken?: string;
  };
}

/**
 * Calls the Auth Service login endpoint via the API gateway.
 * Returns the raw response data containing the token and user info.
 */
export const loginUser = async (credentials: LoginRequest): Promise<LoginResponse> => {
  const response = await apiClient.post<LoginResponse>(
    "/v1/auth/login",
    credentials,
  );
  return response.data;
};

/**
 * Extract the access token from various response formats.
 */
export function extractAccessToken(data: LoginResponse): string | null {
  return data.accessToken || data.token || data.data?.accessToken || null;
}

/**
 * Extract the user role from the login response.
 */
export function extractUserRole(data: LoginResponse): string | null {
  return data.user?.role || null;
}
