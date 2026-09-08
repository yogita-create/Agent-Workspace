import { createContext, useContext, useState, useEffect, useCallback } from "react";
import axiosInstance, { setAccessToken as setGlobalAccessToken } from "../api/axiosInstance";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Store accessToken in memory only (never localStorage/sessionStorage)
  const [accessToken, setAccessTokenState] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Helper to sync token in state and axiosInstance module variable
  const updateToken = useCallback((token) => {
    setAccessTokenState(token);
    setGlobalAccessToken(token);
  }, []);

  // ==========================================
  // SILENT SESSION RESTORE ON APP LOAD
  // Reads httpOnly refreshToken cookie via /api/auth/refresh
  // ==========================================
  const restoreSession = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.post("/api/auth/refresh");

      if (response.data?.success && response.data?.accessToken) {
        updateToken(response.data.accessToken);
        setUser(response.data.user || null);
      } else {
        updateToken(null);
        setUser(null);
      }
    } catch {
      // Refresh cookie absent, expired, or invalid
      updateToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [updateToken]);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  // ==========================================
  // LOGIN
  // ==========================================
  const login = async (email, password) => {
    try {
      const response = await axiosInstance.post("/api/auth/login", {
        email,
        password,
      });

      if (response.data?.success && response.data?.accessToken) {
        updateToken(response.data.accessToken);
        setUser(response.data.user || null);
        return { success: true, user: response.data.user };
      }

      return {
        success: false,
        message: response.data?.message || "Invalid credentials",
      };
    } catch (error) {
      const message =
        error.response?.data?.message || "Invalid credentials";
      return { success: false, message };
    }
  };

  // ==========================================
  // REGISTER
  // ==========================================
  const register = async (name, email, password) => {
    try {
      const response = await axiosInstance.post("/api/auth/register", {
        name,
        email,
        password,
      });

      if (response.data?.success && response.data?.accessToken) {
        updateToken(response.data.accessToken);
        setUser(response.data.user || null);
        return { success: true, user: response.data.user };
      }

      return {
        success: false,
        message: response.data?.message || "Registration failed",
      };
    } catch (error) {
      const message =
        error.response?.data?.message || "Registration failed";
      return { success: false, message };
    }
  };

  // ==========================================
  // LOGOUT
  // ==========================================
  const logout = async () => {
    try {
      await axiosInstance.post("/api/auth/logout");
    } catch (error) {
      console.error("Logout request error:", error);
    } finally {
      updateToken(null);
      setUser(null);
    }
  };

  const value = {
    user,
    accessToken,
    loading,
    isAuthenticated: Boolean(accessToken && user),
    login,
    register,
    logout,
    restoreSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export default AuthContext;
