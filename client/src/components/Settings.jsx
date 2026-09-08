import { useState } from "react";
import { Sun, Moon, Laptop, Bell, Shield, User, Bot, Check, Sparkles } from "lucide-react";
import "./Settings.css";

function Settings({ currentTheme, onThemeChange }) {
  const [profile, setProfile] = useState({
    name: "Yogita",
    email: "yogita@example.com",
    role: "Lead Developer",
    timezone: "Asia/Kolkata (IST)",
  });

  const [notifications, setNotifications] = useState({
    taskAssigned: true,
    deadlineReminders: true,
    agentProposals: true,
    weeklyDigest: false,
  });

  const [agentSettings, setAgentSettings] = useState({
    defaultModel: "Workspace AI Engine (Advanced)",
    autoSuggest: true,
    showActionCards: true,
  });

  const [savedAlert, setSavedAlert] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setSavedAlert(true);
    setTimeout(() => setSavedAlert(false), 3000);
  };

  const themeOptions = [
    {
      id: "light",
      label: "Light Mode",
      desc: "Clean & crisp daytime view",
      icon: Sun,
    },
    {
      id: "dark",
      label: "Dark Mode",
      desc: "Sleek, eye-friendly night look",
      icon: Moon,
    },
    {
      id: "system",
      label: "System Theme",
      desc: "Match your operating system",
      icon: Laptop,
    },
  ];

  return (
    <div className="settings-page">
      {/* HEADER */}
      <header className="settings-header">
        <div>
          <h1>Workspace Settings</h1>
          <p>Customize your workspace appearance, notifications, and AI preferences.</p>
        </div>
        {savedAlert && (
          <div className="save-toast">
            <Check size={16} /> Settings saved successfully!
          </div>
        )}
      </header>

      <div className="settings-container">
        {/* ==========================================
            1. APPEARANCE & THEME (DARK / LIGHT MODE)
        ========================================== */}
        <section className="settings-section">
          <div className="section-header">
            <div className="section-icon theme-icon">
              {currentTheme === "dark" ? <Moon size={20} /> : <Sun size={20} />}
            </div>
            <div>
              <h2>Appearance & Theme</h2>
              <p>Choose how Agent Workspace looks to you.</p>
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
                    <Icon size={28} className="theme-preview-icon" />
                    {isSelected && (
                      <span className="selected-badge">
                        <Check size={14} /> Active
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

        {/* ==========================================
            2. PROFILE & USER INFORMATION
        ========================================== */}
        <section className="settings-section">
          <div className="section-header">
            <div className="section-icon profile-icon">
              <User size={20} />
            </div>
            <div>
              <h2>User Profile</h2>
              <p>Manage your account identity and role in the workspace.</p>
            </div>
          </div>

          <form onSubmit={handleSave} className="settings-form">
            <div className="form-grid">
              <div className="form-group">
                <label>Display Name</label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) =>
                    setProfile({ ...profile, name: e.target.value })
                  }
                />
              </div>

              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) =>
                    setProfile({ ...profile, email: e.target.value })
                  }
                />
              </div>

              <div className="form-group">
                <label>Role</label>
                <input
                  type="text"
                  value={profile.role}
                  onChange={(e) =>
                    setProfile({ ...profile, role: e.target.value })
                  }
                />
              </div>

              <div className="form-group">
                <label>Timezone</label>
                <input
                  type="text"
                  value={profile.timezone}
                  onChange={(e) =>
                    setProfile({ ...profile, timezone: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="save-btn">
                Save Profile
              </button>
            </div>
          </form>
        </section>

        {/* ==========================================
            3. AI WORKSPACE BOT PREFERENCES
        ========================================== */}
        <section className="settings-section">
          <div className="section-header">
            <div className="section-icon ai-icon">
              <Bot size={20} />
            </div>
            <div>
              <h2>Workspace Bot (AI Assistant)</h2>
              <p>Configure model orchestration, suggestions, and 1-click action proposals.</p>
            </div>
          </div>

          <div className="toggle-list">
            <div className="toggle-item">
              <div>
                <strong>Active Engine</strong>
                <p>High-precision reasoning and workspace automation engine</p>
              </div>
              <span className="model-chip">
                <Sparkles size={14} /> {agentSettings.defaultModel}
              </span>
            </div>

            <div className="toggle-item">
              <div>
                <strong>Action Approval Cards</strong>
                <p>Require interactive approval before applying AI-proposed task mutations</p>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={agentSettings.showActionCards}
                  onChange={(e) =>
                    setAgentSettings({
                      ...agentSettings,
                      showActionCards: e.target.checked,
                    })
                  }
                />
                <span className="slider"></span>
              </label>
            </div>

            <div className="toggle-item">
              <div>
                <strong>Prompt Suggestion Chips</strong>
                <p>Show quick prompt chips for frequent questions on the chat panel</p>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={agentSettings.autoSuggest}
                  onChange={(e) =>
                    setAgentSettings({
                      ...agentSettings,
                      autoSuggest: e.target.checked,
                    })
                  }
                />
                <span className="slider"></span>
              </label>
            </div>
          </div>
        </section>

        {/* ==========================================
            4. NOTIFICATIONS
        ========================================== */}
        <section className="settings-section">
          <div className="section-header">
            <div className="section-icon notif-icon">
              <Bell size={20} />
            </div>
            <div>
              <h2>Notifications & Alerts</h2>
              <p>Stay updated on deadlines, task assignments, and overdue warnings.</p>
            </div>
          </div>

          <div className="toggle-list">
            <div className="toggle-item">
              <div>
                <strong>Task Assigned Alerts</strong>
                <p>Notify me when a teammate or agent assigns a task to my name</p>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={notifications.taskAssigned}
                  onChange={(e) =>
                    setNotifications({
                      ...notifications,
                      taskAssigned: e.target.checked,
                    })
                  }
                />
                <span className="slider"></span>
              </label>
            </div>

            <div className="toggle-item">
              <div>
                <strong>Deadline Reminders</strong>
                <p>Receive notifications for tasks due today or approaching deadlines</p>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={notifications.deadlineReminders}
                  onChange={(e) =>
                    setNotifications({
                      ...notifications,
                      deadlineReminders: e.target.checked,
                    })
                  }
                />
                <span className="slider"></span>
              </label>
            </div>

            <div className="toggle-item">
              <div>
                <strong>AI Action Proposals</strong>
                <p>Alert when Workspace Bot drafts pending changes for review</p>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={notifications.agentProposals}
                  onChange={(e) =>
                    setNotifications({
                      ...notifications,
                      agentProposals: e.target.checked,
                    })
                  }
                />
                <span className="slider"></span>
              </label>
            </div>
          </div>
        </section>

        {/* ==========================================
            5. SYSTEM INFORMATION
        ========================================== */}
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
              <span className="info-value status-online">● Connected</span>
            </div>
            <div className="info-item">
              <span className="info-label">Environment</span>
              <span className="info-value">Production / Hybrid</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Settings;
