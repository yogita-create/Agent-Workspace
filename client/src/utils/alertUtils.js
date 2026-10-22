// Helper functions to calculate deadline alerts (Overdue, Due Today, Due Tomorrow, Upcoming)

export function getTaskAlerts(tasks = []) {
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  const overdue = [];
  const dueToday = [];
  const dueTomorrow = [];
  const upcoming = [];

  tasks.forEach((task) => {
    // Skip done/completed tasks
    if (task.status === "done") return;
    if (!task.deadline) return;

    const taskDate = new Date(task.deadline);
    const taskDateStr = taskDate.toISOString().split("T")[0];

    // Reset times to compare pure dates
    const taskMidnight = new Date(taskDateStr).getTime();
    const todayMidnight = new Date(todayStr).getTime();
    const diffDays = Math.round(
      (todayMidnight - taskMidnight) / (1000 * 60 * 60 * 24)
    );

    const alertItem = {
      task,
      deadlineDate: taskDate,
      deadlineStr: taskDate.toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
      projectName: task.projectId?.name || "Workspace",
      priority: task.priority || "medium",
      title: task.title,
      taskKey: task.taskKey || "TSK",
      assigneeName: task.assignee?.name || "Unassigned",
    };

    if (diffDays > 0) {
      // Overdue
      overdue.push({
        ...alertItem,
        type: "overdue",
        badge: "OVERDUE",
        daysOverdue: diffDays,
        message: `${task.title} is overdue by ${diffDays} day${
          diffDays > 1 ? "s" : ""
        }.`,
      });
    } else if (taskDateStr === todayStr) {
      // Due Today
      dueToday.push({
        ...alertItem,
        type: "due_today",
        badge: "DUE TODAY",
        message: `${task.title} is due today.`,
      });
    } else if (taskDateStr === tomorrowStr) {
      // Due Tomorrow
      dueTomorrow.push({
        ...alertItem,
        type: "due_tomorrow",
        badge: "DUE TOMORROW",
        message: `${task.title} is due tomorrow.`,
      });
    } else if (diffDays < 0 && diffDays >= -7) {
      // Upcoming in next 7 days
      const daysLeft = Math.abs(diffDays);
      upcoming.push({
        ...alertItem,
        type: "upcoming",
        badge: "UPCOMING",
        daysLeft,
        message: `${task.title} is due in ${daysLeft} day${
          daysLeft > 1 ? "s" : ""
        }.`,
      });
    }
  });

  const allAlerts = [...overdue, ...dueToday, ...dueTomorrow, ...upcoming];

  return {
    allAlerts,
    overdue,
    dueToday,
    dueTomorrow,
    upcoming,
    totalCount: allAlerts.length,
    overdueCount: overdue.length,
    dueTodayCount: dueToday.length,
    dueTomorrowCount: dueTomorrow.length,
    upcomingCount: upcoming.length,
    activeAlertsCount: allAlerts.length,
  };
}
