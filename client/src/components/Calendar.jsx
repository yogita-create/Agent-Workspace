import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  CalendarDays,
  Clock3,
  AlertCircle,
  CheckCircle2,
  FolderKanban,
} from "lucide-react";

import "./Calendar.css";

const API_URL = "http://localhost:5000";

// ==========================================
// DATE HELPERS
// ==========================================

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getTodayKey() {
  return formatDateKey(new Date());
}

function getTaskDateKey(deadline) {
  if (!deadline) return null;

  const date = new Date(deadline);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return formatDateKey(date);
}

function isSameDate(date1, date2) {
  return formatDateKey(date1) === formatDateKey(date2);
}

function getDateWithoutTime(date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
}

// ==========================================
// TASK STATUS
// ==========================================

function getDeadlineType(deadline) {
  if (!deadline) return "upcoming";

  const today = getDateWithoutTime(new Date());
  const taskDate = getDateWithoutTime(new Date(deadline));

  const difference =
    (taskDate.getTime() - today.getTime()) /
    (1000 * 60 * 60 * 24);

  if (difference < 0) {
    return "overdue";
  }

  if (difference === 0) {
    return "today";
  }

  if (difference === 1) {
    return "tomorrow";
  }

  return "upcoming";
}

function getDeadlineLabel(deadline) {
  const type = getDeadlineType(deadline);

  switch (type) {
    case "overdue":
      return "Overdue";

    case "today":
      return "Due Today";

    case "tomorrow":
      return "Due Tomorrow";

    default:
      return "Upcoming";
  }
}

