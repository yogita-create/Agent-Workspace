import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, LogIn, AlertCircle, Brain } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import "./Auth.css";

function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      setError("Please enter both email and password.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const result = await login(formData.email, formData.password);

      if (result.success) {
        navigate("/");
      } else {
        setError(result.message || "Invalid credentials");
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* HEADER */}
        <div className="auth-header">
          <div className="auth-logo-icon">
            <Brain size={24} />
          </div>
          <h1>Welcome Back</h1>
          <p>Sign in to your Agent Workspace account</p>
        </div>

        {/* ERROR MESSAGE */}
        {error && (
          <div className="auth-error-banner">
            <AlertCircle size={17} />
            <span>{error}</span>
          </div>
        )}

        {/* FORM */}
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label htmlFor="login-email">Email Address</label>
            <div className="auth-input-wrap">
              <span className="auth-input-icon">
                <Mail size={16} />
              </span>
              <input
                id="login-email"
                type="email"
                name="email"
                placeholder="name@company.com"
                value={formData.email}
                onChange={handleChange}
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="login-password">Password</label>
            <div className="auth-input-wrap">
              <span className="auth-input-icon">
                <Lock size={16} />
              </span>
              <input
                id="login-password"
                type="password"
                name="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
                autoComplete="current-password"
              />
            </div>
          </div>

          <button
            type="submit"
            className="auth-submit-btn"
            disabled={loading}
          >
            <LogIn size={17} />
            <span>{loading ? "Signing in..." : "Sign In"}</span>
          </button>
        </form>

        {/* FOOTER */}
        <div className="auth-footer">
          <span>Don't have an account?</span>
          <Link to="/register">Create an account</Link>
        </div>
      </div>
    </div>
  );
}

export default Login;
