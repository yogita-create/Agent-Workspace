import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  User,
  Mail,
  Lock,
  Building2,
  ShieldCheck,
  AlertCircle,
  Brain,
  ArrowRight,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import axiosInstance from "../api/axiosInstance";
import "./Auth.css";

function AcceptInvite() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [inviteData, setInviteData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    password: "",
    confirmPassword: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // ==========================================
  // FETCH INVITE DETAILS ON COMPONENT MOUNT
  // ==========================================
  useEffect(() => {
    let isMounted = true;

    const fetchInviteDetails = async () => {
      if (!token) {
        if (isMounted) {
          setFetchError("Invalid invite token. Please check your invite link.");
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);
        setFetchError("");

        const response = await axiosInstance.get(`/api/invites/${token}`);

        if (isMounted && response.data?.success) {
          setInviteData(response.data);
        } else if (isMounted) {
          setFetchError(response.data?.message || "Invalid or expired invite.");
        }
      } catch (err) {
        if (isMounted) {
          setFetchError(
            err.response?.data?.message ||
              "This invite link is invalid, expired, or has already been used."
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchInviteDetails();

    return () => {
      isMounted = false;
    };
  }, [token]);

  // ==========================================
  // FORM HANDLERS
  // ==========================================
  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    if (formError) setFormError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.password) {
      setFormError("Please fill in all required fields.");
      return;
    }

    if (formData.password.length < 6) {
      setFormError("Password must be at least 6 characters long.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }

    try {
      setSubmitting(true);
      setFormError("");

      const response = await axiosInstance.post(
        `/api/invites/${token}/accept`,
        {
          name: formData.name.trim(),
          password: formData.password,
        }
      );

      if (response.data?.success) {
        setSuccessMessage("Account created successfully! Redirecting to login...");
        setTimeout(() => {
          navigate("/login", {
            state: {
              message:
                "Welcome aboard! Your account is active. Please log in with your new password.",
            },
          });
        }, 1500);
      } else {
        setFormError(
          response.data?.message || "Failed to accept invite. Please try again."
        );
      }
    } catch (err) {
      setFormError(
        err.response?.data?.message ||
          "An unexpected error occurred. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ==========================================
  // LOADING STATE
  // ==========================================
  if (loading) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: "center", alignItems: "center" }}>
          <div className="auth-logo-icon">
            <Brain size={24} />
          </div>
          <h2>Verifying Invitation...</h2>
          <p style={{ color: "var(--text-muted, #64748b)" }}>
            Please wait while we validate your invitation details.
          </p>
          <div style={{ display: "flex", justifyContent: "center", marginTop: "16px" }}>
            <Loader2 size={32} className="animate-spin" style={{ animation: "spin 1s linear infinite" }} />
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // INVALID / EXPIRED INVITE ERROR STATE
  // ==========================================
  if (fetchError || !inviteData) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-logo-icon" style={{ background: "#ef4444" }}>
              <AlertCircle size={24} />
            </div>
            <h1>Invitation Unavailable</h1>
            <p>We couldn't process this invite link</p>
          </div>

          <div className="auth-error-banner">
            <AlertCircle size={17} />
            <span>{fetchError || "This invite link is invalid or expired."}</span>
          </div>

          <p style={{ fontSize: "13.5px", color: "var(--text-muted, #64748b)", textAlign: "center", margin: 0 }}>
            If you believe this is an error, please ask your organization admin to send a new invitation.
          </p>

          <div className="auth-footer" style={{ borderTop: "none", paddingTop: 0 }}>
            <Link to="/login" className="auth-submit-btn" style={{ textDecoration: "none" }}>
              <span>Go to Sign In</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // MAIN ACCEPT INVITE FORM
  // ==========================================
  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* HEADER */}
        <div className="auth-header">
          <div className="auth-logo-icon">
            <Brain size={24} />
          </div>
          <h1>Join {inviteData.organizationName || "Organization"}</h1>
          <p>Set up your account to accept your invitation</p>
        </div>

        {/* ORG & ROLE BADGE BANNER */}
        <div
          style={{
            background: "var(--bg-primary, #f1f5f9)",
            border: "1px solid var(--border-color, #e2e8f0)",
            borderRadius: "10px",
            padding: "12px 14px",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
            fontSize: "13px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 600 }}>
            <Building2 size={16} color="var(--accent-blue, #3b82f6)" />
            <span>Organization: {inviteData.organizationName}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-muted, #64748b)" }}>
            <ShieldCheck size={16} color="#10b981" />
            <span>
              Role:{" "}
              <strong style={{ textTransform: "capitalize", color: "var(--text-primary, #0f172a)" }}>
                {inviteData.role}
              </strong>
            </span>
          </div>
        </div>

        {/* ERROR MESSAGE */}
        {formError && (
          <div className="auth-error-banner">
            <AlertCircle size={17} />
            <span>{formError}</span>
          </div>
        )}

        {/* SUCCESS MESSAGE */}
        {successMessage && (
          <div
            style={{
              background: "#ecfdf5",
              border: "1px solid #a7f3d0",
              color: "#047857",
              padding: "11px 14px",
              borderRadius: "8px",
              fontSize: "13px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <CheckCircle2 size={17} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* FORM */}
        <form onSubmit={handleSubmit} className="auth-form">
          {/* EMAIL (READ-ONLY) */}
          <div className="auth-field">
            <label htmlFor="invite-email">Email Address</label>
            <div className="auth-input-wrap">
              <span className="auth-input-icon">
                <Mail size={16} />
              </span>
              <input
                id="invite-email"
                type="email"
                value={inviteData.email}
                disabled
                style={{
                  background: "var(--bg-primary, #f8fafc)",
                  color: "var(--text-muted, #64748b)",
                  cursor: "not-allowed",
                }}
              />
            </div>
          </div>

          {/* FULL NAME */}
          <div className="auth-field">
            <label htmlFor="invite-name">Full Name</label>
            <div className="auth-input-wrap">
              <span className="auth-input-icon">
                <User size={16} />
              </span>
              <input
                id="invite-name"
                type="text"
                name="name"
                placeholder="John Doe"
                value={formData.name}
                onChange={handleChange}
                required
                autoComplete="name"
                disabled={submitting || Boolean(successMessage)}
              />
            </div>
          </div>

          {/* PASSWORD */}
          <div className="auth-field">
            <label htmlFor="invite-password">Create Password</label>
            <div className="auth-input-wrap">
              <span className="auth-input-icon">
                <Lock size={16} />
              </span>
              <input
                id="invite-password"
                type="password"
                name="password"
                placeholder="At least 6 characters"
                value={formData.password}
                onChange={handleChange}
                required
                autoComplete="new-password"
                disabled={submitting || Boolean(successMessage)}
              />
            </div>
          </div>

          {/* CONFIRM PASSWORD */}
          <div className="auth-field">
            <label htmlFor="invite-confirm-password">Confirm Password</label>
            <div className="auth-input-wrap">
              <span className="auth-input-icon">
                <Lock size={16} />
              </span>
              <input
                id="invite-confirm-password"
                type="password"
                name="confirmPassword"
                placeholder="Re-enter your password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                autoComplete="new-password"
                disabled={submitting || Boolean(successMessage)}
              />
            </div>
          </div>

          {/* SUBMIT BUTTON */}
          <button
            type="submit"
            className="auth-submit-btn"
            disabled={submitting || Boolean(successMessage)}
          >
            {submitting ? (
              <span>Setting up account...</span>
            ) : (
              <>
                <ArrowRight size={17} />
                <span>Join Organization</span>
              </>
            )}
          </button>
        </form>

        {/* FOOTER */}
        <div className="auth-footer">
          <span>Already have an account?</span>
          <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}

export default AcceptInvite;
