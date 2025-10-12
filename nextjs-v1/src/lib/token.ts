// Token management for API authentication

// For development hardcoded token - in production this would come from authentication flow
const DEFAULT_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2N2ViZTQ1ZGU5NGI1MDE1NDBkZGVjNzgiLCJpYXQiOjE3NDQxMjM2NjYsImV4cCI6MTc0NDcyODQ2Nn0.Hyqlk78MCNK0x6iiDmSumlxr5KmJJbKxpsa4n-7NtK4";

// Token storage key
export const TOKEN_KEY = "auth_token";

/**
 * Get the authentication token
 */
export function getToken(): string {
  // For server-side rendering, return the default token
  if (typeof window === "undefined") {
    // if (true) {
    return DEFAULT_TOKEN;
  }

  // For client-side, try to get from localStorage or use default
  const token = localStorage.getItem(TOKEN_KEY)?.trim();
  console.log("Getting Token from localStorage:", token);
  return token || DEFAULT_TOKEN;
}

/**
 * Save the authentication token
 */
export function saveToken(token: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(TOKEN_KEY, token.trim());
  }
}

/**
 * Clear the authentication token
 */
export function clearToken(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export default {
  getToken,
  saveToken,
  clearToken,
};
