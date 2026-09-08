import { useEffect, useState, useMemo } from "react";
import {
  Bell,
  AlertCircle,
  Clock,
  Calendar,
  AlertTriangle,
  FolderOpen,
  CheckCircle2,
  User,
  ArrowRight,
} from "lucide-react";
import { getTaskAlerts } from "../utils/alertUtils";
import "./Alerts.css";

const API_URL = "http://localhost:5000";

function Alerts({ onNavigate }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState("all"); // 'all' | 'overdue' | 'due_today' | 'due_tomorrow' | 'upcoming'

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/tasks`);
      const data = await res.json();
      if (data.success) {
        setTasks(data.tasks || []);
      }
    } catch (err) {
      console.error("Load alerts tasks error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleMarkAsDone = async (taskId) => {
    try {
      setTasks((prev) =>
        prev.map((t) => (t._id === taskId ? { ...t, status: "done" } : t))
      );
      await fetch(`${API_URL}/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "done" }),
      });
    } catch (err) {
      console.error("Mark task as done error:", err);
      fetchTasks();
    }
  };

  const alertsData = useMemo(() => {
    return getTaskAlerts(tasks);
  }, [tasks]);

  const displayedAlerts = useMemo(() => {
    if (selectedFilter === "overdue") return alertsData.overdue;
    if (selectedFilter === "due_today") return alertsData.dueToday;
    if (selectedFilter === "due_tomorrow") return alertsData.dueTomorrow;
    if (selectedFilter === "upcoming") return alertsData.upcoming;
    return alertsData.allAlerts;
  }, [alertsData, selectedFilter]);

  return (
    <main className="alerts-page">
      {/* ==========================================
          HEADER (IMAGE 3)
      ========================================== */}
      <header className="alerts-header">
        <div className="alerts-header-icon">
          <Bell size={24} />
        </div>
        <div className="alerts-header-text">
          <h1>Alerts</h1>
          <p>Stay updated with tasks that need your attention.</p>
        </div>
      </header>

      {/* ==========================================
          4 SUMMARY STATS CARDS (IMAGE 3)
      ========================================== */}
      <section className="alerts-stats-grid">
        {/* Total Alerts */}
        <div
          className="alert-stat-card"
          onClick={() => setSelectedFilter("all")}
        >
          <div className="alert-stat-icon-box icon-box-blue">
            <Bell size={20} />
          </div>
          <div className="alert-stat-info">
            <span className="alert-stat-label">Total Alerts</span>
            <span className="alert-stat-value">{alertsData.totalCount}</span>
          </div>
        </div>

        {/* Overdue */}
        <div
          className="alert-stat-card"
          onClick={() => setSelectedFilter("overdue")}
        >
          <div className="alert-stat-icon-box icon-box-red">
            <AlertCircle size={20} />
          </div>
          <div className="alert-stat-info">
            <span className="alert-stat-label">Overdue</span>
            <span className="alert-stat-value" style={{ color: "#ef4444" }}>
              {alertsData.overdueCount}
            </span>
          </div>
        </div>

        {/* Due Today */}
        <div
          className="alert-stat-card"
          onClick={() => setSelectedFilter("due_today")}
        >
          <div className="alert-stat-icon-box icon-box-orange">
            <Clock size={20} />
          </div>
          <div className="alert-stat-info">
            <span className="alert-stat-label">Due Today</span>
            <span className="alert-stat-value" style={{ color: "#f97316" }}>
              {alertsData.dueTodayCount}
            </span>
          </div>
        </div>

        {/* Due Tomorrow */}
        <div
          className="alert-stat-card"
          onClick={() => setSelectedFilter("due_tomorrow")}
        >
          <div className="alert-stat-icon-box icon-box-blue">
            <Calendar size={20} />
          </div>
          <div className="alert-stat-info">
            <span className="alert-stat-label">Due Tomorrow</span>
            <span className="alert-stat-value" style={{ color: "#3b82f6" }}>
              {alertsData.dueTomorrowCount}
            </span>
          </div>
        </div>
      </section>

      {/* ==========================================
          NEEDS YOUR ATTENTION CARD (IMAGE 3)
      ========================================== */}
      <section className="alerts-main-card">
        <div className="alerts-main-header">
          <div className="alerts-main-title">
            <h2>Needs Your Attention</h2>
            <p>Tasks that require your attention based on their deadlines.</p>
          </div>

          <div className="alerts-counter-pill">
            {displayedAlerts.length}
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="alerts-filter-tabs">
          <button
            type="button"
            className={`alert-tab-btn ${
              selectedFilter === "all" ? "active" : ""
            }`}
            onClick={() => setSelectedFilter("all")}
          >
            All Alerts ({alertsData.totalCount})
          </button>
          <button
            type="button"
            className={`alert-tab-btn ${
              selectedFilter === "overdue" ? "active" : ""
            }`}
            onClick={() => setSelectedFilter("overdue")}
          >
            Overdue ({alertsData.overdueCount})
          </button>
          <button
            type="button"
            className={`alert-tab-btn ${
              selectedFilter === "due_today" ? "active" : ""
            }`}
            onClick={() => setSelectedFilter("due_today")}
          >
            Due Today ({alertsData.dueTodayCount})
          </button>
          <button
            type="button"
            className={`alert-tab-btn ${
              selectedFilter === "due_tomorrow" ? "active" : ""
            }`}
            onClick={() => setSelectedFilter("due_tomorrow")}
          >
            Due Tomorrow ({alertsData.dueTomorrowCount})
          </button>
          <button
            type="button"
            className={`alert-tab-btn ${
              selectedFilter === "upcoming" ? "active" : ""
            }`}
            onClick={() => setSelectedFilter("upcoming")}
          >
            Upcoming ({alertsData.upcomingCount})
          </button>
        </div>

        {/* Detailed Alerts List */}
        <div className="alerts-items-list">
          {displayedAlerts.length === 0 ? (
            <div className="empty-alerts-box">
              <CheckCircle2 size={36} color="#10b981" style={{ marginBottom: 8 }} />
              <h3>All clear!</h3>
              <p>There are no tasks requiring attention in this category.</p>
            </div>
          ) : (
            displayedAlerts.map((item, index) => (
              <div
                key={`${item.task._id}-${index}`}
                className={`alert-detail-card alert-type-${item.type}`}
              >
                {/* Left Circle Icon */}
                <div className={`alert-avatar-circle circle-${item.type}`}>
                  {item.type === "overdue" ? (
                    <AlertTriangle size={20} />
                  ) : item.type === "due_today" ? (
                    <Clock size={20} />
                  ) : item.type === "due_tomorrow" ? (
                    <Calendar size={20} />
                  ) : (
                    <Clock size={20} />
                  )}
                </div>

                {/* Card Body */}
                <div className="alert-card-body">
                  <div className="alert-tags-row">
                    <span className={`tag-badge tag-${item.type}`}>
                      {item.badge}
                    </span>
                    <span
                      className={`priority-pill-mini priority-${
                        item.priority || "medium"
                      }-mini`}
                    >
                      {item.priority || "medium"}
                    </span>
                  </div>

                  <h3 className="alert-card-title">{item.title}</h3>
                  <p className="alert-card-message">{item.message}</p>

                  <div className="alert-metadata-row">
                    <span className="meta-item">
                      <Calendar size={13} />
                      {item.deadlineStr}
                    </span>
                    <span className="meta-item">
                      <FolderOpen size={13} />
                      {item.projectName}
                    </span>
                    <span className="meta-item">
                      <User size={13} />
                      {item.assigneeName}
                    </span>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="alert-actions-col">
                  <button
                    type="button"
                    className="alert-done-btn"
                    onClick={() => handleMarkAsDone(item.task._id)}
                    title="Mark task as done"
                  >
                    <CheckCircle2 size={13} />
                    Mark as Done
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}

export default Alerts;
