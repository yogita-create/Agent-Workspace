import { useState, useEffect, useMemo } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Clock,
  AlertCircle,
  CheckCircle2,
  Plus,
  Share2,
  Folder,
  Tag,
  User,
  Edit3,
  Calendar as CalendarIcon,
} from "lucide-react";
import TaskModal from "./TaskModal";
import ShareTaskModal from "./ShareTaskModal";
import "./Calendar.css";

const API_URL = "http://localhost:5000";

const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

function Calendar({ onNavigate }) {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // Month navigation state
  const [currentDate, setCurrentDate] = useState(() => new Date());
  // Selected single date for the side inspector
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState(null);
  const [taskToShare, setTaskToShare] = useState(null);

  // ==========================================
  // FETCH TASKS & PROJECTS
  // ==========================================
  const fetchTasksAndProjects = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);
      setError("");

      const [tasksRes, projectsRes] = await Promise.all([
        fetch(`${API_URL}/api/tasks`),
        fetch(`${API_URL}/api/projects`),
      ]);

      const tasksData = await tasksRes.json();
      const projectsData = await projectsRes.json();

      if (tasksData.success) {
        setTasks(tasksData.tasks || []);
      }
      if (projectsData.success) {
        setProjects(projectsData.projects || []);
      }
    } catch (err) {
      console.error("Error loading calendar tasks:", err);
      setError("Failed to load tasks for calendar. Please check connection.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTasksAndProjects();
  }, []);

  // Update Status handler
  const handleStatusChange = async (taskId, newStatus) => {
    try {
      setTasks((prev) =>
        prev.map((t) => (t._id === taskId ? { ...t, status: newStatus } : t))
      );

      const res = await fetch(`${API_URL}/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        fetchTasksAndProjects();
      }
    } catch (err) {
      console.error("Status update error:", err);
      fetchTasksAndProjects();
    }
  };

  // Helper to normalize Date to YYYY-MM-DD string
  const toDateKey = (date) => {
    if (!date) return null;
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Helper to check urgency / deadline status
  const getTaskUrgency = (task) => {
    if (task.status === "done") return "done";
    if (!task.deadline && !task.dueDate) return "upcoming";

    const deadline = new Date(task.deadline || task.dueDate);
    const taskDay = new Date(
      deadline.getFullYear(),
      deadline.getMonth(),
      deadline.getDate()
    );

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (taskDay < today) return "overdue";
    if (taskDay.getTime() === today.getTime()) return "today";
    if (taskDay.getTime() === tomorrow.getTime()) return "tomorrow";
    return "upcoming";
  };

  // Map tasks by date key
  const tasksByDate = useMemo(() => {
    const map = {};
    tasks.forEach((task) => {
      const key = toDateKey(task.deadline || task.dueDate);
      if (key) {
        if (!map[key]) map[key] = [];
        map[key].push(task);
      }
    });
    return map;
  }, [tasks]);

  // Overall workspace deadline summary for top banner
  const deadlineSummary = useMemo(() => {
    let overdueCount = 0;
    let todayCount = 0;
    let tomorrowCount = 0;
    let upcomingCount = 0;

    tasks.forEach((t) => {
      const urgency = getTaskUrgency(t);
      if (urgency === "overdue") overdueCount++;
      else if (urgency === "today") todayCount++;
      else if (urgency === "tomorrow") tomorrowCount++;
      else if (urgency === "upcoming") upcomingCount++;
    });

    if (overdueCount > 0) {
      return {
        type: "overdue",
        title: `${overdueCount} task${overdueCount > 1 ? "s" : ""} overdue`,
        subtitle: "Attention needed on past-due deliverables.",
      };
    }
    if (todayCount > 0) {
      return {
        type: "today",
        title: `${todayCount} task${todayCount > 1 ? "s" : ""} due today`,
        subtitle: "Prioritize today's scheduled commitments.",
      };
    }
    if (tomorrowCount > 0) {
      return {
        type: "tomorrow",
        title: `${tomorrowCount} task${tomorrowCount > 1 ? "s" : ""} due tomorrow`,
        subtitle: "Plan ahead for tomorrow's deadlines.",
      };
    }
    return {
      type: "upcoming",
      title: "All tasks on schedule",
      subtitle: `${upcomingCount} upcoming task${upcomingCount === 1 ? "" : "s"} planned ahead.`,
    };
  }, [tasks]);

  // Generate Month Days Grid
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const days = [];

    // Prev month padding days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const dateObj = new Date(year, month - 1, d);
      days.push({
        date: dateObj,
        dayNumber: d,
        isCurrentMonth: false,
        dateKey: toDateKey(dateObj),
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      days.push({
        date: dateObj,
        dayNumber: d,
        isCurrentMonth: true,
        dateKey: toDateKey(dateObj),
      });
    }

    // Next month padding days to complete grid (multiples of 7, usually 35 or 42)
    const totalCells = Math.ceil(days.length / 7) * 7;
    const remaining = totalCells - days.length;
    for (let d = 1; d <= remaining; d++) {
      const dateObj = new Date(year, month + 1, d);
      days.push({
        date: dateObj,
        dayNumber: d,
        isCurrentMonth: false,
        dateKey: toDateKey(dateObj),
      });
    }

    return days;
  }, [currentDate]);

  // Tasks scheduled for the currently selected day
  const selectedDateKey = toDateKey(selectedDate);
  const selectedDayTasks = tasksByDate[selectedDateKey] || [];

  // Count total tasks in the displayed month
  const currentMonthTaskCount = useMemo(() => {
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();
    return tasks.filter((t) => {
      if (!t.deadline && !t.dueDate) return false;
      const d = new Date(t.deadline || t.dueDate);
      return d.getFullYear() === y && d.getMonth() === m;
    }).length;
  }, [tasks, currentDate]);

  // Month navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleGoToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  // Month name formatting
  const monthYearString = currentDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  // Selected date full string formatting
  const selectedDateFullString = selectedDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const todayKey = toDateKey(new Date());

  return (
    <div className="calendar-page">
      {/* ==========================================
          HEADER
      ========================================== */}
      <header className="calendar-header">
        <div className="calendar-title-wrap">
          <div className="calendar-title-icon">
            <CalendarDays size={24} />
          </div>
          <div>
            <h1>Calendar</h1>
            <p>Manage your tasks and deadlines in one place.</p>
          </div>
        </div>

        <div className="calendar-header-actions">
          <button
            type="button"
            className="calendar-refresh-btn"
            onClick={() => fetchTasksAndProjects(true)}
            disabled={refreshing}
            title="Refresh tasks"
          >
            <RotateCw size={15} className={refreshing ? "spin-icon" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </header>

      {/* ==========================================
          MAIN 2-COLUMN VIEW (CALENDAR + INSPECTOR)
      ========================================== */}
      <div className="calendar-main-grid">
        {/* LEFT COLUMN: THE MONTH CALENDAR */}
        <div className="calendar-card">
          {/* Top Bar inside card: Month info + navigation controls */}
          <div className="calendar-card-header">
            <div>
              <h2 className="calendar-month-title">{monthYearString}</h2>
              <span className="calendar-tasks-count">
                {currentMonthTaskCount} scheduled tasks
              </span>
            </div>

            <div className="calendar-nav-controls">
              <button
                type="button"
                className="calendar-today-btn"
                onClick={handleGoToToday}
              >
                today
              </button>

              <div className="calendar-arrow-group">
                <button
                  type="button"
                  className="calendar-nav-arrow"
                  onClick={handlePrevMonth}
                  title="Previous Month"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  type="button"
                  className="calendar-nav-arrow"
                  onClick={handleNextMonth}
                  title="Next Month"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Weekday column names */}
          <div className="calendar-weekdays-row">
            {WEEKDAYS.map((day) => (
              <div key={day} className="calendar-weekday-col">
                {day}
              </div>
            ))}
          </div>

          {/* 7-column calendar grid */}
          <div className="calendar-days-grid">
            {calendarDays.map((cell, index) => {
              const dayTasks = tasksByDate[cell.dateKey] || [];
              const isSelected = cell.dateKey === selectedDateKey;
              const isToday = cell.dateKey === todayKey;

              return (
                <div
                  key={`${cell.dateKey}-${index}`}
                  className={`calendar-day-cell ${
                    !cell.isCurrentMonth ? "other-month" : ""
                  } ${isSelected ? "selected-day" : ""} ${
                    isToday ? "today-cell" : ""
                  }`}
                  onClick={() => setSelectedDate(cell.date)}
                >
                  <div className="day-cell-top">
                    <span
                      className={`day-number ${
                        isSelected ? "day-number-selected" : ""
                      } ${isToday && !isSelected ? "day-number-today" : ""}`}
                    >
                      {cell.dayNumber}
                    </span>
                  </div>

                  {/* Task Pills inside cell */}
                  <div className="day-tasks-container">
                    {dayTasks.slice(0, 3).map((t) => {
                      const urgency = getTaskUrgency(t);
                      return (
                        <div
                          key={t._id}
                          className={`calendar-task-pill urgency-${urgency}`}
                          title={`${t.taskKey || "TSK"}: ${t.title} (${t.status})`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDate(cell.date);
                            setTaskToEdit(t);
                          }}
                        >
                          <span className="pill-title">{t.title}</span>
                        </div>
                      );
                    })}
                    {dayTasks.length > 3 && (
                      <div className="calendar-more-pill">
                        +{dayTasks.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Calendar Legend */}
          <div className="calendar-legend-bar">
            <div className="legend-item">
              <span className="legend-dot dot-overdue" />
              <span>Overdue</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot dot-today" />
              <span>Today</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot dot-tomorrow" />
              <span>Tomorrow</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot dot-upcoming" />
              <span>Upcoming</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: SMART BANNER + SELECTED DATE INSPECTOR */}
        <div className="calendar-sidebar-column">
          {/* Smart Deadline Status Card */}
          <div className={`calendar-summary-card banner-${deadlineSummary.type}`}>
            <div className="summary-card-icon">
              <CalendarIcon size={20} />
            </div>
            <div className="summary-card-content">
              <strong>{deadlineSummary.title}</strong>
              <p>{deadlineSummary.subtitle}</p>
            </div>
          </div>

          {/* Selected Date Inspector Card */}
          <div className="selected-date-inspector">
            <div className="inspector-header">
              <div className="inspector-date-box">
                <div className="inspector-icon">
                  <CalendarIcon size={18} />
                </div>
                <div>
                  <h3>{selectedDateFullString}</h3>
                  <span className="inspector-task-count">
                    {selectedDayTasks.length} task
                    {selectedDayTasks.length === 1 ? "" : "s"}
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="inspector-add-btn"
                onClick={() => setShowCreateModal(true)}
                title="Add task for this date"
              >
                <Plus size={16} />
              </button>
            </div>

            <div className="inspector-body">
              {selectedDayTasks.length === 0 ? (
                <div className="inspector-empty-state">
                  <div className="empty-check-circle">
                    <CheckCircle2 size={36} />
                  </div>
                  <h4>No tasks scheduled</h4>
                  <p>There are no deadlines for this date.</p>
                  <button
                    type="button"
                    className="empty-create-btn"
                    onClick={() => setShowCreateModal(true)}
                  >
                    <Plus size={15} />
                    <span>Create Task</span>
                  </button>
                </div>
              ) : (
                <div className="inspector-tasks-list">
                  {selectedDayTasks.map((task) => {
                    const urgency = getTaskUrgency(task);
                    const projectObj = projects.find(
                      (p) =>
                        p._id === (task.projectId?._id || task.projectId)
                    );

                    return (
                      <div
                        key={task._id}
                        className={`inspector-task-card urgency-border-${urgency}`}
                      >
                        <div className="task-card-header">
                          <span className="task-key-tag">
                            {task.taskKey || "TSK"}
                          </span>
                          {projectObj && (
                            <span className="task-project-tag">
                              <Folder size={11} />
                              {projectObj.title}
                            </span>
                          )}
                          <span className={`task-urgency-tag urgency-${urgency}`}>
                            {urgency}
                          </span>
                        </div>

                        <h4 className="inspector-task-title">{task.title}</h4>

                        {task.description && (
                          <p className="inspector-task-desc">
                            {task.description}
                          </p>
                        )}

                        <div className="inspector-task-meta">
                          <div className="task-meta-item">
                            <span className="meta-label">Status:</span>
                            <select
                              value={task.status}
                              onChange={(e) =>
                                handleStatusChange(task._id, e.target.value)
                              }
                              className={`status-select status-${task.status}`}
                            >
                              <option value="todo">To Do</option>
                              <option value="in_progress">In Progress</option>
                              <option value="in_review">In Review</option>
                              <option value="done">Done</option>
                            </select>
                          </div>

                          <div className="task-meta-item">
                            <span className="meta-label">Priority:</span>
                            <span
                              className={`priority-pill priority-${
                                task.priority || "medium"
                              }`}
                            >
                              {task.priority || "medium"}
                            </span>
                          </div>
                        </div>

                        <div className="inspector-task-footer">
                          <div className="task-assignee-info">
                            <div className="assignee-avatar-mini">
                              {task.assignee?.name
                                ? task.assignee.name.charAt(0).toUpperCase()
                                : "U"}
                            </div>
                            <span>
                              {task.assignee?.name || "Unassigned"}
                            </span>
                          </div>

                          <div className="task-action-btns">
                            <button
                              type="button"
                              className="task-action-icon-btn"
                              onClick={() => setTaskToShare(task)}
                              title="Share Task"
                            >
                              <Share2 size={14} />
                            </button>
                            <button
                              type="button"
                              className="task-action-icon-btn"
                              onClick={() => setTaskToEdit(task)}
                              title="Edit Task"
                            >
                              <Edit3 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ==========================================
          MODALS
      ========================================== */}
      {showCreateModal && (
        <TaskModal
          taskToEdit={null}
          projects={projects}
          onClose={() => setShowCreateModal(false)}
          onTaskSaved={(savedTask) => {
            fetchTasksAndProjects();
            setShowCreateModal(false);
          }}
        />
      )}

      {taskToEdit && (
        <TaskModal
          taskToEdit={taskToEdit}
          projects={projects}
          onClose={() => setTaskToEdit(null)}
          onTaskSaved={(savedTask) => {
            fetchTasksAndProjects();
            setTaskToEdit(null);
          }}
        />
      )}

      {taskToShare && (
        <ShareTaskModal
          task={taskToShare}
          onClose={() => setTaskToShare(null)}
          onTaskUpdated={(updatedTask) => {
            fetchTasksAndProjects();
          }}
        />
      )}
    </div>
  );
}

export default Calendar;
