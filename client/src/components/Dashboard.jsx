import { useEffect, useState, useRef } from "react";
import {
  Folder,
  CheckSquare,
  TrendingUp,
  ArrowUpRight,
  Bell,
  CheckCircle2,
  Activity,
  Target,
  Zap,
  Clock,
  AlertTriangle,
  FolderOpen,
  ArrowRight,
  X,
} from "lucide-react";
import { getTaskAlerts } from "../utils/alertUtils";
import "./Dashboard.css";

const API_URL = "http://localhost:5000";

function Dashboard({ onNavigate }) {
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNotifPopover, setShowNotifPopover] = useState(false);
  const [currentTimeStr, setCurrentTimeStr] = useState("");

  const popoverRef = useRef(null);

  // Time formatter
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const formatted = now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
      setCurrentTimeStr(formatted);
    };
    updateTime();
  }, []);

  // Fetch projects and tasks
  useEffect(() => {
    let ignore = false;

    const loadData = async () => {
      try {
        setLoading(true);
        const [projRes, tasksRes] = await Promise.all([
          fetch(`${API_URL}/api/projects`),
          fetch(`${API_URL}/api/tasks`),
        ]);

        const projData = await projRes.json();
        const tasksData = await tasksRes.json();

        if (ignore) return;

        if (projData.success) {
          setProjects(projData.projects || []);
        }
        if (tasksData.success) {
          setTasks(tasksData.tasks || []);
        }
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    loadData();

    return () => {
      ignore = true;
    };
  }, []);

  // Close popover on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target) &&
        !e.target.closest(".notif-bell-btn")
      ) {
        setShowNotifPopover(false);
      }
    };

    if (showNotifPopover) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showNotifPopover]);

  // Calculations
  const totalProjects = projects.length;
  const activeProjects = projects.filter(
    (p) => p.status === "Active" || !p.status
  ).length;

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "done").length;
  const inProgressTasks = tasks.filter((t) => t.status === "in_progress").length;
  const inReviewTasks = tasks.filter((t) => t.status === "in_review").length;
  const todoTasks = tasks.filter((t) => (t.status || "todo") === "todo").length;
  const remainingTasks = totalTasks - completedTasks;

  const completionPct = totalTasks > 0
    ? Math.round((completedTasks / totalTasks) * 100)
    : 0;

  const todoPct = totalTasks > 0 ? Math.round((todoTasks / totalTasks) * 100) : 0;
  const inProgressPct = totalTasks > 0
    ? Math.round(((inProgressTasks + inReviewTasks) / totalTasks) * 100)
    : 0;

  // Priorities count
  const highPriorityCount = tasks.filter(
    (t) => t.priority === "high" || t.priority === "urgent"
  ).length;
  const mediumPriorityCount = tasks.filter(
    (t) => t.priority === "medium" || !t.priority
  ).length;
  const lowPriorityCount = tasks.filter((t) => t.priority === "low").length;

  // Alerts
  const alertsData = getTaskAlerts(tasks);
  const totalAlertsCount = alertsData.totalCount;

  // SVG Gauge calculations
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (completionPct / 100) * circumference;

  // Big Dial calculations
  const dialRadius = 38;
  const dialCircumference = 2 * Math.PI * dialRadius;
  const dialStrokeDashoffset =
    dialCircumference - (completionPct / 100) * dialCircumference;

  return (
    <div className="dashboard">
      {/* ==========================================
          HEADER (IMAGE 1)
      ========================================== */}
      <header className="dashboard-header">
        <div className="dashboard-title-wrap">
          <div className="dashboard-title-row">
            <h1>Main Workspace</h1>
            <span className="live-badge">
              <span className="live-dot" />
              Live
            </span>
          </div>
          <p>Workspace performance overview</p>
        </div>

        <div className="dashboard-header-right">
          <span className="updated-time-text">
            Updated {currentTimeStr || "07:39 am"}
          </span>

          {/* NOTIFICATION BELL BUTTON */}
          <button
            type="button"
            className={`notif-bell-btn ${showNotifPopover ? "active" : ""}`}
            onClick={() => setShowNotifPopover((prev) => !prev)}
            title="View Notifications"
          >
            <Bell size={20} />
            {totalAlertsCount > 0 && (
              <span className="notif-badge-pill">{totalAlertsCount}</span>
            )}
          </button>
        </div>
      </header>

      {/* ==========================================
          SHORT NOTIFICATION DROPDOWN (IMAGE 2)
      ========================================== */}
      {showNotifPopover && (
        <div className="notif-popover-dropdown" ref={popoverRef}>
          <div className="notif-popover-header">
            <div className="notif-header-text">
              <h3>Notifications</h3>
              <p>Recent task alerts</p>
            </div>
            <button
              type="button"
              className="notif-close-btn"
              onClick={() => setShowNotifPopover(false)}
            >
              <X size={16} />
            </button>
          </div>

          <div className="notif-summary-pills">
            <span className="pill-active-count">
              {alertsData.activeAlertsCount} active
            </span>
            <span className="pill-overdue-count">
              {alertsData.overdueCount} overdue
            </span>
          </div>

          <div className="notif-items-list">
            {alertsData.allAlerts.length === 0 ? (
              <div className="notif-empty-state">
                🎉 No pending alerts! All tasks are on schedule.
              </div>
            ) : (
              alertsData.allAlerts.slice(0, 5).map((alert, idx) => (
                <div
                  key={`${alert.task._id}-${idx}`}
                  className="notif-item-card"
                  onClick={() => {
                    setShowNotifPopover(false);
                    onNavigate("alerts");
                  }}
                >
                  <div
                    className={`notif-alert-icon-box ${
                      alert.type === "overdue"
                        ? "icon-overdue-bg"
                        : alert.type === "due_today"
                        ? "icon-today-bg"
                        : "icon-tomorrow-bg"
                    }`}
                  >
                    {alert.type === "overdue" ? (
                      <AlertTriangle size={16} />
                    ) : (
                      <Clock size={16} />
                    )}
                  </div>

                  <div className="notif-item-content">
                    <h4 className="notif-item-title">
                      {alert.type === "overdue"
                        ? "Task Overdue"
                        : alert.type === "due_today"
                        ? "Due Today"
                        : alert.type === "due_tomorrow"
                        ? "Due Tomorrow"
                        : "Upcoming Due"}
                    </h4>
                    <p className="notif-item-desc">{alert.message}</p>
                    <span className="notif-item-project">
                      <FolderOpen size={11} />
                      {alert.projectName}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="notif-footer-action">
            <button
              type="button"
              className="view-all-alerts-btn"
              onClick={() => {
                setShowNotifPopover(false);
                onNavigate("alerts");
              }}
            >
              View all alerts in Alerts Center <ArrowRight size={13} />
            </button>
          </div>
        </div>
      )}

      {/* ==========================================
          TOP 4 METRIC CARDS (IMAGE 1)
      ========================================== */}
      <section className="dashboard-stats-grid">
        {/* Total Projects */}
        <div
          className="dashboard-stat-card"
          onClick={() => onNavigate("projects")}
        >
          <div className="stat-card-top-row">
            <div className="stat-card-icon-box icon-blue">
              <Folder size={20} />
            </div>
            <ArrowUpRight size={18} className="stat-arrow-icon" />
          </div>

          <div className="stat-card-main-content">
            <div>
              <p className="stat-card-label">Total Projects</p>
              <h2 className="stat-card-value">{totalProjects}</h2>
              <p className="stat-card-subtext">{activeProjects} active</p>
            </div>
          </div>
        </div>

        {/* Total Tasks */}
        <div
          className="dashboard-stat-card"
          onClick={() => onNavigate("tasks")}
        >
          <div className="stat-card-top-row">
            <div className="stat-card-icon-box icon-cyan">
              <CheckSquare size={20} />
            </div>
            <ArrowUpRight size={18} className="stat-arrow-icon" />
          </div>

          <div className="stat-card-main-content">
            <div>
              <p className="stat-card-label">Total Tasks</p>
              <h2 className="stat-card-value">{totalTasks}</h2>
              <p className="stat-card-subtext">{remainingTasks} remaining</p>
            </div>
          </div>
        </div>

        {/* Completed Tasks */}
        <div
          className="dashboard-stat-card"
          onClick={() => onNavigate("tasks")}
        >
          <div className="stat-card-top-row">
            <div className="stat-card-icon-box icon-green">
              <CheckCircle2 size={20} />
            </div>
            <ArrowUpRight size={18} className="stat-arrow-icon" />
          </div>

          <div className="stat-card-main-content">
            <div>
              <p className="stat-card-label">Completed Tasks</p>
              <h2 className="stat-card-value">{completedTasks}</h2>
              <p className="stat-card-subtext">{completionPct}% completion</p>
            </div>
          </div>
        </div>

        {/* Workspace Progress */}
        <div
          className="dashboard-stat-card"
          onClick={() => onNavigate("tasks")}
        >
          <div className="stat-card-top-row">
            <div className="stat-card-icon-box icon-amber">
              <TrendingUp size={20} />
            </div>
          </div>

          <div className="stat-card-main-content">
            <div>
              <p className="stat-card-label">Workspace Progress</p>
              <h2 className="stat-card-value">{completionPct}%</h2>
              <p className="stat-card-subtext">Overall completion</p>
            </div>

            {/* Circular Gauge */}
            <div className="stat-card-gauge-wrap">
              <svg width="54" height="54" className="gauge-svg">
                <circle
                  className="gauge-bg"
                  strokeWidth="5"
                  fill="transparent"
                  r={radius}
                  cx="27"
                  cy="27"
                />
                <circle
                  className="gauge-fill"
                  strokeWidth="5"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  fill="transparent"
                  r={radius}
                  cx="27"
                  cy="27"
                />
              </svg>
              <span className="gauge-center-text">{completionPct}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ==========================================
          DARK WORKSPACE INSIGHT CARD (IMAGE 1)
      ========================================== */}
      <section className="workspace-insight-card">
        <div className="insight-top-section">
          <div className="insight-text-wrap">
            <span className="insight-pill-tag">WORKSPACE INSIGHT</span>
            <h2>Your workspace at a glance</h2>
            <p>
              Track execution, workload and project momentum in one place.
            </p>
          </div>

          {/* Completion Dial */}
          <div className="insight-dial-wrap">
            <svg width="90" height="90" className="dial-svg">
              <circle
                className="dial-bg"
                strokeWidth="7"
                fill="transparent"
                r={dialRadius}
                cx="45"
                cy="45"
              />
              <circle
                className="dial-fill"
                strokeWidth="7"
                strokeDasharray={dialCircumference}
                strokeDashoffset={dialStrokeDashoffset}
                fill="transparent"
                r={dialRadius}
                cx="45"
                cy="45"
              />
            </svg>
            <div className="dial-center-content">
              <span className="dial-number">{completionPct}%</span>
              <span className="dial-label">Complete</span>
            </div>
          </div>
        </div>

        {/* Bottom 4 Icon Metrics */}
        <div className="insight-bottom-metrics">
          <div className="insight-metric-item">
            <div className="insight-metric-icon" style={{ color: "#38bdf8" }}>
              <CheckCircle2 size={18} />
            </div>
            <div className="metric-info">
              <span className="metric-label">Completed</span>
              <span className="metric-value">{completedTasks}</span>
            </div>
          </div>

          <div className="insight-metric-item">
            <div className="insight-metric-icon" style={{ color: "#818cf8" }}>
              <Activity size={18} />
            </div>
            <div className="metric-info">
              <span className="metric-label">In Progress</span>
              <span className="metric-value">{inProgressTasks}</span>
            </div>
          </div>

          <div className="insight-metric-item">
            <div className="insight-metric-icon" style={{ color: "#a78bfa" }}>
              <Target size={18} />
            </div>
            <div className="metric-info">
              <span className="metric-label">To Do</span>
              <span className="metric-value">{todoTasks}</span>
            </div>
          </div>

          <div className="insight-metric-item">
            <div className="insight-metric-icon" style={{ color: "#f43f5e" }}>
              <Zap size={18} />
            </div>
            <div className="metric-info">
              <span className="metric-label">High Priority</span>
              <span className="metric-value">{highPriorityCount}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ==========================================
          BOTTOM 2 CHARTS GRID (IMAGE 1)
      ========================================== */}
      <section className="dashboard-charts-grid">
        {/* Task Progress */}
        <div className="dashboard-chart-card">
          <div className="chart-card-header">
            <div className="chart-title-wrap">
              <h3>Task Progress</h3>
              <p>Current workload distribution</p>
            </div>
            <div className="chart-header-icon" style={{ color: "#3b82f6", background: "#eff6ff" }}>
              <Activity size={18} />
            </div>
          </div>

          <div className="chart-rows-list">
            {/* To Do */}
            <div className="progress-item-row">
              <div className="progress-label-wrap">
                <span className="dot-indicator dot-gray" />
                <span>To Do</span>
              </div>
              <span className="progress-item-count">{todoTasks}</span>
              <div className="progress-bar-track">
                <div
                  className="progress-bar-fill bar-gray"
                  style={{ width: `${todoPct}%` }}
                />
              </div>
              <span className="progress-item-pct">{todoPct}%</span>
            </div>

            {/* In Progress */}
            <div className="progress-item-row">
              <div className="progress-label-wrap">
                <span className="dot-indicator dot-blue" />
                <span>In Progress</span>
              </div>
              <span className="progress-item-count">{inProgressTasks}</span>
              <div className="progress-bar-track">
                <div
                  className="progress-bar-fill bar-blue"
                  style={{ width: `${inProgressPct}%` }}
                />
              </div>
              <span className="progress-item-pct">{inProgressPct}%</span>
            </div>

            {/* Completed */}
            <div className="progress-item-row">
              <div className="progress-label-wrap">
                <span className="dot-indicator dot-green" />
                <span>Completed</span>
              </div>
              <span className="progress-item-count">{completedTasks}</span>
              <div className="progress-bar-track">
                <div
                  className="progress-bar-fill bar-green"
                  style={{ width: `${completionPct}%` }}
                />
              </div>
              <span className="progress-item-pct">{completionPct}%</span>
            </div>
          </div>
        </div>

        {/* Task Priority */}
        <div className="dashboard-chart-card">
          <div className="chart-card-header">
            <div className="chart-title-wrap">
              <h3>Task Priority</h3>
              <p>Current workload by priority</p>
            </div>
            <div className="chart-header-icon" style={{ color: "#f59e0b", background: "#fef3c7" }}>
              <Target size={18} />
            </div>
          </div>

          <div className="chart-rows-list">
            {/* High */}
            <div className="progress-item-row">
              <div className="progress-label-wrap">
                <span className="dot-indicator dot-red" />
                <span>High</span>
              </div>
              <div className="progress-bar-track">
                <div
                  className="progress-bar-fill bar-red"
                  style={{
                    width: totalTasks > 0
                      ? `${Math.round((highPriorityCount / totalTasks) * 100)}%`
                      : "0%",
                  }}
                />
              </div>
              <span className="progress-item-count">{highPriorityCount}</span>
            </div>

            {/* Medium */}
            <div className="progress-item-row">
              <div className="progress-label-wrap">
                <span className="dot-indicator dot-orange" />
                <span>Medium</span>
              </div>
              <div className="progress-bar-track">
                <div
                  className="progress-bar-fill bar-orange"
                  style={{
                    width: totalTasks > 0
                      ? `${Math.round((mediumPriorityCount / totalTasks) * 100)}%`
                      : "0%",
                  }}
                />
              </div>
              <span className="progress-item-count">{mediumPriorityCount}</span>
            </div>

            {/* Low */}
            <div className="progress-item-row">
              <div className="progress-label-wrap">
                <span className="dot-indicator dot-green" />
                <span>Low</span>
              </div>
              <div className="progress-bar-track">
                <div
                  className="progress-bar-fill bar-green"
                  style={{
                    width: totalTasks > 0
                      ? `${Math.round((lowPriorityCount / totalTasks) * 100)}%`
                      : "0%",
                  }}
                />
              </div>
              <span className="progress-item-count">{lowPriorityCount}</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Dashboard;