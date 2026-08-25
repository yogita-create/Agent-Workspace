import { useEffect, useState } from "react";
import {
  Routes,
  Route,
  useNavigate,
  useLocation,
} from "react-router-dom";

import ProjectDetails from "./components/ProjectDetails";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import Projects from "./components/Projects";
import ChatPanel from "./components/ChatPanel";
import Tasks from "./components/Tasks";
import Calendar from "./components/Calendar";
import Alerts from "./components/alerts";


import "./App.css";

const API_URL = "http://localhost:5000";

function App() {
  const navigate = useNavigate();
  const location = useLocation();

  // ==========================================
  // ACTIVE PAGE
  // ==========================================

  const [activePage, setActivePage] = useState("dashboard");

  // ==========================================
  // CHAT SESSION STATE
  // ==========================================

  const [sessionId, setSessionId] = useState(null);

  const [chatResetKey, setChatResetKey] =
    useState(0);

  const [refreshChats, setRefreshChats] =
    useState(0);

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
    console.log("Navigating to:", page);

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

      default:
        navigate("/");
    }
  };


  // ==========================================
  // CREATE NEW CHAT SESSION
  // ==========================================

  const createNewSession = async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/chat/sessions`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to create session: ${response.status}`
        );
      }

      const data = await response.json();

      if (data.success && data.session) {
        setSessionId(data.session._id);

        // Force ChatPanel reload
        setChatResetKey(
          (prev) => prev + 1
        );

        // Refresh chat sidebar
        setRefreshChats(
          (prev) => prev + 1
        );

        // Open AI Agent page
        navigate("/ai-agent");

        console.log(
          "New session created:",
          data.session._id
        );
      }
    } catch (error) {
      console.error(
        "Create session error:",
        error
      );
    }
  };


  // ==========================================
  // SELECT EXISTING CHAT
  // ==========================================

  const selectSession = (id) => {
    if (!id) return;

    console.log(
      "Selected session:",
      id
    );

    setSessionId(id);

    // Reload ChatPanel
    setChatResetKey(
      (prev) => prev + 1
    );

    // Open AI Agent
    navigate("/ai-agent");
  };


  // ==========================================
  // LOAD INITIAL CHAT SESSION
  // ==========================================

  useEffect(() => {
    let ignore = false;

    const loadInitialSession = async () => {
      try {
        const response = await fetch(
          `${API_URL}/api/chat/sessions`
        );

        if (!response.ok) {
          throw new Error(
            `Failed to load sessions: ${response.status}`
          );
        }

        const data =
          await response.json();

        if (ignore) return;

        if (
          data.success &&
          data.sessions &&
          data.sessions.length > 0
        ) {
          // Open latest session

          const latestSession =
            data.sessions[0];

          setSessionId(
            latestSession._id
          );

          console.log(
            "Opening existing session:",
            latestSession._id
          );
        } else {
          // No chat exists
          // Create first session

          await createNewSession();
        }
      } catch (error) {
        if (!ignore) {
          console.error(
            "Load initial session error:",
            error
          );
        }
      } finally {
        // ChatPanel manages its own loading state and remains available
        // even if this optional initial-session lookup is delayed.
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

  return (
    <div className="app">

      {/* ======================================
          LEFT SIDEBAR
      ====================================== */}

      <Sidebar
        activePage={activePage}

        onNavigate={
          handleNavigate
        }

        onNewChat={
          createNewSession
        }

        onSelectSession={
          selectSession
        }

        activeSessionId={
          sessionId
        }

        refreshChats={
          refreshChats
        }
      />

      {/* ======================================
          MAIN CONTENT
      ====================================== */}

      <main className="main-content">

        <Routes>

          {/* ==================================
              DASHBOARD
          ================================== */}

          <Route
            path="/"
            element={
              <Dashboard
                onNavigate={
                  handleNavigate
                }
              />
            }
          />

         


          {/* ==================================
              PROJECT LIST
          ================================== */}

          <Route
            path="/projects"
            element={
              <Projects />
            }
          />

          {/* ==================================
              PROJECT DETAILS
          ================================== */}

          <Route
            path="/projects/:projectId"
            element={
              <ProjectDetails />
            }
          />

          {/* ==================================
              AI AGENT
          ================================== */}

          <Route
            path="/ai-agent"
            element={
              <ChatPanel
                key={chatResetKey}
              />
            }
          />

          {/* ==================================
              TASKS
          ================================== */}

          <Route
            path="/tasks"
            element={<Tasks />}
          />

          {/* ==================================
              ALERTS
          ================================== */}
          <Route
            path="/alerts"
            element={<Alerts/>}
          />

          {/* ==================================
              SETTINGS
          ================================== */}

                    <Route
            path="/calendar"
            element={<Calendar />}
          />
              
        </Routes>

      </main>

    </div>
  );
}

export default App;
