// Authentication service with JWT token management and refresh
export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
}

export interface User {
  id: string;
  username: string;
  role: string;
}

// Backend API response interfaces
interface LoginResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in?: number;
}

interface RefreshResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

class AuthService {
  private static readonly ACCESS_TOKEN_KEY = "auth_access_token";
  private static readonly REFRESH_TOKEN_KEY = "auth_refresh_token";
  private static readonly TOKEN_EXPIRY_KEY = "auth_token_expiry";
  private static readonly USER_KEY = "auth_user";

  private refreshTimer: NodeJS.Timeout | null = null;
  private warningTimer: NodeJS.Timeout | null = null;
  private sessionExpiredShown = false;

  // Event listeners for session state changes
  private listeners: Array<(event: "warning" | "expired" | "refreshed") => void> = [];

  onSessionEvent(listener: (event: "warning" | "expired" | "refreshed") => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private emit(event: "warning" | "expired" | "refreshed") {
    this.listeners.forEach((l) => l(event));
  }

  // Login with real backend API
  async login(credentials: LoginCredentials): Promise<User> {
    const apiUrl =
      import.meta.env.VITE_SIMPLE_REST_URL || "http://127.0.0.1:8000/fast";
    const loginUrl = `${apiUrl}/mobile/api/v1/react-admin/auth/login`;

    console.log("🔐 Attempting login to:", loginUrl);

    try {
      const response = await fetch(loginUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: credentials.username,
          password: credentials.password,
        }),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ detail: "Login failed" }));
        throw new Error(errorData.detail || `Login failed: ${response.status}`);
      }

      const loginResponse: LoginResponse = await response.json();
      console.log("✅ Login successful");

      // Extract token information
      const accessToken = `${loginResponse.token_type} ${loginResponse.access_token}`;
      const refreshToken = loginResponse.refresh_token || "";
      const expiresIn = loginResponse.expires_in || 3600; // Default to 1 hour
      const expiryTime = Date.now() + expiresIn * 1000;

      // Store tokens
      localStorage.setItem(AuthService.ACCESS_TOKEN_KEY, accessToken);
      localStorage.setItem(AuthService.REFRESH_TOKEN_KEY, refreshToken);
      localStorage.setItem(AuthService.TOKEN_EXPIRY_KEY, expiryTime.toString());

      // Create user object (you might want to get this from the token or a separate API call)
      const user: User = {
        id: credentials.username, // Use username as ID for now
        username: credentials.username,
        role: "admin", // Default role, could be extracted from JWT
      };

      localStorage.setItem(AuthService.USER_KEY, JSON.stringify(user));

      // Set up automatic token refresh
      this.scheduleTokenRefresh(expiresIn);

      return user;
    } catch (error) {
      console.error("❌ Login failed:", error);
      throw error instanceof Error ? error : new Error("Login failed");
    }
  }

  // Logout and clear all stored data
  logout(): void {
    localStorage.removeItem(AuthService.ACCESS_TOKEN_KEY);
    localStorage.removeItem(AuthService.REFRESH_TOKEN_KEY);
    localStorage.removeItem(AuthService.TOKEN_EXPIRY_KEY);
    localStorage.removeItem(AuthService.USER_KEY);

    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
    if (this.warningTimer) {
      clearTimeout(this.warningTimer);
      this.warningTimer = null;
    }
  }

  // Logout due to session expiry — emits event so UI can show a message
  handleSessionExpired(): void {
    if (this.sessionExpiredShown) return;
    this.sessionExpiredShown = true;
    this.emit("expired");
    this.logout();
  }

  // Get remaining session time in seconds
  getRemainingSeconds(): number {
    const expiry = localStorage.getItem(AuthService.TOKEN_EXPIRY_KEY);
    if (!expiry) return 0;
    return Math.max(0, Math.floor((parseInt(expiry, 10) - Date.now()) / 1000));
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    const token = this.getAccessToken();
    const expiry = localStorage.getItem(AuthService.TOKEN_EXPIRY_KEY);

    if (!token || !expiry) {
      return false;
    }

    const expiryTime = parseInt(expiry, 10);
    const now = Date.now();

    // Check if token is expired (with 5 minute buffer)
    return now < expiryTime - 5 * 60 * 1000;
  }

  // Get current access token
  getAccessToken(): string | null {
    return localStorage.getItem(AuthService.ACCESS_TOKEN_KEY);
  }

  // Get current user
  getCurrentUser(): User | null {
    const userStr = localStorage.getItem(AuthService.USER_KEY);
    if (!userStr) return null;

    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }

  // Refresh access token using real backend API
  async refreshToken(): Promise<void> {
    const refreshToken = localStorage.getItem(AuthService.REFRESH_TOKEN_KEY);

    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    const apiUrl =
      import.meta.env.VITE_SIMPLE_REST_URL || "http://127.0.0.1:8000/fast";
    const refreshUrl = `${apiUrl}/mobile/api/v1/react-admin/auth/refresh`;

    try {
      const response = await fetch(refreshUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${refreshToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to refresh token");
      }

      const refreshResponse: RefreshResponse = await response.json();

      // Extract token information
      const accessToken = `${refreshResponse.token_type} ${refreshResponse.access_token}`;
      const expiresIn = refreshResponse.expires_in || 3600; // Default to 1 hour
      const expiryTime = Date.now() + expiresIn * 1000;

      // Update stored tokens
      localStorage.setItem(AuthService.ACCESS_TOKEN_KEY, accessToken);
      localStorage.setItem(AuthService.TOKEN_EXPIRY_KEY, expiryTime.toString());

      // Schedule next refresh
      this.scheduleTokenRefresh(expiresIn);

      console.log("🔄 Token refreshed successfully");
    } catch (error) {
      console.error("❌ Token refresh failed:", error);
      throw error;
    }
  }

  // Schedule automatic token refresh and expiry warning
  private scheduleTokenRefresh(expiresIn: number): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }
    if (this.warningTimer) {
      clearTimeout(this.warningTimer);
    }
    this.sessionExpiredShown = false;

    // Refresh token 5 minutes before expiry
    const refreshTime = Math.max((expiresIn - 300) * 1000, 10000);

    // Warn user 2 minutes before expiry
    const warningTime = Math.max((expiresIn - 120) * 1000, 5000);

    this.warningTimer = setTimeout(() => {
      this.emit("warning");
    }, warningTime);

    this.refreshTimer = setTimeout(async () => {
      try {
        await this.refreshToken();
        this.emit("refreshed");
      } catch (error) {
        console.error("Failed to refresh token:", error);
        this.handleSessionExpired();
      }
    }, refreshTime);

    console.log(
      `🕐 Token refresh scheduled in ${Math.floor(refreshTime / 1000 / 60)} minutes`,
    );
  }

  // Initialize authentication (call on app startup)
  initialize(): void {
    if (this.isAuthenticated()) {
      const expiry = localStorage.getItem(AuthService.TOKEN_EXPIRY_KEY);
      if (expiry) {
        const expiryTime = parseInt(expiry, 10);
        const now = Date.now();
        const remainingTime = Math.floor((expiryTime - now) / 1000);

        if (remainingTime > 300) {
          // More than 5 minutes remaining
          this.scheduleTokenRefresh(remainingTime);
        } else {
          // Token expires soon, refresh immediately
          this.refreshToken().catch(() => {
            this.logout();
          });
        }
      }
    }
  }
}

export const authService = new AuthService();
