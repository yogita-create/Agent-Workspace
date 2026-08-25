import { useEffect, useState } from "react";
import {
  AlertCircle,
  Bell,
  CalendarClock,
  CheckCircle2,
  Clock,
  RefreshCw,
} from "lucide-react";

import "./Alerts.css";

const API_URL = "http://localhost:5000";

function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    overdue: 0,
    dueToday: 0,
    dueTomorrow: 0,
    upcoming: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ==========================================
  // LOAD ALERTS
  // ==========================================

  const loadAlerts = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_URL}/api/alerts`
      );

      if (!response.ok) {
        throw new Error(
          `Failed to load alerts: ${response.status}`
        );
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(
          data.message || "Failed to load alerts"
        );
      }

      setAlerts(data.alerts || []);

      setSummary(
        data.summary || {
          total: 0,
          overdue: 0,
          dueToday: 0,
          dueTomorrow: 0,
          upcoming: 0,
        }
      );
    } catch (error) {
      console.error(
        "Load alerts error:",
        error
      );

      setError(
        "Unable to load alerts. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // INITIAL LOAD
  // ==========================================

  useEffect(() => {
    loadAlerts();
  }, []);

  // ==========================================
  // FORMAT DATE
  // ==========================================

  const formatDate = (date) => {
    if (!date) return "No deadline";

    return new Date(date).toLocaleDateString(
      "en-IN",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      }
    );
  };

  // ==========================================
  // GET ALERT ICON
  // ==========================================

  const getAlertIcon = (type) => {
    switch (type) {
      case "overdue":
        return <AlertCircle size={22} />;

      case "due_today":
        return <Clock size={22} />;

      case "due_tomorrow":
        return <CalendarClock size={22} />;

      case "upcoming":
        return <Bell size={22} />;

      default:
        return <Bell size={22} />;
    }
  };

  // ==========================================
  // GET ALERT LABEL
  // ==========================================

  const getAlertLabel = (type) => {
    switch (type) {
      case "overdue":
        return "Overdue";

      case "due_today":
        return "Due Today";

      case "due_tomorrow":
        return "Due Tomorrow";

      case "upcoming":
        return "Upcoming";

      default:
        return "Notification";
    }
  };

  // ==========================================
  // GET PRIORITY CLASS
  // ==========================================

  const getPriorityClass = (priority) => {
    switch (priority) {
      case "high":
        return "priority-high";

      case "medium":
        return "priority-medium";

      case "low":
        return "priority-low";

      default:
        return "";
    }
  };

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <section className="alerts-page">

      {/* ======================================
          HEADER
      ====================================== */}

      <div className="alerts-header">

        <div className="alerts-header-content">

          <div className="alerts-header-icon">
            <Bell size={24} />
          </div>

          <div>
            <h1>Alerts</h1>

            <p>
              Stay updated with tasks that
              need your attention.
            </p>
          </div>

        </div>

        <button
          type="button"
          className="refresh-alerts-button"
          onClick={loadAlerts}
          disabled={loading}
        >
          <RefreshCw
            size={17}
            className={
              loading
                ? "refresh-spinning"
                : ""
            }
          />

          Refresh
        </button>

      </div>


      {/* ======================================
          SUMMARY CARDS
      ====================================== */}

      <div className="alert-summary">

        <div className="summary-card">

          <div className="summary-icon total">
            <Bell size={19} />
          </div>

          <div>
            <span>Total Alerts</span>
            <strong>{summary.total}</strong>
          </div>

        </div>


        <div className="summary-card">

          <div className="summary-icon overdue">
            <AlertCircle size={19} />
          </div>

          <div>
            <span>Overdue</span>
            <strong>{summary.overdue}</strong>
          </div>

        </div>


        <div className="summary-card">

          <div className="summary-icon today">
            <Clock size={19} />
          </div>

          <div>
            <span>Due Today</span>
            <strong>{summary.dueToday}</strong>
          </div>

        </div>


        <div className="summary-card">

          <div className="summary-icon tomorrow">
            <CalendarClock size={19} />
          </div>

          <div>
            <span>Due Tomorrow</span>
            <strong>{summary.dueTomorrow}</strong>
          </div>

        </div>

      </div>


      {/* ======================================
          LOADING
      ====================================== */}

      {loading && (
        <div className="alerts-state">
          <div className="alerts-loader"></div>

          <p>
            Checking your tasks...
          </p>
        </div>
      )}


      {/* ======================================
          ERROR
      ====================================== */}

      {!loading && error && (
        <div className="alerts-state error-state">

          <AlertCircle size={30} />

          <p>{error}</p>

          <button
            type="button"
            onClick={loadAlerts}
          >
            Try Again
          </button>

        </div>
      )}


      {/* ======================================
          NO ALERTS
      ====================================== */}

      {!loading &&
        !error &&
        alerts.length === 0 && (

          <div className="alerts-empty">

            <div className="empty-alert-icon">
              <CheckCircle2 size={38} />
            </div>

            <h2>
              You're all caught up!
            </h2>

            <p>
              There are no overdue or
              upcoming task alerts.
            </p>

          </div>
        )}


      {/* ======================================
          ALERT LIST
      ====================================== */}

      {!loading &&
        !error &&
        alerts.length > 0 && (

          <div className="alerts-list">

            <div className="alerts-list-header">

              <div>
                <h2>
                  Needs Your Attention
                </h2>

                <p>
                  Tasks that require your
                  attention based on their
                  deadlines.
                </p>
              </div>

              <span className="alert-count">
                {alerts.length}
              </span>

            </div>


            <div className="alert-items">

              {alerts.map((alert) => (

                <article
                  key={alert.id}
                  className={`alert-item ${alert.severity}`}
                >

                  {/* ALERT ICON */}

                  <div className="alert-item-icon">
                    {getAlertIcon(
                      alert.type
                    )}
                  </div>


                  {/* ALERT CONTENT */}

                  <div className="alert-item-content">

                    <div className="alert-item-top">

                      <span className="alert-type">
                        {getAlertLabel(
                          alert.type
                        )}
                      </span>

                      <span
                        className={`task-priority ${getPriorityClass(
                          alert.task?.priority
                        )}`}
                      >
                        {alert.task?.priority ||
                          "medium"}
                      </span>

                    </div>


                    <h3>
                      {alert.task?.title ||
                        "Untitled Task"}
                    </h3>


                    <p className="alert-message">
                      {alert.message}
                    </p>


                    <div className="alert-meta">

                      <span>
                        <CalendarClock
                          size={15}
                        />

                        {formatDate(
                          alert.task?.deadline
                        )}
                      </span>


                      {alert.project?.name && (
                        <span>
                          <Bell size={14} />

                          {alert.project.name}
                        </span>
                      )}

                    </div>

                  </div>

                </article>

              ))}

            </div>

          </div>
        )}

    </section>
  );
}

export default Alerts;