function formatTaskTime(deadline) {
  if (!deadline) return "";

  const date = new Date(deadline);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatSelectedDate(date) {
  return date.toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// ==========================================
// BUILD CALENDAR DAYS
// ==========================================

function buildCalendarDays(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const daysInMonth = lastDay.getDate();

  const previousMonthDays = firstDay.getDay();

  const totalCells = Math.ceil(
    (previousMonthDays + daysInMonth) / 7
  ) * 7;

  const days = [];

  for (let index = 0; index < totalCells; index++) {
    const date = new Date(
      year,
      month,
      index - previousMonthDays + 1
    );

    days.push({
      date,
      currentMonth: date.getMonth() === month,
      key: formatDateKey(date),
    });
  }

  return days;
}

// ==========================================
// CALENDAR COMPONENT
// ==========================================

function Calendar() {
  const today = new Date();

  const [currentMonth, setCurrentMonth] = useState(
    today.getMonth()
  );

  const [currentYear, setCurrentYear] = useState(
    today.getFullYear()
  );

  const [selectedDate, setSelectedDate] = useState(today);

  const [tasks, setTasks] = useState([]);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");

  // ==========================================
  // FETCH TASKS
  // ==========================================

  const loadTasks = async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await fetch(
        `${API_URL}/api/tasks`
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch tasks: ${response.status}`
        );
      }

      const data = await response.json();

      let taskList = [];

      if (Array.isArray(data)) {
        taskList = data;
      } else if (Array.isArray(data.tasks)) {
        taskList = data.tasks;
      } else if (Array.isArray(data.data)) {
        taskList = data.data;
      }

      setTasks(taskList);
    } catch (err) {
      console.error("Calendar task loading error:", err);

      setError(
        "Unable to load tasks. Please check the server connection."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  // ==========================================
  // CALENDAR DAYS
  // ==========================================

  const calendarDays = useMemo(() => {
    return buildCalendarDays(
      currentYear,
      currentMonth
    );
  }, [currentYear, currentMonth]);

  // ==========================================
  // TASKS WITH DEADLINES
  // ==========================================

  const deadlineTasks = useMemo(() => {
    return tasks.filter(
      (task) =>
        task.deadline &&
        !Number.isNaN(
          new Date(task.deadline).getTime()
        )
    );
  }, [tasks]);

  // ==========================================
  // TASKS FOR SELECTED DATE
  // ==========================================

  const selectedDateTasks = useMemo(() => {
    const selectedKey = formatDateKey(selectedDate);

    return deadlineTasks
      .filter(
        (task) =>
          getTaskDateKey(task.deadline) ===
          selectedKey
      )
      .sort((a, b) => {
        return (
          new Date(a.deadline) -
          new Date(b.deadline)
        );
      });
  }, [selectedDate, deadlineTasks]);

  // ==========================================
  // TASKS BY DATE
  // ==========================================

  const tasksByDate = useMemo(() => {
    const grouped = {};

    deadlineTasks.forEach((task) => {
      const key = getTaskDateKey(task.deadline);

      if (!key) return;

      if (!grouped[key]) {
        grouped[key] = [];
      }

      grouped[key].push(task);
    });

    return grouped;
  }, [deadlineTasks]);

  // ==========================================
  // SUMMARY
  // ==========================================

  const overdueCount = useMemo(() => {
    return deadlineTasks.filter(
      (task) =>
        getDeadlineType(task.deadline) ===
        "overdue" &&
        task.status !== "done"
    ).length;
  }, [deadlineTasks]);

  const todayCount = useMemo(() => {
    return deadlineTasks.filter(
      (task) =>
        getDeadlineType(task.deadline) ===
          "today" &&
        task.status !== "done"
    ).length;
  }, [deadlineTasks]);

  const tomorrowCount = useMemo(() => {
    return deadlineTasks.filter(
      (task) =>
        getDeadlineType(task.deadline) ===
          "tomorrow" &&
        task.status !== "done"
    ).length;
  }, [deadlineTasks]);

  // ==========================================
  // NAVIGATE MONTH
  // ==========================================

  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  const goToToday = () => {
    const now = new Date();

    setCurrentMonth(now.getMonth());
    setCurrentYear(now.getFullYear());
    setSelectedDate(now);
  };

  // ==========================================
  // GET PROJECT NAME
  // ==========================================

  const getProjectName = (task) => {
    if (!task.projectId) {
      return "No project";
    }

    if (typeof task.projectId === "object") {
      return (
        task.projectId.name ||
        task.projectId.title ||
        "No project"
      );
    }

    return "Project";
  };

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="calendar-page">

      {/* ======================================
          HEADER
      ====================================== */}

      <div className="calendar-header">

        <div className="calendar-header-content">

          <div className="calendar-header-icon">
            <CalendarDays size={24} />
          </div>

          <div>
            <h1>Calendar</h1>

            <p>
              Manage your tasks and deadlines in one place.
            </p>
          </div>

        </div>

        <button
          className="calendar-refresh-button"
          onClick={() => loadTasks(true)}
          disabled={refreshing}
        >
          <RefreshCw
            size={16}
            className={
              refreshing
                ? "calendar-refresh-spinning"
                : ""
            }
          />

          {refreshing ? "Refreshing..." : "Refresh"}
        </button>

      </div>

      {/* ======================================
          DEADLINE ALERTS
      ====================================== */}

      {!loading && !error && (
        <div className="calendar-alerts">

          {overdueCount > 0 && (
            <div className="calendar-alert overdue">
              <AlertCircle size={19} />

              <div>
                <strong>
                  {overdueCount} overdue{" "}
                  {overdueCount === 1
                    ? "task"
                    : "tasks"}
                </strong>

                <span>
                  These tasks have passed their deadlines.
                </span>
              </div>
            </div>
          )}

          {todayCount > 0 && (
            <div className="calendar-alert today">
              <Clock3 size={19} />

              <div>
                <strong>
                  {todayCount} task
                  {todayCount === 1 ? "" : "s"} due today
                </strong>

                <span>
                  Make sure today's deadlines are completed.
                </span>
              </div>
            </div>
          )}

          {tomorrowCount > 0 && (
            <div className="calendar-alert tomorrow">
              <CalendarDays size={19} />

              <div>
                <strong>
                  {tomorrowCount} task
                  {tomorrowCount === 1 ? "" : "s"} due tomorrow
                </strong>

                <span>
                  Plan ahead for tomorrow's deadlines.
                </span>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ======================================
          ERROR
      ====================================== */}

      {error && (
        <div className="calendar-error">
          <AlertCircle size={20} />

          <div>
            <strong>Unable to load calendar</strong>

            <p>{error}</p>
          </div>

          <button onClick={() => loadTasks()}>
            Try Again
          </button>
        </div>
      )}

      {/* ======================================
          MAIN CALENDAR
      ====================================== */}

      {!error && (
        <div className="calendar-layout">

          {/* ==================================
              CALENDAR CARD
          ================================== */}

          <section className="calendar-card">

            {/* MONTH HEADER */}

            <div className="calendar-navigation">

              <div>
                <h2>
                  {MONTH_NAMES[currentMonth]}{" "}
                  {currentYear}
                </h2>

                <span>
                  {deadlineTasks.length} scheduled{" "}
                  {deadlineTasks.length === 1
                    ? "task"
                    : "tasks"}
                </span>
              </div>

              <div className="calendar-navigation-actions">

                <button
                  onClick={goToToday}
                  className="today-button"
                >
                  Today
                </button>

                <button
                  onClick={goToPreviousMonth}
                  className="calendar-nav-button"
                  aria-label="Previous month"
                >
                  <ChevronLeft size={19} />
                </button>

                <button
                  onClick={goToNextMonth}
                  className="calendar-nav-button"
                  aria-label="Next month"
                >
                  <ChevronRight size={19} />
                </button>

              </div>

            </div>

            {/* WEEK DAYS */}

            <div className="calendar-weekdays">

              {WEEK_DAYS.map((day) => (
                <div
                  key={day}
                  className="calendar-weekday"
                >
                  {day}
                </div>
              ))}

            </div>

            {/* CALENDAR GRID */}

            <div className="calendar-grid">

              {calendarDays.map(
                ({ date, currentMonth: isCurrentMonth, key }) => {

                  const dayTasks =
                    tasksByDate[key] || [];

                  const isToday =
                    isSameDate(date, today);

                  const isSelected =
                    isSameDate(date, selectedDate);

                  return (
                    <button
                      key={key}
                      className={`
                        calendar-day
                        ${!isCurrentMonth ? "outside-month" : ""}
                        ${isToday ? "today" : ""}
                        ${isSelected ? "selected" : ""}
                      `}
                      onClick={() =>
                        setSelectedDate(date)
                      }
                    >

                      <span className="calendar-day-number">
                        {date.getDate()}
                      </span>

                      {dayTasks.length > 0 && (
                        <div className="calendar-day-tasks">

                          {dayTasks
                            .slice(0, 3)
                            .map((task) => {

                              const type =
                                getDeadlineType(
                                  task.deadline
                                );

                              return (
                                <span
                                  key={task._id}
                                  className={`
                                    calendar-task-dot
                                    ${type}
                                  `}
                                  title={task.title}
                                >
                                  <span>
                                    {task.title}
                                  </span>
                                </span>
                              );
                            })}

                          {dayTasks.length > 3 && (
                            <span className="more-tasks">
                              +{dayTasks.length - 3} more
                            </span>
                          )}

                        </div>
                      )}

                    </button>
                  );
                }
              )}

            </div>

            {/* LEGEND */}

            <div className="calendar-legend">

              <span>
                <i className="legend-dot overdue" />
                Overdue
              </span>

              <span>
                <i className="legend-dot today" />
                Today
              </span>

              <span>
                <i className="legend-dot tomorrow" />
                Tomorrow
              </span>

              <span>
                <i className="legend-dot upcoming" />
                Upcoming
              </span>

            </div>

          </section>

          {/* ==================================
              SELECTED DATE TASKS
          ================================== */}

          <aside className="selected-date-card">

            <div className="selected-date-header">

              <div className="selected-date-icon">
                <CalendarDays size={19} />
              </div>

              <div>
                <h2>
                  {formatSelectedDate(selectedDate)}
                </h2>

                <p>
                  {selectedDateTasks.length}{" "}
                  {selectedDateTasks.length === 1
                    ? "task"
                    : "tasks"}
                </p>
              </div>

            </div>

            <div className="selected-date-tasks">

              {loading ? (
                <div className="calendar-loading">
                  <div className="calendar-loader" />
                  <span>Loading tasks...</span>
                </div>
              ) : selectedDateTasks.length === 0 ? (
                <div className="no-calendar-tasks">

                  <CheckCircle2 size={34} />

                  <strong>
                    No tasks scheduled
                  </strong>

                  <span>
                    There are no deadlines for this date.
                  </span>

                </div>
              ) : (
                selectedDateTasks.map((task) => {

                  const type =
                    getDeadlineType(
                      task.deadline
                    );

                  return (
                    <div
                      key={task._id}
                      className={`calendar-task-card ${type}`}
                    >

                      <div className="calendar-task-card-top">

                        <span
                          className={`calendar-task-status ${type}`}
                        >
                          {getDeadlineLabel(
                            task.deadline
                          )}
                        </span>

                        <span
                          className={`
                            calendar-priority
                            ${task.priority || "medium"}
                          `}
                        >
                          {task.priority || "medium"}
                        </span>

                      </div>

                      <h3>{task.title}</h3>

                      {task.description && (
                        <p>
                          {task.description}
                        </p>
                      )}

                      <div className="calendar-task-meta">

                        <span>
                          <Clock3 size={13} />

                          {formatTaskTime(
                            task.deadline
                          )}
                        </span>

                        <span>
                          <FolderKanban size={13} />

                          {getProjectName(task)}
                        </span>

                      </div>

                    </div>
                  );
                })
              )}

            </div>

          </aside>

        </div>
      )}

    </div>
  );
}

export default Calendar;