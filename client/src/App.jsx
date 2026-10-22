import { useEffect, useState } from "react";
import {
  Routes,
  Route,
  useNavigate,
  useLocation,
  Navigate,
} from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import AcceptInvite from "./pages/AcceptInvite";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./context/AuthContext";
import ProjectDetails from "./components/ProjectDetails";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import Projects from "./components/Projects";
import Tasks from "./components/Tasks";
import Alerts from "./components/Alerts";
import ChatPanel from "./components/ChatPanel";
import Settings from "./components/Settings";
import Calendar from "./components/Calendar";
import TeamManagement from "./components/TeamManagement";
import axiosInstance from "./api/axiosInstance";

import "./App.css";

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const { loading: authLoading } = useAuth();

  // ==========================================
  // THEME MANAGEMENT (DARK / LIGHT / SYSTEM)
  // ==========================================

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("agent_workspace_theme") || "light";
  });

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem("agent_workspace_theme", newTheme);

    if (newTheme === "system") {
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      document.documentElement.setAttribute(
        "data-theme",
        prefersDark ? "dark" : "light"
      );
    } else {
      document.documentElement.setAttribute("data-theme", newTheme);
    }
  };

  useEffect(() => {
    handleThemeChange(theme);
  }, []);

  // Listen for OS theme changes if on system mode
  useEffect(() => {
    if (theme !== "system") return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e) => {
      document.documentElement.setAttribute(
        "data-theme",
        e.matches ? "dark" : "light"
      );
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  // ==========================================
  // ACTIVE PAGE
  // ==========================================

  const [activePage, setActivePage] = useState("dashboard");

  // ==========================================
  // CHAT SESSION STATE
  // ==========================================

  const [sessionId, setSessionId] = useState(null);
  const [chatResetKey, setChatResetKey] = useState(0);
  const [refreshChats, setRefreshChats] = useState(0);
  const [loadingSession, setLoadingSession] = useState(true);

  // ==========================================
  // UPDATE ACTIVE PAGE BASED ON URL
  // ==========================================

  useEffect(() => {
    const path = location.pathname;

    if (path.startsWith("/projects/")) {
      setActivePage("projects");
    } else if (path === "/projects") {
      setActivePage("projects");
    } else if (path === "/ai-agent") {
      setActivePage("ai-agent");
    } else if (path === "/tasks") {
      setActivePage("tasks");
    } else if (path === "/alerts") {
      setActivePage("alerts");
    } else if (path === "/calendar") {
      setActivePage("calendar");
    } else if (path === "/team") {
      setActivePage("team");
    } else if (path === "/settings") {
      setActivePage("settings");
    } else {
      setActivePage("dashboard");
    }
  }, [location.pathname]);

  // ==========================================
  // NAVIGATION
  // ==========================================

  const handleNavigate = (page) => {
    setActivePage(page);

    switch (page) {
      case "dashboard":
        navigate("/");
        break;

      case "projects":
        navigate("/projects");
        break;

      case "ai-agent":
        navigate("/ai-agent");
        break;

      case "tasks":
        navigate("/tasks");
        break;

      case "alerts":
        navigate("/alerts");
        break;

      case "calendar":
        navigate("/calendar");
        break;

      case "team":
        navigate("/team");
        break;

      case "settings":
        navigate("/settings");
        break;

      default:
        navigate("/");
    }
  };

  // ==========================================
  // CREATE NEW CHAT SESSION
  // ==========================================

  const createNewSession = async () => {
    try {
      const response = await axiosInstance.post("/api/chat/sessions");
      const data = response.data;

      if (data.success && data.session) {
        setSessionId(data.session._id);
        setChatResetKey((prev) => prev + 1);
        setRefreshChats((prev) => prev + 1);
        navigate("/ai-agent");
      }
    } catch (error) {
      console.error("Create session error:", error);
    }
  };

  // ==========================================
  // SELECT EXISTING CHAT
  // ==========================================

  const selectSession = (id) => {
    if (!id) return;
    setSessionId(id);
    setChatResetKey((prev) => prev + 1);
    navigate("/ai-agent");
  };

  // ==========================================
  // LOAD INITIAL CHAT SESSION
  // ==========================================

  useEffect(() => {
    let ignore = false;

    const isAuthPage =
      location.pathname.startsWith("/login") ||
      location.pathname.startsWith("/register") ||
      location.pathname.startsWith("/accept-invite");

    if (isAuthPage) {
      setLoadingSession(false);
      return;
    }

    if (authLoading) {
      return;
    }

    const loadInitialSession = async () => {
      try {
        setLoadingSession(true);

        const response = await axiosInstance.get("/api/chat/sessions");
        const data = response.data;

        if (ignore) return;

        if (data.success && data.sessions && data.sessions.length > 0) {
          setSessionId(data.sessions[0]._id);
        } else {
          await createNewSession();
        }
      } catch (error) {
        if (!ignore) {
          console.error("Load initial session error:", error);
        }
      } finally {
        if (!ignore) {
          setLoadingSession(false);
        }
      }
    };

    loadInitialSession();

    return () => {
      ignore = true;
    };
  }, [authLoading]);

  // ==========================================
  // MAIN UI
  // ==========================================

  const isAuthPage =
    location.pathname.startsWith("/login") ||
    location.pathname.startsWith("/register") ||
    location.pathname.startsWith("/accept-invite");

  // Render standalone auth pages (no Sidebar, no main-content wrapper)
  if (isAuthPage) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/accept-invite/:token" element={<AcceptInvite />} />
      </Routes>
    );
  }

  return (
    <div className="app">
      {/* ======================================
          LEFT SIDEBAR
      ====================================== */}
      <Sidebar
        activePage={activePage}
        onNavigate={handleNavigate}
        onNewChat={createNewSession}
        onSelectSession={selectSession}
        activeSessionId={sessionId}
        refreshChats={refreshChats}
        currentTheme={theme}
        onThemeChange={handleThemeChange}
      />

      {/* ======================================
          MAIN CONTENT
      ====================================== */}
      <main className="main-content">
        <Routes>
          {/* DASHBOARD */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard onNavigate={handleNavigate} />
              </ProtectedRoute>
            }
          />

          {/* PROJECT LIST */}
          <Route
            path="/projects"
            element={
              <ProtectedRoute>
                <Projects />
              </ProtectedRoute>
            }
          />

          {/* PROJECT DETAILS */}
          <Route
            path="/projects/:projectId"
            element={
              <ProtectedRoute>
                <ProjectDetails />
              </ProtectedRoute>
            }
          />

          {/* AI AGENT */}
          <Route
            path="/ai-agent"
            element={
              <ProtectedRoute>
                {loadingSession ? (
                  <div className="page-loading">Loading Workspace Bot...</div>
                ) : (
                  <ChatPanel
                    key={chatResetKey}
                    sessionId={sessionId}
                  />
                )}
              </ProtectedRoute>
            }
          />

          {/* TASKS */}
          <Route
            path="/tasks"
            element={
              <ProtectedRoute>
                <Tasks />
              </ProtectedRoute>
            }
          />

          {/* ALERTS */}
          <Route
            path="/alerts"
            element={
              <ProtectedRoute>
                <Alerts onNavigate={handleNavigate} />
              </ProtectedRoute>
            }
          />

          {/* CALENDAR */}
          <Route
            path="/calendar"
            element={
              <ProtectedRoute>
                <Calendar onNavigate={handleNavigate} />
              </ProtectedRoute>
            }
          />

          {/* TEAM & ACCESS */}
          <Route
            path="/team"
            element={
              <ProtectedRoute>
                <TeamManagement />
              </ProtectedRoute>
            }
          />

          {/* SETTINGS */}
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings
                  currentTheme={theme}
                  onThemeChange={handleThemeChange}
                />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
    </div>
  );
}

export default App;