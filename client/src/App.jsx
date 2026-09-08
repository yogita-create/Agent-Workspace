import { useEffect, useState } from "react";
import {
  Routes,
  Route,
  useNavigate,
  useLocation,
} from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import ProjectDetails from "./components/ProjectDetails";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import Projects from "./components/Projects";
import Tasks from "./components/Tasks";
import Alerts from "./components/Alerts";
import ChatPanel from "./components/ChatPanel";
import Settings from "./components/Settings";

import "./App.css";

const API_URL = "http://localhost:5000";

function App() {
  const navigate = useNavigate();
  const location = useLocation();

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
      const response = await fetch(`${API_URL}/api/chat/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to create session: ${response.status}`);
      }

      const data = await response.json();

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
      location.pathname === "/login" || location.pathname === "/register";

    if (isAuthPage) {
      setLoadingSession(false);
      return;
    }

    const loadInitialSession = async () => {
      try {
        setLoadingSession(true);

        const response = await fetch(`${API_URL}/api/chat/sessions`);

        if (!response.ok) {
          throw new Error(`Failed to load sessions: ${response.status}`);
        }

        const data = await response.json();

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
  }, []);

  // ==========================================
  // MAIN UI
  // ==========================================

  const isAuthPage =
    location.pathname === "/login" || location.pathname === "/register";

  return (
    <div className="app">
      {/* ======================================
          LEFT SIDEBAR
      ====================================== */}
      {!isAuthPage && (
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
      )}

      {/* ======================================
          MAIN CONTENT
      ====================================== */}
      <main className="main-content">
        <Routes>
          {/* DASHBOARD */}
          <Route
            path="/"
            element={<Dashboard onNavigate={handleNavigate} />}
          />

          {/* PROJECT LIST */}
          <Route path="/projects" element={<Projects />} />

          {/* PROJECT DETAILS */}
          <Route path="/projects/:projectId" element={<ProjectDetails />} />

          {/* AI AGENT */}
          <Route
            path="/ai-agent"
            element={
              loadingSession ? (
                <div className="page-loading">Loading Workspace Bot...</div>
              ) : (
                <ChatPanel
                  key={chatResetKey}
                  sessionId={sessionId}
                />
              )
            }
          />

          {/* TASKS */}
          <Route path="/tasks" element={<Tasks />} />

          {/* ALERTS */}
          <Route path="/alerts" element={<Alerts onNavigate={handleNavigate} />} />

          {/* SETTINGS */}
          <Route
            path="/settings"
            element={
              <Settings
                currentTheme={theme}
                onThemeChange={handleThemeChange}
              />

            }
          />
          {/* LOGIN */}
          <Route path="/login" element={<Login />} />

          {/* REGISTER */}
          <Route path="/register" element={<Register />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;