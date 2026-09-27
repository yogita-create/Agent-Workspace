import "./Sidebar.css";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard,
  FolderOpenDot,
  ListTodo,
  Bell,
  Bot,
  CalendarDays,
  Settings,
  Brain,
  Sun,
  Moon,
  LogOut,
} from "lucide-react";

function Sidebar({
  activePage,
  onNavigate,
  currentTheme,
  onThemeChange,
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const menuItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      id: "projects",
      label: "Projects",
      icon: FolderOpenDot,
    },
    {
      id: "tasks",
      label: "My Tasks",
      icon: ListTodo,
    },
    {
      id: "alerts",
      label: "Alerts",
      icon: Bell,
    },
    {
      id: "ai-agent",
      label: "Workspace Bot",
      icon: Bot,
      badge: "AI",
    },
    {
      id: "calendar",
      label: "Calendar",
      icon: CalendarDays,
    },
    {
      id: "settings",
      label: "Settings",
      icon: Settings,
    },
  ];

  const toggleTheme = () => {
    if (onThemeChange) {
      onThemeChange(currentTheme === "dark" ? "light" : "dark");
    }
  };

  const handleLogout = async (e) => {
    e.stopPropagation();
    try {
      await logout();
      navigate("/login");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  return (
    <aside className="sidebar">
      {/* =====================================
          LOGO
      ===================================== */}
      <div className="sidebar-logo">
        <div className="logo-brand" onClick={() => onNavigate("dashboard")}>
          <div className="logo-icon-wrap">
            <Brain size={22} />
          </div>
          <div>
            <h2>Agent Workspace</h2>
            <p>Project Hub</p>
          </div>
        </div>

        {/* Quick Theme Toggle */}
        <button
          type="button"
          className="theme-quick-toggle"
          onClick={toggleTheme}
          title={currentTheme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {currentTheme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
        </button>
      </div>

      {/* =====================================
          MAIN NAVIGATION
      ===================================== */}
      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;

          return (
            <button
              key={item.id}
              type="button"
              className={`sidebar-item ${isActive ? "active" : ""}`}
              onClick={() => onNavigate(item.id)}
            >
              <span className="nav-icon">
                <Icon size={19} />
              </span>

              <span className="nav-label">{item.label}</span>

              {item.badge && (
                <span className="nav-badge">{item.badge}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* =====================================
          AI BOT QUICK PROMO
      ===================================== */}
      <div className="sidebar-promo-card" onClick={() => onNavigate("ai-agent")}>
        <div className="promo-icon">
          <Bot size={18} />
        </div>
        <div className="promo-text">
          <strong>Workspace Bot</strong>
          <p>Ask anything about tasks & due dates</p>
        </div>
      </div>

      {/* =====================================
          USER SECTION & WORKING LOGOUT BUTTON
      ===================================== */}
      <div className="sidebar-user-container">
        <div className="sidebar-user" onClick={() => onNavigate("settings")} title="Open Settings">
          <div className="user-avatar">
            {user?.name ? user.name.charAt(0).toUpperCase() : "Y"}
          </div>

          <div className="user-details">
            <strong>{user?.name || "Yogita"}</strong>
            <small>{user?.email || "Lead Developer"}</small>
          </div>
        </div>

        <button
          type="button"
          className="sidebar-logout-btn"
          onClick={handleLogout}
          title="Sign out of account"
        >
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;