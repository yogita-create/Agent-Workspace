import { useEffect, useMemo, useState } from "react";
import {
  FolderKanban,
  CheckCircle2,
  ListTodo,
  TrendingUp,
  CircleDot,
  Clock3,
  PauseCircle,
  Activity,
  RefreshCw,
  ArrowUpRight,
  Target,
  Zap,
  Bell,
  AlertTriangle,
  Clock,
  CalendarDays,
  X,
} from "lucide-react";

import "./Dashboard.css";

const API_URL = "http://localhost:5000";

function Dashboard({ onNavigate }) {
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);

  const [loading, setLoading] = useState(true);
const [lastUpdated, setLastUpdated] = useState(null);

const [alerts, setAlerts] = useState([]);
const [alertSummary, setAlertSummary] = useState({
  total: 0,
  overdue: 0,
  dueToday: 0,
  dueTomorrow: 0,
  upcoming: 0,
});

const [notificationOpen, setNotificationOpen] = useState(false);
  // =========================================================
  // LOAD DASHBOARD DATA
  // =========================================================

  const loadDashboardData = async (showLoader = false) => {
    try {
      if (showLoader) {
        setRefreshing(true);
      }

      const [projectsResponse, tasksResponse] =
        await Promise.all([
          fetch(`${API_URL}/api/projects`),
          fetch(`${API_URL}/api/tasks`),
        ]);

      if (!projectsResponse.ok) {
        throw new Error(
          `Projects request failed: ${projectsResponse.status}`
        );
      }

      if (!tasksResponse.ok) {
        throw new Error(
          `Tasks request failed: ${tasksResponse.status}`
        );
      }

      const projectsData = await projectsResponse.json();
      const tasksData = await tasksResponse.json();

      setProjects(
        projectsData.success
          ? projectsData.projects || []
          : []
      );

      /*
       * Supports both:
       *
       * { success: true, tasks: [...] }
       *
       * and
       *
       * { success: true, data: [...] }
       */
      const loadedTasks =
        tasksData.tasks ||
        tasksData.data ||
        [];

      setTasks(
        tasksData.success
          ? loadedTasks
          : []
      );

      setLastUpdated(new Date());
    } catch (error) {
      console.error(
        "Dashboard data loading error:",
        error
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // =========================================================
// LOAD NOTIFICATIONS
// =========================================================

const loadNotifications = async () => {
  try {
    const response = await fetch(
      `${API_URL}/api/alerts`
    );

    if (!response.ok) {
      throw new Error(
        `Alerts request failed: ${response.status}`
      );
    }

    const data = await response.json();

    if (data.success) {
      setAlerts(data.alerts || []);

      setAlertSummary(
        data.summary || {
          total: 0,
          overdue: 0,
          dueToday: 0,
          dueTomorrow: 0,
          upcoming: 0,
        }
      );
    }
  } catch (error) {
    console.error(
      "Notification loading error:",
      error
    );
  }
};
  
// =========================================================
// INITIAL LOAD + AUTO REFRESH
// =========================================================

useEffect(() => {
  loadDashboardData();
  loadNotifications();

  const interval = setInterval(() => {
    loadDashboardData();
    loadNotifications();
  }, 10000);

  return () => {
    clearInterval(interval);
  };
}, []);
  // =========================================================
  // TASK STATISTICS
  // =========================================================

  const totalTasks = tasks.length;

  const completedTasks = tasks.filter(
    (task) => task.status === "done"
  ).length;

  const inProgressTasks = tasks.filter(
    (task) => task.status === "in_progress"
  ).length;

  const todoTasks = tasks.filter(
    (task) => task.status === "todo"
  ).length;

  const completionRate =
    totalTasks === 0
      ? 0
      : Math.round(
          (completedTasks / totalTasks) * 100
        );

  // =========================================================
  // PROJECT STATISTICS
  // =========================================================

  const activeProjects = projects.filter(
    (project) => project.status === "Active"
  ).length;

  const completedProjects = projects.filter(
    (project) => project.status === "Completed"
  ).length;

  const onHoldProjects = projects.filter(
    (project) => project.status === "On Hold"
  ).length;

  // =========================================================
  // PRIORITY STATISTICS
  // =========================================================

  const highPriorityTasks = tasks.filter(
    (task) => task.priority === "high"
  ).length;

  const mediumPriorityTasks = tasks.filter(
    (task) => task.priority === "medium"
  ).length;

  const lowPriorityTasks = tasks.filter(
    (task) => task.priority === "low"
  ).length;

  // =========================================================
  // PROJECT PERFORMANCE
  // =========================================================

  const projectPerformance = useMemo(() => {
    return projects.map((project) => {
      const projectId = String(project._id);

      const projectTasks = tasks.filter(
        (task) =>
          String(
            task.projectId?._id ||
              task.projectId
          ) === projectId
      );

      const total = projectTasks.length;

      const completed = projectTasks.filter(
        (task) => task.status === "done"
      ).length;

      const inProgress = projectTasks.filter(
        (task) => task.status === "in_progress"
      ).length;

      const todo = projectTasks.filter(
        (task) => task.status === "todo"
      ).length;

      const progress =
        total === 0
          ? 0
          : Math.round(
              (completed / total) * 100
            );

      const high = projectTasks.filter(
        (task) => task.priority === "high"
      ).length;

      const medium = projectTasks.filter(
        (task) => task.priority === "medium"
      ).length;

      const low = projectTasks.filter(
        (task) => task.priority === "low"
      ).length;

      return {
        ...project,
        total,
        completed,
        inProgress,
        todo,
        progress,
        high,
        medium,
        low,
      };
    });
  }, [projects, tasks]);

  // =========================================================
  // TOP PROJECT
  // =========================================================

  const topProject = useMemo(() => {
    if (projectPerformance.length === 0) {
      return null;
    }

    return [...projectPerformance].sort(
      (a, b) => b.progress - a.progress
    )[0];
  }, [projectPerformance]);

  // =========================================================
  // FORMAT TIME
  // =========================================================

  const formattedTime = lastUpdated
    ? lastUpdated.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "--:--";

  // =========================================================
  // PROJECT STATUS CLASS
  // =========================================================

  const getProjectStatusClass = (status) => {
    if (status === "Completed") {
      return "status-completed";
    }

    if (status === "On Hold") {
      return "status-hold";
    }

    return "status-active";
  };

  // =========================================================
  // LOADING STATE
  // =========================================================
  // =========================================================
// NOTIFICATION HELPERS
// =========================================================

const getAlertIcon = (type) => {
  switch (type) {
    case "overdue":
      return <AlertTriangle size={17} />;

    case "due_today":
      return <Clock size={17} />;

    case "due_tomorrow":
      return <CalendarDays size={17} />;

    case "upcoming":
      return <CalendarDays size={17} />;

    default:
      return <Bell size={17} />;
  }
};

const getAlertClass = (severity) => {
  switch (severity) {
    case "danger":
      return "notification-danger";

    case "warning":
      return "notification-warning";

    case "info":
      return "notification-info";

    default:
      return "notification-info";
  }
};
  if (loading) {
    return (
      <div className="dashboard">
        <div className="dashboard-loading">
          <RefreshCw
            size={22}
            className="loading-spin"
          />

          <span>
            Loading workspace analytics...
          </span>
        </div>
      </div>
    );
  }

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="dashboard">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="dashboard-header">

        <div>
          <div className="dashboard-title-row">

            <h1>Main Workspace</h1>

            <span className="live-badge">
              <span className="live-dot"></span>
              Live
            </span>

          </div>

          <p>
            Workspace performance overview
          </p>
        </div>

        <div className="dashboard-header-right">

          <span className="updated-text">
            Updated {formattedTime}
          </span>

        {/* NOTIFICATION BUTTON */}

<div className="notification-wrapper">

  <button
    type="button"
    className={`dashboard-notification-button ${
      notificationOpen
        ? "notification-active"
        : ""
    }`}
    onClick={() =>
      setNotificationOpen(
        (previous) => !previous
      )
    }
    title="Notifications"
    aria-label="Notifications"
  >
    <Bell size={20} />

    {alertSummary.total > 0 && (
      <span className="notification-badge">
        {alertSummary.total > 99
          ? "99+"
          : alertSummary.total}
      </span>
    )}
  </button>


  {/* =========================================
      NOTIFICATION DROPDOWN
  ========================================= */}

  {notificationOpen && (
    <div className="notification-dropdown">

      {/* HEADER */}

      <div className="notification-dropdown-header">

        <div>
          <h3>Notifications</h3>

          <p>
            Recent task alerts
          </p>
        </div>

        <button
          type="button"
          className="notification-close"
          onClick={() =>
            setNotificationOpen(false)
          }
        >
          <X size={17} />
        </button>

      </div>


      {/* SUMMARY */}

      <div className="notification-summary">

        <span>
          {alertSummary.total} active
        </span>

        {alertSummary.overdue > 0 && (
          <span className="summary-danger">
            {alertSummary.overdue} overdue
          </span>
        )}

      </div>


      {/* ALERT LIST */}

      <div className="notification-list">

        {alerts.length === 0 ? (

          <div className="notification-empty">

            <div className="notification-empty-icon">
              <Bell size={20} />
            </div>

            <strong>
              You're all caught up
            </strong>

            <span>
              No active task alerts.
            </span>

          </div>

        ) : (

          alerts.slice(0, 5).map((alert) => (

            <div
              key={`${alert.id}-${alert.type}`}
              className={`notification-item ${
                getAlertClass(alert.severity)
              }`}
            >

              <div className="notification-item-icon">
                {getAlertIcon(alert.type)}
              </div>

              <div className="notification-item-content">

                <strong>
                  {alert.title}
                </strong>

                <p>
                  {alert.message}
                </p>

                {alert.project && (
                  <span className="notification-project">
                    {alert.project.name}
                  </span>
                )}

              </div>

            </div>

          ))

          
        )}

      </div>


      {/* FOOTER */}

      {alerts.length > 5 && (
        <div className="notification-footer">
          <span>
            Showing 5 of {alerts.length} alerts
          </span>
        </div>
      )}

    </div>
  )}

</div>

        </div>

      </div>

      {/* =====================================================
          KPI CARDS
      ===================================================== */}

      <div className="stats-grid">

        {/* PROJECTS */}

        <div className="stat-card">

          <div className="stat-icon projects-icon">
            <FolderKanban size={22} />
          </div>

          <div className="stat-content">

            <span className="stat-label">
              Total Projects
            </span>

            <strong>
              {projects.length}
            </strong>

            <small>
              {activeProjects} active
            </small>

          </div>

          <ArrowUpRight
            size={18}
            className="stat-arrow"
          />

        </div>

        {/* TASKS */}

        <div className="stat-card">

          <div className="stat-icon tasks-icon">
            <ListTodo size={22} />
          </div>

          <div className="stat-content">

            <span className="stat-label">
              Total Tasks
            </span>

            <strong>
              {totalTasks}
            </strong>

            <small>
              {todoTasks} remaining
            </small>

          </div>

          <ArrowUpRight
            size={18}
            className="stat-arrow"
          />

        </div>

        {/* COMPLETED */}

        <div className="stat-card">

          <div className="stat-icon completed-icon">
            <CheckCircle2 size={22} />
          </div>

          <div className="stat-content">

            <span className="stat-label">
              Completed Tasks
            </span>

            <strong>
              {completedTasks}
            </strong>

            <small>
              {completionRate}% completion
            </small>

          </div>

          <ArrowUpRight
            size={18}
            className="stat-arrow"
          />

        </div>

        {/* COMPLETION */}

        <div className="stat-card">

          <div className="stat-icon progress-icon">
            <TrendingUp size={22} />
          </div>

          <div className="stat-content">

            <span className="stat-label">
              Workspace Progress
            </span>

            <strong>
              {completionRate}%
            </strong>

            <small>
              Overall completion
            </small>

          </div>

          <div
            className="mini-progress-ring"
            style={{
              "--progress": `${completionRate * 3.6}deg`,
            }}
          >
            <span>
              {completionRate}
            </span>
          </div>

        </div>

      </div>

      {/* =====================================================
          DARK PERFORMANCE PANEL
      ===================================================== */}

      <section className="performance-panel">

        <div className="performance-panel-top">

          <div>

            <span className="panel-eyebrow">
              WORKSPACE INSIGHT
            </span>

            <h2>
              Your workspace at a glance
            </h2>

            <p>
              Track execution, workload and
              project momentum in one place.
            </p>

          </div>

          <div className="panel-main-progress">

            <div
              className="large-progress-ring"
              style={{
                "--progress": `${completionRate * 3.6}deg`,
              }}
            >
              <div>
                <strong>
                  {completionRate}%
                </strong>

                <span>
                  Complete
                </span>
              </div>
            </div>

          </div>

        </div>

        <div className="panel-metrics">

          <div className="panel-metric">

            <div className="panel-metric-icon">
              <CheckCircle2 size={18} />
            </div>

            <div>
              <span>Completed</span>
              <strong>
                {completedTasks}
              </strong>
            </div>

          </div>

          <div className="panel-metric">

            <div className="panel-metric-icon">
              <Activity size={18} />
            </div>

            <div>
              <span>In Progress</span>
              <strong>
                {inProgressTasks}
              </strong>
            </div>

          </div>

          <div className="panel-metric">

            <div className="panel-metric-icon">
              <Target size={18} />
            </div>

            <div>
              <span>To Do</span>
              <strong>
                {todoTasks}
              </strong>
            </div>

          </div>

          <div className="panel-metric">

            <div className="panel-metric-icon">
              <Zap size={18} />
            </div>

            <div>
              <span>High Priority</span>
              <strong>
                {highPriorityTasks}
              </strong>
            </div>

          </div>

        </div>

      </section>

      {/* =====================================================
          MAIN ANALYTICS GRID
      ===================================================== */}

      <div className="analytics-grid">

        {/* ===================================================
            TASK PROGRESS
        =================================================== */}

        <section className="analytics-card">

          <div className="analytics-card-header">

            <div>
              <h2>Task Progress</h2>

              <p>
                Current workload distribution
              </p>
            </div>

            <div className="analytics-header-icon">
              <Activity size={19} />
            </div>

          </div>

          <div className="task-progress-list">

            {/* TODO */}

            <div className="task-progress-item">

              <div className="task-progress-title">

                <div className="progress-label">

                  <span className="status-dot todo-dot"></span>

                  <span>
                    To Do
                  </span>

                </div>

                <strong>
                  {todoTasks}
                </strong>

              </div>

              <div className="progress-track">

                <div
                  className="progress-fill todo-fill"
                  style={{
                    width: `${
                      totalTasks
                        ? (todoTasks /
                            totalTasks) *
                          100
                        : 0
                    }%`,
                  }}
                />

              </div>

              <span className="progress-percentage">

                {totalTasks
                  ? Math.round(
                      (todoTasks /
                        totalTasks) *
                        100
                    )
                  : 0}
                %

              </span>

            </div>

            {/* IN PROGRESS */}

            <div className="task-progress-item">

              <div className="task-progress-title">

                <div className="progress-label">

                  <span className="status-dot progress-dot"></span>

                  <span>
                    In Progress
                  </span>

                </div>

                <strong>
                  {inProgressTasks}
                </strong>

              </div>

              <div className="progress-track">

                <div
                  className="progress-fill progress-fill-blue"
                  style={{
                    width: `${
                      totalTasks
                        ? (inProgressTasks /
                            totalTasks) *
                          100
                        : 0
                    }%`,
                  }}
                />

              </div>

              <span className="progress-percentage">

                {totalTasks
                  ? Math.round(
                      (inProgressTasks /
                        totalTasks) *
                        100
                    )
                  : 0}
                %

              </span>

            </div>

            {/* COMPLETED */}

            <div className="task-progress-item">

              <div className="task-progress-title">

                <div className="progress-label">

                  <span className="status-dot completed-dot"></span>

                  <span>
                    Completed
                  </span>

                </div>

                <strong>
                  {completedTasks}
                </strong>

              </div>

              <div className="progress-track">

                <div
                  className="progress-fill completed-fill"
                  style={{
                    width: `${
                      totalTasks
                        ? (completedTasks /
                            totalTasks) *
                          100
                        : 0
                    }%`,
                  }}
                />

              </div>

              <span className="progress-percentage">

                {completionRate}%

              </span>

            </div>

          </div>

        </section>

        {/* ===================================================
            PRIORITY
        =================================================== */}

        <section className="analytics-card">

          <div className="analytics-card-header">

            <div>
              <h2>Task Priority</h2>

              <p>
                Current workload by priority
              </p>
            </div>

            <div className="analytics-header-icon">
              <Target size={19} />
            </div>

          </div>

          <div className="priority-list">

            {/* HIGH */}

            <div className="priority-row">

              <div className="priority-top">

                <div className="priority-name">

                  <span className="priority-dot high"></span>

                  <span>
                    High
                  </span>

                </div>

                <strong>
                  {highPriorityTasks}
                </strong>

              </div>

              <div className="priority-track">

                <div
                  className="priority-fill high-fill"
                  style={{
                    width: `${
                      totalTasks
                        ? (highPriorityTasks /
                            totalTasks) *
                          100
                        : 0
                    }%`,
                  }}
                />

              </div>

            </div>

            {/* MEDIUM */}

            <div className="priority-row">

              <div className="priority-top">

                <div className="priority-name">

                  <span className="priority-dot medium"></span>

                  <span>
                    Medium
                  </span>

                </div>

                <strong>
                  {mediumPriorityTasks}
                </strong>

              </div>

              <div className="priority-track">

                <div
                  className="priority-fill medium-fill"
                  style={{
                    width: `${
                      totalTasks
                        ? (mediumPriorityTasks /
                            totalTasks) *
                          100
                        : 0
                    }%`,
                  }}
                />

              </div>

            </div>

            {/* LOW */}

            <div className="priority-row">

              <div className="priority-top">

                <div className="priority-name">

                  <span className="priority-dot low"></span>

                  <span>
                    Low
                  </span>

                </div>

                <strong>
                  {lowPriorityTasks}
                </strong>

              </div>

              <div className="priority-track">

                <div
                  className="priority-fill low-fill"
                  style={{
                    width: `${
                      totalTasks
                        ? (lowPriorityTasks /
                            totalTasks) *
                          100
                        : 0
                    }%`,
                  }}
                />

              </div>

            </div>

          </div>

        </section>

      </div>

      {/* =====================================================
          PROJECT PERFORMANCE
      ===================================================== */}

      <section className="projects-section">

        <div className="projects-section-header">

          <div>

            <span className="section-eyebrow">
              PROJECT PORTFOLIO
            </span>

            <h2>
              Project Performance
            </h2>

            <p>
              See how each project is progressing
              based on completed work.
            </p>

          </div>

          <div className="project-summary">

            <div>
              <strong>
                {activeProjects}
              </strong>

              <span>
                Active
              </span>
            </div>

            <div>
              <strong>
                {completedProjects}
              </strong>

              <span>
                Completed
              </span>
            </div>

            <div>
              <strong>
                {onHoldProjects}
              </strong>

              <span>
                On Hold
              </span>
            </div>

          </div>

        </div>

        {projectPerformance.length === 0 ? (

          <div className="empty-projects">

            <FolderKanban size={30} />

            <h3>
              No projects yet
            </h3>

            <p>
              Create a project to start
              tracking workspace performance.
            </p>

          </div>

        ) : (

          <div className="project-cards">

            {projectPerformance.map(
              (project) => (

                <div
                  className="project-card"
                  key={project._id}
                >

                  {/* PROJECT HEADER */}

                  <div className="project-card-header">

                    <div className="project-icon">
                      <FolderKanban size={20} />
                    </div>

                    <div className="project-heading">

                      <h3>
                        {project.name}
                      </h3>

                      <span
                        className={`project-status ${getProjectStatusClass(
                          project.status
                        )}`}
                      >
                        {project.status}
                      </span>

                    </div>

                  </div>

                  {/* PROGRESS */}

                  <div className="project-progress">

                    <div className="project-progress-top">

                      <span>
                        Progress
                      </span>

                      <strong>
                        {project.progress}%
                      </strong>

                    </div>

                    <div className="project-progress-track">

                      <div
                        className="project-progress-fill"
                        style={{
                          width: `${project.progress}%`,
                        }}
                      />

                    </div>

                  </div>

                  {/* TASK BREAKDOWN */}

                  <div className="project-task-summary">

                    <div>
                      <span>
                        Tasks
                      </span>

                      <strong>
                        {project.total}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Done
                      </span>

                      <strong>
                        {project.completed}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Active
                      </span>

                      <strong>
                        {project.inProgress}
                      </strong>
                    </div>

                  </div>

                  {/* MINI STATUS BAR */}

                  <div className="project-status-bar">

                    <div
                      className="project-todo-segment"
                      style={{
                        width: `${
                          project.total
                            ? (project.todo /
                                project.total) *
                              100
                            : 0
                        }%`,
                      }}
                    />

                    <div
                      className="project-progress-segment"
                      style={{
                        width: `${
                          project.total
                            ? (project.inProgress /
                                project.total) *
                              100
                            : 0
                        }%`,
                      }}
                    />

                    <div
                      className="project-completed-segment"
                      style={{
                        width: `${
                          project.total
                            ? (project.completed /
                                project.total) *
                              100
                            : 0
                        }%`,
                      }}
                    />

                  </div>

                  {/* PRIORITY */}

                  <div className="project-priority">

                    <span>
                      Priority
                    </span>

                    <div className="priority-mini">

                      {project.high > 0 && (
                        <span className="mini-priority high-mini">
                          {project.high} High
                        </span>
                      )}

                      {project.medium > 0 && (
                        <span className="mini-priority medium-mini">
                          {project.medium} Medium
                        </span>
                      )}

                      {project.low > 0 && (
                        <span className="mini-priority low-mini">
                          {project.low} Low
                        </span>
                      )}

                      {project.total === 0 && (
                        <span className="no-task-text">
                          No tasks
                        </span>
                      )}

                    </div>

                  </div>

                </div>

              )
            )}

          </div>

        )}

      </section>

      {/* =====================================================
          BOTTOM INSIGHT
      ===================================================== */}

      <section className="workspace-insight">

        <div className="insight-icon">
          <TrendingUp size={23} />
        </div>

        <div className="insight-content">

          <span>
            WORKSPACE MOMENTUM
          </span>

          <h3>

            {topProject
              ? `${topProject.name} is currently your strongest performing project.`
              : "Start your first project to build workspace momentum."}

          </h3>

          <p>

            {topProject
              ? `${topProject.completed} of ${topProject.total} tasks are completed, giving this project a ${topProject.progress}% completion rate.`
              : "Projects, tasks and AI actions will appear here as your workspace grows."}

          </p>

        </div>

      </section>

    </div>
  );
}

export default Dashboard;