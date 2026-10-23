import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  Sun,
  Moon,
  Laptop,
  Bell,
  Shield,
  User,
  Bot,
  Check,
  Sparkles,
  LogOut,
  Layers,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import axiosInstance from "../api/axiosInstance";
import "./Settings.css";

const normalizeTimezone = (tz) => {
  if (!tz || typeof tz !== "string") return "Asia/Kolkata";
  const cleaned = tz.replace(/\s*\(.*?\)\s*/g, "").trim();
  return cleaned || "Asia/Kolkata";
};

const CURATED_TIMEZONES = [
  { value: "Asia/Kolkata", label: "Asia/Kolkata (IST)" },
  { value: "America/New_York", label: "America/New_York (EST/EDT)" },
  { value: "America/Chicago", label: "America/Chicago (CST/CDT)" },
  { value: "America/Denver", label: "America/Denver (MST/MDT)" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles (PST/PDT)" },
  { value: "America/Toronto", label: "America/Toronto (EST/EDT)" },
  { value: "Europe/London", label: "Europe/London (GMT/BST)" },
  { value: "Europe/Paris", label: "Europe/Paris (CET/CEST)" },
  { value: "Europe/Berlin", label: "Europe/Berlin (CET/CEST)" },
  { value: "Asia/Dubai", label: "Asia/Dubai (GST)" },
  { value: "Asia/Singapore", label: "Asia/Singapore (SGT)" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo (JST)" },
  { value: "Asia/Hong_Kong", label: "Asia/Hong_Kong (HKT)" },
  { value: "Australia/Sydney", label: "Australia/Sydney (AEST/AEDT)" },
  { value: "Pacific/Auckland", label: "Pacific/Auckland (NZST)" },
  { value: "UTC", label: "UTC (Coordinated Universal Time)" },
];

const formatRole = (role) => {
  if (!role) return "Employee";
  switch (role.toLowerCase()) {
    case "admin":
      return "Admin";
    case "manager":
      return "Manager";
    case "employee":
      return "Employee";
    default:
      return role.charAt(0).toUpperCase() + role.slice(1);
  }
};

function Settings({ currentTheme, onThemeChange }) {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState(user?.name || "");
  const [timezone, setTimezone] = useState(() => normalizeTimezone(user?.timezone));
  const [userRole, setUserRole] = useState(user?.role || "employee");

  const [preferences, setPreferences] = useState({
    actionApproval: true,
    promptChips: true,
    notifyTaskAssigned: true,
    notifyDeadlines: true,
    notifyAiProposals: true,
    ...(user?.preferences || {}),
  });

  const [savingProfile, setSavingProfile] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState("");
  const [saveError, setSaveError] = useState("");
  const [dbStatus, setDbStatus] = useState("checking");

  const timezoneOptions = useMemo(() => {
    const list = [...CURATED_TIMEZONES];
    const current = normalizeTimezone(timezone);
    if (current && !list.some((opt) => opt.value === current)) {
      list.unshift({ value: current, label: current });
    }
    return list;
  }, [timezone]);

  // Load current user and database health from server on mount
  useEffect(() => {
    let isMounted = true;

    const loadUserData = async () => {
      try {
        const res = await axiosInstance.get("/api/auth/me");
        if (res.data?.success && res.data?.user && isMounted) {
          const u = res.data.user;
          setUser(u);
          setDisplayName(u.name || "");
          setTimezone(normalizeTimezone(u.timezone));
          setUserRole(u.role || "employee");
          if (u.preferences) {
            setPreferences((prev) => ({
              ...prev,
              ...u.preferences,
            }));
          }
        }
      } catch (err) {
        console.error("Failed to load user settings from server:", err);
      }
    };

    const checkDatabaseHealth = async () => {
      try {
        const res = await axiosInstance.get("/api/health");
        if (res.data?.status === "ok" && isMounted) {
          setDbStatus("connected");
        } else if (isMounted) {
          setDbStatus("unreachable");
        }
      } catch {
        if (isMounted) setDbStatus("unreachable");
      }
    };

    loadUserData();
    checkDatabaseHealth();

    return () => {
      isMounted = false;
    };
  }, [setUser]);

  // Sync state if user in AuthContext changes
  useEffect(() => {
    if (user) {
      if (user.name) setDisplayName(user.name);
      if (user.timezone) setTimezone(normalizeTimezone(user.timezone));
      if (user.role) setUserRole(user.role);
      if (user.preferences) {
        setPreferences((prev) => ({
          ...prev,
          ...user.preferences,
        }));
      }
    }
  }, [user]);

  const handleProfileSave = async (e) => {
    e.preventDefault();

    if (!displayName || !displayName.trim()) {
      setSaveError("Display name is required.");
      setSaveSuccess("");
      return;
    }

    if (displayName.trim().length > 50) {
      setSaveError("Display name cannot exceed 50 characters.");
      setSaveSuccess("");
      return;
    }

    try {
      setSavingProfile(true);
      setSaveError("");
      setSaveSuccess("");

      const cleanTz = normalizeTimezone(timezone);

      const res = await axiosInstance.put("/api/auth/profile", {
        name: displayName.trim(),
        timezone: cleanTz,
      });

      if (res.data?.success && res.data?.user) {
        setUser(res.data.user);
        setDisplayName(res.data.user.name || "");
        setTimezone(normalizeTimezone(res.data.user.timezone));
        setSaveSuccess("Profile updated successfully!");
        setTimeout(() => setSaveSuccess(""), 4000);
      } else {
        throw new Error(res.data?.message || "Failed to update profile");
      }
    } catch (err) {
      console.error("Save profile error:", err);
      setSaveError(
        err.response?.data?.message ||
          err.message ||
          "Failed to save profile. Please try again."
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const handleTogglePreference = async (key) => {
    const previousVal = preferences[key] ?? true;
    const newVal = !previousVal;

    // Optimistic update
    const updated = { ...preferences, [key]: newVal };
    setPreferences(updated);
    if (user) {
      setUser({ ...user, preferences: updated });
    }

    try {
      const res = await axiosInstance.put("/api/auth/profile", {
        preferences: { [key]: newVal },
      });
      if (res.data?.success && res.data?.user) {
        setUser(res.data.user);
        setPreferences(res.data.user.preferences);
      }
    } catch (err) {
      console.error(`Toggle ${key} error:`, err);
      // Rollback
      const reverted = { ...preferences, [key]: previousVal };
      setPreferences(reverted);
      if (user) {
        setUser({ ...user, preferences: reverted });
      }
      setSaveError(
        err.response?.data?.message || `Failed to update ${key}. Reverted.`
      );
      setTimeout(() => setSaveError(""), 4000);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const themeOptions = [
    {
      id: "light",
      label: "Light Mode",
      desc: "Crisp & clean daytime view",
      icon: Sun,
    },
    {
      id: "dark",
      label: "Dark Mode",
      desc: "Sleek eye-friendly night theme",
      icon: Moon,
    },
    {
      id: "system",
      label: "System Mode",
      desc: "Match OS system preferences",
      icon: Laptop,
    },
  ];

  return (
    <div className="settings-page">
      {/* HEADER */}
      <header className="settings-header">
        <div>
          <h1>Workspace Settings</h1>
          <p>
            Customize your workspace appearance, account, notifications, and AI
            preferences.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {saveSuccess && (
            <div className="save-toast">
              <Check size={16} /> {saveSuccess}
            </div>
          )}
          {saveError && (
            <div className="settings-error-banner">
              <AlertTriangle size={16} /> {saveError}
            </div>
          )}
        </div>
      </header>

      {/* 2-COLUMN BALANCED RESPONSIVE GRID */}
      <div className="settings-layout-grid">
        {/* ==========================================
            LEFT COLUMN: THEME, AI, NOTIFICATIONS
        ========================================== */}
        <div className="settings-column">
          {/* 1. APPEARANCE & THEME (DO NOT TOUCH THEME FUNCTIONALITY) */}
          <section className="settings-section">
            <div className="section-header">
              <div className="section-icon theme-icon">
                {currentTheme === "dark" ? (
                  <Moon size={20} />
                ) : (
                  <Sun size={20} />
                )}
              </div>
              <div>
                <h2>Appearance & Theme</h2>
                <p>Choose how Agent Workspace looks across all views.</p>
              </div>
            </div>

            <div className="theme-grid">
              {themeOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = currentTheme === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    className={`theme-card ${isSelected ? "active" : ""}`}
                    onClick={() => onThemeChange(opt.id)}
                  >
                    <div className="theme-card-preview">
                      <Icon size={24} className="theme-preview-icon" />
                      {isSelected && (
                        <span className="selected-badge">
                          <Check size={13} /> Active
                        </span>
                      )}
                    </div>
                    <div className="theme-card-info">
                      <strong>{opt.label}</strong>
                      <span>{opt.desc}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 2. AI WORKSPACE BOT PREFERENCES */}
          <section className="settings-section">
            <div className="section-header">
              <div className="section-icon ai-icon">
                <Bot size={20} />
              </div>
              <div>
                <h2>Workspace Bot (AI Assistant)</h2>
                <p>
                  Configure model orchestration and automated action proposals.
                </p>
              </div>
            </div>

            <div className="toggle-list">
              <div className="toggle-item">
                <div>
                  <strong>Active Engine</strong>
                  <p>High-precision reasoning and workspace automation engine</p>
                </div>
                <span className="model-chip">
                  <Sparkles size={14} /> Workspace AI Engine (Advanced)
                </span>
              </div>

              <div className="toggle-item">
                <div>
                  <strong>Action Approval Cards</strong>
                  <p>
                    Require interactive 1-click approval before mutating tasks
                  </p>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={preferences.actionApproval ?? true}
                    onChange={() => handleTogglePreference("actionApproval")}
                  />
                  <span className="slider"></span>
                </label>
              </div>

              <div className="toggle-item">
                <div>
                  <strong>Prompt Suggestion Chips</strong>
                  <p>
                    Show quick prompt chips for frequent questions in chat panel
                  </p>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={preferences.promptChips ?? true}
                    onChange={() => handleTogglePreference("promptChips")}
                  />
                  <span className="slider"></span>
                </label>
              </div>
            </div>
          </section>

          {/* 3. NOTIFICATIONS */}
          <section className="settings-section">
            <div className="section-header">
              <div className="section-icon notif-icon">
                <Bell size={20} />
              </div>
              <div>
                <h2>Notifications & Alerts</h2>
                <p>
                  Stay updated on deadlines, task assignments, and overdue
                  warnings.
                </p>
              </div>
            </div>

            <div className="toggle-list">
              <div className="toggle-item">
                <div>
                  <strong>Task Assigned Alerts</strong>
                  <p>Notify me when a teammate assigns a task to my name</p>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={preferences.notifyTaskAssigned ?? true}
                    onChange={() =>
                      handleTogglePreference("notifyTaskAssigned")
                    }
                  />
                  <span className="slider"></span>
                </label>
              </div>

              <div className="toggle-item">
                <div>
                  <strong>Deadline Reminders</strong>
                  <p>
                    Receive notifications for tasks due today or approaching
                    deadlines
                  </p>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={preferences.notifyDeadlines ?? true}
                    onChange={() => handleTogglePreference("notifyDeadlines")}
                  />
                  <span className="slider"></span>
                </label>
              </div>

              <div className="toggle-item">
                <div>
                  <strong>AI Action Proposals</strong>
                  <p>
                    Alert when Workspace Bot drafts pending changes for review
                  </p>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={preferences.notifyAiProposals ?? true}
                    onChange={() => handleTogglePreference("notifyAiProposals")}
                  />
                  <span className="slider"></span>
                </label>
              </div>
            </div>
          </section>
        </div>

        {/* ==========================================
            RIGHT COLUMN: PROFILE & ACCOUNT, SYSTEM INFO
        ========================================== */}
        <div className="settings-column">
          {/* 4. USER PROFILE & ACCOUNT */}
          <section className="settings-section profile-card-section">
            <div className="section-header">
              <div className="section-icon profile-icon">
                <User size={20} />
              </div>
              <div>
                <h2>User Profile & Account</h2>
                <p>Manage your account identity and role in the workspace.</p>
              </div>
            </div>

            {/* Profile Avatar Badge */}
            <div className="profile-identity-banner">
              <div className="profile-big-avatar">
                {displayName ? displayName.charAt(0).toUpperCase() : "U"}
              </div>
              <div className="profile-identity-info">
                <h3>{displayName || user?.name || "User"}</h3>
                <p>{user?.email || ""}</p>
                <span className="profile-role-tag">{formatRole(userRole)}</span>
              </div>
            </div>

            <form onSubmit={handleProfileSave} className="settings-form">
              <div className="form-grid">
                <div className="form-group">
                  <label>Display Name *</label>
                  <input
                    type="text"
                    value={displayName}
                    maxLength={50}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                    disabled={savingProfile}
                  />
                </div>

                <div className="form-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    value={user?.email || ""}
                    readOnly
                    disabled
                    title="Email cannot be modified"
                  />
                </div>

                <div className="form-group">
                  <label>Role</label>
                  <input
                    type="text"
                    value={formatRole(userRole)}
                    readOnly
                    disabled
                    title="Role is assigned by your organization administrator"
                  />
                </div>

                <div className="form-group">
                  <label>Timezone</label>
                  <select
                    value={normalizeTimezone(timezone)}
                    onChange={(e) => setTimezone(normalizeTimezone(e.target.value))}
                    disabled={savingProfile}
                  >
                    {timezoneOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="profile-action-buttons">
                <button
                  type="submit"
                  className="save-btn"
                  disabled={savingProfile || !displayName.trim()}
                >
                  {savingProfile ? "Saving..." : "Save Changes"}
                </button>

                <button
                  type="button"
                  className="settings-logout-btn"
                  onClick={handleLogout}
                  title="Sign out of Agent Workspace"
                >
                  <LogOut size={16} />
                  <span>Log Out</span>
                </button>
              </div>
            </form>
          </section>

          {/* 5. ACTIVE WORKSPACES & TENANCY */}
          <section className="settings-section">
            <div className="section-header">
              <div className="section-icon workspace-icon">
                <Layers size={20} />
              </div>
              <div>
                <h2>Active Workspace</h2>
                <p>Multi-tenant organization & collaborative access</p>
              </div>
            </div>

            <div className="workspace-status-card">
              <div className="workspace-status-left">
                <div className="ws-icon-circle">🏢</div>
                <div>
                  <strong>Agent Workspace Multi-Tenant</strong>
                  <p>
                    Role:{" "}
                    <span className="ws-role-pill">
                      {formatRole(userRole)}
                    </span>
                  </p>
                </div>
              </div>
              <span className="ws-active-badge">
                <CheckCircle2 size={14} /> Active
              </span>
            </div>
          </section>

          {/* 6. SYSTEM INFORMATION */}
          <section className="settings-section system-info">
            <div className="section-header">
              <div className="section-icon info-icon">
                <Shield size={20} />
              </div>
              <div>
                <h2>System Information</h2>
                <p>Agent Workspace Platform Details</p>
              </div>
            </div>

            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Platform Version</span>
                <span className="info-value">v1.2.0-pro</span>
              </div>
              <div className="info-item">
                <span className="info-label">AI Engine</span>
                <span className="info-value">Workspace Bot AI Core</span>
              </div>
              <div className="info-item">
                <span className="info-label">Database Status</span>
                <span
                  className={`info-value ${
                    dbStatus === "connected"
                      ? "status-online"
                      : dbStatus === "checking"
                      ? "status-checking"
                      : "status-offline"
                  }`}
                >
                  ●{" "}
                  {dbStatus === "connected"
                    ? "Connected"
                    : dbStatus === "checking"
                    ? "Checking..."
                    : "Unreachable"}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Environment</span>
                <span className="info-value">Production / Hybrid</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default Settings;
