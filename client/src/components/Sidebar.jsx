import "./Sidebar.css";
import { LayoutDashboard, FolderOpenDot, ListTodo, Bell, Bot, CalendarDays, Brain } from 'lucide-react';

function Sidebar({
  activePage,
  onNavigate,
}) {
  const menuItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      id: "projects",
      label: "Projects",
      icon: FolderOpenDot,
    },
    {
      id: "tasks",
      label: "My Tasks",
      icon: ListTodo,
    },
    {
      id: "alerts",
      label: "Alerts",
      icon: Bell,
    },
    {
      id: "ai-agent",
      label: "AI Agent",
      icon: Bot,
    },
    {
      id: "calendar",
      label: "Calendar",
      icon: CalendarDays,
    },
  ];

  return (
    <aside className="sidebar">

      {/* =====================================
          LOGO
      ===================================== */}

      <div className="sidebar-logo">

        <div>
          <Brain />
          <h2>Agent Workspace</h2>
        </div>

      </div>


      {/* =====================================
          MAIN NAVIGATION
      ===================================== */}

      <nav className="sidebar-nav">

        {menuItems.map((item) => (

          <button
            key={item.id}
            type="button"
            className={
              activePage === item.id
                ? "sidebar-item active"
                : "sidebar-item"
            }
            onClick={() =>
              onNavigate(item.id)
            }
          >

            <span className="nav-icon">
              {typeof item.icon === "string" ? (
                item.icon
              ) : (
                <item.icon size={20} />
              )}
            </span>

            <span>
              {item.label}
            </span>

          </button>

        ))}

      </nav>


      {/* =====================================
          USER
      ===================================== */}

      <div className="sidebar-user">

        <div className="user-avatar">
          Y
        </div>

        <div>
          <strong>
            Yogita
          </strong>

          <small>
            Workspace User
          </small>
        </div>

      </div>

    </aside>
  );
}

export default Sidebar;