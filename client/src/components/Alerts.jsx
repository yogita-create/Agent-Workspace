import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Bell,
  AlertCircle,
  Clock,
  Calendar,
  AlertTriangle,
  FolderOpen,
  CheckCircle2,
  User,
  Sparkles,
  X,
} from "lucide-react";
import axiosInstance from "../api/axiosInstance";
import { useAuth } from "../context/AuthContext";
import "./Alerts.css";

function Alerts({ onNavigate }) {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    overdue: 0,
    dueToday: 0,
    dueTomorrow: 0,
    upcoming: 0,
    taskAssigned: 0,
    aiProposals: 0,
    activeAlertsCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState("all");

  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/api/alerts");
      const data = res.data;
      if (data?.success) {
        setAlerts(data.alerts || []);
        setSummary(
          data.summary || {
            total: (data.alerts || []).length,
            overdue: 0,
            dueToday: 0,
            dueTomorrow: 0,
            upcoming: 0,
            taskAssigned: 0,
            aiProposals: 0,
            activeAlertsCount: (data.alerts || []).length,
          }
        );
      }
    } catch (err) {
      console.error("Load alerts error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount or when user notification preferences change
  useEffect(() => {
    fetchAlerts();
  }, [
    fetchAlerts,
    user?.preferences?.notifyDeadlines,
    user?.preferences?.notifyTaskAssigned,
    user?.preferences?.notifyAiProposals,
  ]);

  // Refetch when window regains focus to keep data synchronized
  useEffect(() => {
    const handleFocus = () => {
      fetchAlerts();
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [fetchAlerts]);

  const handleDismiss = async (alertId) => {
    try {
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
      setSummary((prev) => ({
        ...prev,
        total: Math.max(0, prev.total - 1),
        activeAlertsCount: Math.max(0, prev.activeAlertsCount - 1),
      }));
      await axiosInstance.post(`/api/alerts/${alertId}/dismiss`);
    } catch (err) {
      console.error("Dismiss alert error:", err);
      fetchAlerts();
    }
  };

  const handleMarkAsDone = async (taskRawId, alertId) => {
    try {
      setAlerts((prev) =>
        prev.filter((a) => a.id !== alertId && a.rawId !== taskRawId)
      );
      setSummary((prev) => ({
        ...prev,
        total: Math.max(0, prev.total - 1),
        activeAlertsCount: Math.max(0, prev.activeAlertsCount - 1),
      }));
      await axiosInstance.put(`/api/tasks/${taskRawId}`, { status: "done" });
      fetchAlerts();
    } catch (err) {
      console.error("Mark task as done error:", err);
      fetchAlerts();
    }
  };

  const displayedAlerts = useMemo(() => {
    if (selectedFilter === "overdue") {
      return alerts.filter((a) => a.type === "overdue");
    }
    if (selectedFilter === "due_today") {
      return alerts.filter((a) => a.type === "due_today");
    }
    if (selectedFilter === "due_tomorrow") {
      return alerts.filter((a) => a.type === "due_tomorrow");
    }
    if (selectedFilter === "upcoming") {
      return alerts.filter((a) => a.type === "upcoming");
    }
    if (selectedFilter === "task_assigned") {
      return alerts.filter((a) => a.type === "task_assigned");
    }
    if (selectedFilter === "ai_proposal") {
      return alerts.filter((a) => a.type === "ai_proposal");
    }
    return alerts;
  }, [alerts, selectedFilter]);

  return (
    <main className="alerts-page">
      {/* ==========================================
          HEADER
      ========================================== */}
      <header className="alerts-header">
        <div className="alerts-header-icon">
          <Bell size={24} />
        </div>
        <div className="alerts-header-text">
          <h1>Alerts</h1>
          <p>Stay updated with tasks and events that need your attention.</p>
        </div>
      </header>

      {/* ==========================================
          4 SUMMARY STATS CARDS
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
            <span className="alert-stat-value">{summary.total}</span>
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
              {summary.overdue}
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
              {summary.dueToday}
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
              {summary.dueTomorrow}
            </span>
          </div>
        </div>
      </section>

      {/* ==========================================
          NEEDS YOUR ATTENTION CARD
      ========================================== */}
      <section className="alerts-main-card">
        <div className="alerts-main-header">
          <div className="alerts-main-title">
            <h2>Needs Your Attention</h2>
            <p>Notifications filtered according to your active workspace preferences.</p>
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
            All Alerts ({summary.total})
          </button>
          <button
            type="button"
            className={`alert-tab-btn ${
              selectedFilter === "overdue" ? "active" : ""
            }`}
            onClick={() => setSelectedFilter("overdue")}
          >
            Overdue ({summary.overdue})
          </button>
          <button
            type="button"
            className={`alert-tab-btn ${
              selectedFilter === "due_today" ? "active" : ""
            }`}
            onClick={() => setSelectedFilter("due_today")}
          >
            Due Today ({summary.dueToday})
          </button>
          <button
            type="button"
            className={`alert-tab-btn ${
              selectedFilter === "due_tomorrow" ? "active" : ""
            }`}
            onClick={() => setSelectedFilter("due_tomorrow")}
          >
            Due Tomorrow ({summary.dueTomorrow})
          </button>
          <button
            type="button"
            className={`alert-tab-btn ${
              selectedFilter === "upcoming" ? "active" : ""
            }`}
            onClick={() => setSelectedFilter("upcoming")}
          >
            Upcoming ({summary.upcoming})
          </button>
          {(summary.taskAssigned > 0 || selectedFilter === "task_assigned") && (
            <button
              type="button"
              className={`alert-tab-btn ${
                selectedFilter === "task_assigned" ? "active" : ""
              }`}
              onClick={() => setSelectedFilter("task_assigned")}
            >
              Assigned ({summary.taskAssigned || 0})
            </button>
          )}
          {(summary.aiProposals > 0 || selectedFilter === "ai_proposal") && (
            <button
              type="button"
              className={`alert-tab-btn ${
                selectedFilter === "ai_proposal" ? "active" : ""
              }`}
              onClick={() => setSelectedFilter("ai_proposal")}
            >
              AI Proposals ({summary.aiProposals || 0})
            </button>
          )}
        </div>

        {/* Detailed Alerts List */}
        <div className="alerts-items-list">
          {displayedAlerts.length === 0 ? (
            <div className="empty-alerts-box">
              <CheckCircle2 size={36} color="#10b981" style={{ marginBottom: 8 }} />
              <h3>All clear!</h3>
              <p>There are no alerts requiring attention in this category.</p>
            </div>
          ) : (
            displayedAlerts.map((item) => (
              <div
                key={item.id}
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
                  ) : item.type === "task_assigned" ? (
                    <User size={20} />
                  ) : item.type === "ai_proposal" ? (
                    <Sparkles size={20} />
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
                    {item.deadlineStr && (
                      <span className="meta-item">
                        <Calendar size={13} />
                        {item.deadlineStr}
                      </span>
                    )}
                    <span className="meta-item">
                      <FolderOpen size={13} />
                      {item.projectName}
                    </span>
                    {item.assigneeName && (
                      <span className="meta-item">
                        <User size={13} />
                        {item.assigneeName}
                      </span>
                    )}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="alert-actions-col">
                  {item.task && item.task.status !== "done" && (
                    <button
                      type="button"
                      className="alert-done-btn"
                      onClick={() =>
                        handleMarkAsDone(item.rawId || item.task._id, item.id)
                      }
                      title="Mark task as done"
                    >
                      <CheckCircle2 size={13} />
                      Mark as Done
                    </button>
                  )}

                  <button
                    type="button"
                    className="alert-dismiss-btn"
                    onClick={() => handleDismiss(item.id)}
                    title="Dismiss alert"
                  >
                    <X size={13} />
                    Dismiss
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
