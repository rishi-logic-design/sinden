// src/context/AuthContext.jsx
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";

const AuthContext = createContext();

function safeJsonParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

// Decode a JWT payload (without validating). Returns payload object or null.
function decodeJwtPayload(token) {
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payload = parts[1];
    // base64url -> base64
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map(function (c) {
          return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join("")
    );
    return safeJsonParse(jsonPayload);
  } catch (e) {
    console.warn("JWT decode failed:", e);
    return null;
  }
}

export const AuthProvider = ({
  children,
  refreshIntervalMs = 14 * 60 * 1000,
}) => {
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem("token");
    } catch {
      return null;
    }
  });

  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const refreshTimeoutRef = useRef(null);
  const isAuthenticated = !!token;

  const saveToken = (newToken) => {
    try {
      if (newToken) localStorage.setItem("token", newToken);
      else localStorage.removeItem("token");
    } catch (err) {
      console.warn("localStorage error:", err);
    }
    setToken(newToken);
  };

  const saveUser = (u) => {
    try {
      if (u) localStorage.setItem("user", JSON.stringify(u));
      else localStorage.removeItem("user");
    } catch (err) {
      console.warn("localStorage user error:", err);
    }
    setUser(u);
  };

  const fetchProfileFromApi = async (providedToken) => {
    try {
      const resp = await fetch("http://localhost:5000/api/auth/me", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(providedToken
            ? { Authorization: `Bearer ${providedToken}` }
            : {}),
        },
        credentials: "include",
      });
      if (!resp.ok) return null;
      const data = await resp.json();
      return data?.user ?? data;
    } catch (e) {
      console.warn("fetchProfileFromApi failed:", e);
      return null;
    }
  };

  const populateUserFromTokenOrApi = async (theToken) => {
    if (!theToken) {
      saveUser(null);
      return null;
    }

    // ✅ FIRST: Try to get complete data from API
    const apiUser = await fetchProfileFromApi(theToken);
    if (apiUser) {
      saveUser(apiUser);
      return apiUser;
    }

    // ✅ FALLBACK: Decode from token (but this might have incomplete data)
    const payload = decodeJwtPayload(theToken);
    if (payload && (payload.role || payload.user || payload.email)) {
      // Normalize common payload shapes: payload.role or payload.user.role
      const maybeUser = payload.user
        ? payload.user
        : {
            id: payload.sub ?? payload.id,
            fullName: payload.name ?? payload.fullName ?? payload.username,
            name: payload.name ?? payload.fullName ?? payload.username,
            email: payload.email,
            role: payload.role,
          };
      console.log("⚠️ User data from token (fallback):", maybeUser);
      saveUser(maybeUser);
      return maybeUser;
    }

    saveUser(null);
    return null;
  };

  const refreshToken = async (silent = false) => {
    if (isRefreshing) {
      if (!silent) console.log("[Auth] Already refreshing, skipping...");
      return null;
    }

    setIsRefreshing(true);
    const baseUrl = "http://localhost:5000/api/auth";

    try {
      if (!silent) console.log("[Auth] Attempting token refresh...");

      let response = await fetch(`${baseUrl}/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({}),
      });

      if (
        !response.ok &&
        (response.status === 400 || response.status === 405)
      ) {
        if (!silent) console.log("[Auth] POST failed, trying GET method...");
        response = await fetch(`${baseUrl}/refresh`, {
          method: "GET",
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          credentials: "include",
        });
      }

      if (!response.ok && response.status === 400) {
        const storedRefreshToken = localStorage.getItem("refreshToken");
        if (storedRefreshToken) {
          if (!silent)
            console.log("[Auth] Trying with stored refresh token...");
          response = await fetch(`${baseUrl}/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ refreshToken: storedRefreshToken }),
          });
        }
      }

      const text = await response.text();
      let data = null;

      try {
        data = text ? JSON.parse(text) : null;
      } catch (e) {
        if (!silent) console.warn("[Auth] Response is not valid JSON:", text);
        data = { message: text };
      }

      if (!silent) {
        console.log("[Auth] Refresh response:", {
          status: response.status,
          statusText: response.statusText,
          data,
        });
      }

      if (response.ok && data) {
        const newToken = data.token || data.accessToken || data.access_token;
        const newRefreshToken = data.refreshToken || data.refresh_token;

        if (newToken) {
          saveToken(newToken);
          if (newRefreshToken) {
            localStorage.setItem("refreshToken", newRefreshToken);
          }
          // update user from refreshed token
          await populateUserFromTokenOrApi(newToken);
          if (!silent) console.log("[Auth] Token refreshed successfully");
          return newToken;
        } else {
          if (!silent)
            console.log("[Auth] Refresh succeeded but no token in response");
          return "refreshed";
        }
      } else {
        if (response.status === 400 || response.status === 401) {
          if (!silent) console.log("[Auth] No valid refresh token available");
        }

        if (token && (response.status === 401 || response.status === 403)) {
          saveToken(null);
          localStorage.removeItem("refreshToken");
          saveUser(null);
        }
        return null;
      }
    } catch (err) {
      if (!silent) console.error("[Auth] Refresh token network error:", err);
      return null;
    } finally {
      setIsRefreshing(false);
    }
  };

  // login expects token and optionally a user object (if backend returns user)
  const login = async (
    newToken,
    refreshTokenValue = null,
    userFromServer = null
  ) => {
    console.log("[Auth] Logging in with token");
    saveToken(newToken);

    if (refreshTokenValue) {
      localStorage.setItem("refreshToken", refreshTokenValue);
    }

    // populate user either from provided user object or token/api
    if (userFromServer) {
      saveUser(userFromServer);
    } else {
      await populateUserFromTokenOrApi(newToken);
    }

    if (refreshTimeoutRef.current) {
      clearInterval(refreshTimeoutRef.current);
    }

    refreshTimeoutRef.current = setInterval(() => {
      refreshToken(true);
    }, refreshIntervalMs);
  };

  const logout = async () => {
    if (refreshTimeoutRef.current) {
      clearInterval(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }

    try {
      await fetch("http://localhost:5000/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({}),
      });
    } catch (err) {
      console.warn("[Auth] Logout API call failed:", err);
    } finally {
      saveToken(null);
      localStorage.removeItem("refreshToken");
      saveUser(null);
    }
  };

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      const storedToken = localStorage.getItem("token");

      if (storedToken) {
        setToken(storedToken);
        // ✅ Always fetch fresh data from API on init
        await populateUserFromTokenOrApi(storedToken);
      }

      if (mounted) {
        setIsInitialized(true);
      }
    };

    initAuth();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (refreshTimeoutRef.current) {
      clearInterval(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }

    if (isAuthenticated && isInitialized) {
      refreshTimeoutRef.current = setInterval(() => {
        refreshToken(true);
      }, refreshIntervalMs);
    }

    return () => {
      if (refreshTimeoutRef.current) {
        clearInterval(refreshTimeoutRef.current);
      }
    };
  }, [isAuthenticated, isInitialized, refreshIntervalMs]);

  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === "token") {
        console.log("[Auth] Token changed in another tab");
        setToken(e.newValue);
      }
      if (e.key === "user") {
        try {
          setUser(JSON.parse(e.newValue));
        } catch {
          setUser(null);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearInterval(refreshTimeoutRef.current);
      }
    };
  }, []);

  const contextValue = {
    token,
    user, // <-- user object with role
    isAuthenticated,
    isRefreshing,
    isInitialized,
    login,
    logout,
    refreshToken,
    populateUserFromTokenOrApi,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
