import { AuthProvider } from "react-admin";
import { authService, LoginCredentials } from "./services/authService";

export const authProvider: AuthProvider = {
  // Called when the user attempts to log in
  login: async ({ username, password }: LoginCredentials) => {
    try {
      const user = await authService.login({ username, password });
      console.log("✅ Login successful:", user.username);
      return Promise.resolve();
    } catch (error) {
      console.error("❌ Login failed:", error);
      return Promise.reject(new Error("Invalid credentials"));
    }
  },

  // Called when the user clicks on the logout button
  logout: () => {
    authService.logout();
    console.log("👋 User logged out");
    return Promise.resolve();
  },

  // Called when the API returns an error
  checkError: async ({ status }: { status: number }) => {
    if (status === 401) {
      // For 401 errors, try to refresh token first
      try {
        console.log("🔄 Attempting token refresh due to 401 error");
        await authService.refreshToken();
        console.log("✅ Token refreshed successfully, continuing request");
        return Promise.resolve(); // Token refreshed, can continue
      } catch (error) {
        console.log("❌ Token refresh failed, logging out");
        authService.logout();
        return Promise.reject();
      }
    }

    if (status === 403) {
      // For 403 errors, immediately logout (permission denied)
      authService.logout();
      return Promise.reject();
    }

    return Promise.resolve();
  },

  // Called when the user navigates to a new location, to check for authentication
  checkAuth: () => {
    if (authService.isAuthenticated()) {
      return Promise.resolve();
    }
    return Promise.reject();
  },

  // Called when the user navigates to a new location, to check for permissions / roles
  getPermissions: () => {
    const user = authService.getCurrentUser();
    return user ? Promise.resolve(user.role) : Promise.reject();
  },

  // Optional: Get user identity
  getIdentity: () => {
    const user = authService.getCurrentUser();
    if (user) {
      return Promise.resolve({
        id: user.id,
        fullName: user.username,
        avatar: undefined,
      });
    }
    return Promise.reject();
  },
};

// Initialize auth service on app startup
authService.initialize();
