import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, UserPlus } from "lucide-react";
import "./Register.css";

const API_URL = "http://localhost:5000";

function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ==========================================
  // HANDLE INPUT CHANGE
  // ==========================================

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (error) {
      setError("");
    }

    if (success) {
      setSuccess("");
    }
  };

  // ==========================================
  // VALIDATE FORM
  // ==========================================

  const validateForm = () => {
    const name = formData.name.trim();
    const email = formData.email.trim();
    const password = formData.password;
    const confirmPassword = formData.confirmPassword;

    if (!name) {
      return "Please enter your name.";
    }

    if (name.length < 2) {
      return "Name must contain at least 2 characters.";
    }

    if (!email) {
      return "Please enter your email.";
    }

    if (!password) {
      return "Please enter a password.";
    }

    if (password.length < 6) {
      return "Password must contain at least 6 characters.";
    }

    if (!confirmPassword) {
      return "Please confirm your password.";
    }

    if (password !== confirmPassword) {
      return "Passwords do not match.";
    }

    return null;
  };

  // ==========================================
  // REGISTER
  // ==========================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${API_URL}/api/auth/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: formData.name.trim(),
            email: formData.email.trim(),
            password: formData.password,
          }),
        }
      );

      /*
       * Do not blindly call response.json().
       *
       * If Express returns an HTML error page,
       * response.json() would cause:
       *
       * Unexpected token '<'
       */

      const contentType =
        response.headers.get("content-type") || "";

      const data = contentType.includes("application/json")
        ? await response.json()
        : null;

      if (!response.ok) {
        throw new Error(
          data?.message ||
            `Registration failed (${response.status})`
        );
      }

      if (!data?.success) {
        throw new Error(
          data?.message ||
            "Registration failed. Please try again."
        );
      }

      setSuccess(
        data.message ||
          "Account created successfully."
      );

      /*
       * Do not automatically store a JWT here.
       *
       * Registration should create the account.
       * Login will handle authentication and token storage.
       */

      setFormData({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
      });

      /*
       * Give the user a moment to see the success message,
       * then move to Login.
       */

      setTimeout(() => {
        navigate("/auth/login");
      }, 1000);
    } catch (error) {
      console.error(
        "Registration error:",
        error
      );

      setError(
        error.message ||
          "Unable to create your account. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">

        {/* ======================================
            HEADER
        ====================================== */}

        <div className="auth-header">
          <div className="auth-icon">
            <UserPlus size={24} />
          </div>

          <h1>Create your account</h1>

          <p>
            Create an account to start using your
            workspace
          </p>
        </div>

        {/* ======================================
            ERROR
        ====================================== */}

        {error && (
          <div className="auth-error">
            {error}
          </div>
        )}

        {/* ======================================
            SUCCESS
        ====================================== */}

        {success && (
          <div className="auth-success">
            {success}
          </div>
        )}

        {/* ======================================
            FORM
        ====================================== */}

        <form
          className="auth-form"
          onSubmit={handleSubmit}
        >

          {/* NAME */}

          <div className="form-group">
            <label htmlFor="name">
              Full Name
            </label>

            <input
              id="name"
              name="name"
              type="text"
              placeholder="Enter your name"
              value={formData.name}
              onChange={handleChange}
              autoComplete="name"
              disabled={loading}
            />
          </div>

          {/* EMAIL */}

          <div className="form-group">
            <label htmlFor="email">
              Email
            </label>

            <input
              id="email"
              name="email"
              type="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              autoComplete="email"
              disabled={loading}
            />
          </div>

          {/* PASSWORD */}

          <div className="form-group">
            <label htmlFor="password">
              Password
            </label>

            <div className="password-wrapper">
              <input
                id="password"
                name="password"
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                placeholder="Create a password"
                value={formData.password}
                onChange={handleChange}
                autoComplete="new-password"
                disabled={loading}
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() =>
                  setShowPassword(
                    (prev) => !prev
                  )
                }
                aria-label={
                  showPassword
                    ? "Hide password"
                    : "Show password"
                }
                disabled={loading}
              >
                {showPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>
          </div>

          {/* CONFIRM PASSWORD */}

          <div className="form-group">
            <label htmlFor="confirmPassword">
              Confirm Password
            </label>

            <div className="password-wrapper">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={
                  showConfirmPassword
                    ? "text"
                    : "password"
                }
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleChange}
                autoComplete="new-password"
                disabled={loading}
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() =>
                  setShowConfirmPassword(
                    (prev) => !prev
                  )
                }
                aria-label={
                  showConfirmPassword
                    ? "Hide password"
                    : "Show password"
                }
                disabled={loading}
              >
                {showConfirmPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>
          </div>

          {/* SUBMIT */}

          <button
            type="submit"
            className="auth-submit-button"
            disabled={loading}
          >
            {loading ? (
              "Creating account..."
            ) : (
              <>
                <UserPlus size={17} />
                Create Account
              </>
            )}
          </button>
        </form>

        {/* ======================================
            FOOTER
        ====================================== */}

        <div className="auth-footer">
          <span>
            Already have an account?
          </span>

          <Link to="/auth/login">
            Sign in
          </Link>
        </div>

      </div>
    </div>
  );
}

export default Register;