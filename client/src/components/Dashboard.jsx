import "./Dashboard.css";

function Dashboard({ onNavigate }) {
  return (
    <div className="dashboard">

      {/* PAGE HEADER */}
      <div className="dashboard-header">

        <div>
          <h1>Main Workspace</h1>

          <p>
            Welcome to your project management workspace
          </p>
        </div>


      </div>


      {/* WELCOME */}
      <div className="dashboard-welcome">

        <h2>
          Welcome to Agent Workspace 
        </h2>

      </div>

    </div>
  );
}

export default Dashboard;