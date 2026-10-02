import { useState, useEffect, useMemo } from "react";
import {
  Users,
  UserPlus,
  Copy,
  Check,
  Shield,
  ShieldCheck,
  Crown,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Mail,
  Search,
  Building2,
  Sparkles,
  Info,
  UserCheck,
} from "lucide-react";
import axiosInstance from "../api/axiosInstance";
import useOrganizationRole from "../hooks/useOrganizationRole";
import { useAuth } from "../context/AuthContext";
import "./TeamManagement.css";

function TeamManagement() {
  const { user: currentUser } = useAuth();
  const { role, organizationId, loading: roleLoading } = useOrganizationRole();

  const [members, setMembers] = useState([]);
  const [organization, setOrganization] = useState(null);
  const [loadingMembers, setLoadingMembers] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState("all");

  // Invite Form State
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("employee");
  const [inviting, setInviting] = useState(false);
  const [generatedInviteLink, setGeneratedInviteLink] = useState("");
  const [copied, setCopied] = useState(false);

  // Feedback State
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // ==========================================
  // FETCH MEMBERS
  // ==========================================
  const fetchMembers = async () => {
    if (!organizationId) return;

    try {
      setLoadingMembers(true);
      setError("");

      const response = await axiosInstance.get(
        `/api/organizations/${organizationId}/members`
      );

      if (response.data?.success) {
        setMembers(response.data.members || []);
        setOrganization(response.data.organization || null);
      }
    } catch (err) {
      console.error("Fetch members error:", err);
      setError(
        err.response?.data?.message || "Failed to load team members."
      );
    } finally {
      setLoadingMembers(false);
    }
  };

  useEffect(() => {
    if (organizationId && role !== "employee") {
      fetchMembers();
    } else if (role === "employee") {
      setLoadingMembers(false);
    }
  }, [organizationId, role]);

  // ==========================================
  // SEND INVITE
  // ==========================================
  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !organizationId) return;

    try {
      setInviting(true);
      setError("");
      setSuccessMsg("");
      setGeneratedInviteLink("");

      const response = await axiosInstance.post(
        `/api/organizations/${organizationId}/invite`,
        {
          email: inviteEmail.trim(),
          role: inviteRole,
        }
      );

      if (response.data?.success) {
        if (response.data.inviteLink) {
          setGeneratedInviteLink(response.data.inviteLink);
          setSuccessMsg(`Invite link created for ${inviteEmail.trim()}!`);
        } else {
          setSuccessMsg(
            response.data.message || `User ${inviteEmail.trim()} added directly.`
          );
          fetchMembers();
        }
        setInviteEmail("");
      }
    } catch (err) {
      console.error("Invite error:", err);
      setError(err.response?.data?.message || "Failed to send invite.");
    } finally {
      setInviting(false);
    }
  };

  // ==========================================
  // COPY INVITE LINK
  // ==========================================
  const handleCopyLink = async () => {
    if (!generatedInviteLink) return;
    try {
      await navigator.clipboard.writeText(generatedInviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error("Copy error:", err);
    }
  };

  // ==========================================
  // UPDATE MEMBER ROLE (Admin only)
  // ==========================================
  const handleUpdateRole = async (targetUserId, newRole) => {
    try {
      setError("");
      setSuccessMsg("");

      const response = await axiosInstance.patch(
        `/api/organizations/${organizationId}/members/${targetUserId}`,
        { role: newRole }
      );

      if (response.data?.success) {
        setMembers((prev) =>
          prev.map((m) =>
            m.user?._id === targetUserId ? { ...m, role: newRole } : m
          )
        );
        setSuccessMsg("Member role updated successfully.");
        setTimeout(() => setSuccessMsg(""), 3000);
      }
    } catch (err) {
      console.error("Update role error:", err);
      setError(
        err.response?.data?.message || "Failed to update member role."
      );
    }
  };

  // ==========================================
  // REMOVE MEMBER (Admin only)
  // ==========================================
  const handleRemoveMember = async (targetUserId, memberName) => {
    if (
      !window.confirm(
        `Are you sure you want to remove ${memberName || "this member"} from the organization?`
      )
    ) {
      return;
    }

    try {
      setError("");
      setSuccessMsg("");

      const response = await axiosInstance.delete(
        `/api/organizations/${organizationId}/members/${targetUserId}`
      );

      if (response.data?.success) {
        setMembers((prev) => prev.filter((m) => m.user?._id !== targetUserId));
        setSuccessMsg("Member removed from organization.");
        setTimeout(() => setSuccessMsg(""), 3000);
      }
    } catch (err) {
      console.error("Remove member error:", err);
      setError(
        err.response?.data?.message || "Failed to remove member."
      );
    }
  };

  // Filtered members list
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const name = m.user?.name || "";
      const email = m.user?.email || "";
      const matchesSearch =
        name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        email.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesRole =
        selectedRoleFilter === "all" || m.role === selectedRoleFilter;

      return matchesSearch && matchesRole;
    });
  }, [members, searchQuery, selectedRoleFilter]);

  // Member statistics
  const stats = useMemo(() => {
    const total = members.length;
    const admins = members.filter((m) => m.role === "admin").length;
    const managers = members.filter((m) => m.role === "manager").length;
    const employees = members.filter((m) => m.role === "employee").length;
    return { total, admins, managers, employees };
  }, [members]);

  const isOwner = (targetUserId) => {
    const ownerId = organization?.ownerId?._id || organization?.ownerId;
    return ownerId && ownerId.toString() === targetUserId?.toString();
  };

  // 1. Role loading state
  if (roleLoading) {
    return (
      <div className="team-page">
        <div className="team-mgmt-loading">
          <div className="loading-spinner"></div>
          <span>Loading workspace team access...</span>
        </div>
      </div>
    );
  }

  // 2. Employee guard (Friendly styled card)
  if (role === "employee") {
    return (
      <div className="team-page">
        <header className="team-header">
          <div>
            <h1>Team & Access</h1>
            <p>View organization membership and permissions.</p>
          </div>
        </header>
        <div className="team-employee-notice">
          <div className="notice-icon">
            <Shield size={24} />
          </div>
          <div>
            <h3>Restricted Access</h3>
            <p>Only Organization Admins and Managers have permission to manage members and create invite links.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="team-page">
      {/* ==========================================
          HEADER BANNER
      ========================================== */}
      <header className="team-header">
        <div className="team-header-left">
          <div className="team-header-title-row">
            <h1>Team & Access</h1>
            <span className="org-badge">
              <Building2 size={14} />
              {organization?.name || "Agent Workspace"}
            </span>
          </div>
          <p>
            Manage organization members, assign access privileges, and invite new colleagues to collaborate.
          </p>
        </div>
      </header>

      {/* ERROR & SUCCESS TOAST NOTIFICATIONS */}
      {error && (
        <div className="team-alert error">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button className="alert-close-btn" onClick={() => setError("")}>✕</button>
        </div>
      )}

      {successMsg && (
        <div className="team-alert success">
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
          <button className="alert-close-btn" onClick={() => setSuccessMsg("")}>✕</button>
        </div>
      )}

      {/* ==========================================
          STATS ROW
      ========================================== */}
      <div className="team-stats-grid">
        <div className="team-stat-card">
          <div className="stat-icon-box stat-icon-blue">
            <Users size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.total}</span>
            <span className="stat-label">Total Members</span>
          </div>
        </div>

        <div className="team-stat-card">
          <div className="stat-icon-box stat-icon-purple">
            <Crown size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.admins}</span>
            <span className="stat-label">Admins</span>
          </div>
        </div>

        <div className="team-stat-card">
          <div className="stat-icon-box stat-icon-indigo">
            <ShieldCheck size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.managers}</span>
            <span className="stat-label">Managers</span>
          </div>
        </div>

        <div className="team-stat-card">
          <div className="stat-icon-box stat-icon-emerald">
            <UserCheck size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats.employees}</span>
            <span className="stat-label">Employees</span>
          </div>
        </div>
      </div>

      {/* ==========================================
          INVITE SECTION
      ========================================== */}
      <section className="team-section team-invite-card">
        <div className="section-title-bar">
          <div className="section-title-left">
            <div className="section-icon invite-icon">
              <UserPlus size={18} />
            </div>
            <div>
              <h2>Invite New Member</h2>
              <p>Send an invitation link to onboard teammates directly into this organization.</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleInvite} className="team-invite-form">
          <div className="invite-inputs-wrapper">
            <div className="invite-input-group">
              <Mail size={16} className="invite-input-icon" />
              <input
                type="email"
                placeholder="colleague@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
              />
            </div>

            <div className="invite-role-select-wrapper">
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="invite-role-select"
              >
                <option value="employee">Role: Employee</option>
                <option value="manager">Role: Manager</option>
                <option value="admin">Role: Admin</option>
              </select>
            </div>

            <button
              type="submit"
              className="team-invite-btn"
              disabled={inviting || !inviteEmail.trim()}
            >
              {inviting ? (
                <>
                  <div className="btn-spinner"></div>
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>Generate Invite</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* COPYABLE INVITE LINK BOX */}
        {generatedInviteLink && (
          <div className="invite-link-box">
            <div className="invite-link-header">
              <Sparkles size={16} className="sparkle-icon" />
              <strong>Invite Link Ready</strong>
              <span>— Share this URL with your colleague to join</span>
            </div>
            <div className="invite-link-row">
              <input
                type="text"
                readOnly
                value={generatedInviteLink}
                className="invite-link-input"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className={`copy-link-btn ${copied ? "copied" : ""}`}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                <span>{copied ? "Copied Link!" : "Copy Link"}</span>
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ==========================================
          MEMBERS DIRECTORY
      ========================================== */}
      <section className="team-section team-directory-card">
        <div className="directory-toolbar">
          <div className="toolbar-left">
            <h2>Organization Members</h2>
            <span className="member-count-badge">
              {stats.total} {stats.total === 1 ? "member" : "members"}
            </span>
          </div>

          <div className="toolbar-right">
            {/* Search Input */}
            <div className="member-search-box">
              <Search size={15} className="search-icon" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Role Filter Pills */}
            <div className="role-filter-pills">
              <button
                type="button"
                className={`filter-pill ${selectedRoleFilter === "all" ? "active" : ""}`}
                onClick={() => setSelectedRoleFilter("all")}
              >
                All
              </button>
              <button
                type="button"
                className={`filter-pill ${selectedRoleFilter === "admin" ? "active" : ""}`}
                onClick={() => setSelectedRoleFilter("admin")}
              >
                Admins ({stats.admins})
              </button>
              <button
                type="button"
                className={`filter-pill ${selectedRoleFilter === "manager" ? "active" : ""}`}
                onClick={() => setSelectedRoleFilter("manager")}
              >
                Managers ({stats.managers})
              </button>
              <button
                type="button"
                className={`filter-pill ${selectedRoleFilter === "employee" ? "active" : ""}`}
                onClick={() => setSelectedRoleFilter("employee")}
              >
                Employees ({stats.employees})
              </button>
            </div>
          </div>
        </div>

        {loadingMembers ? (
          <div className="team-mgmt-loading">
            <div className="loading-spinner"></div>
            <span>Loading members directory...</span>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="team-empty-state">
            <Users size={36} className="empty-icon" />
            <p>No members found matching your search.</p>
            {searchQuery && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedRoleFilter("all");
                }}
              >
                Clear Search & Filters
              </button>
            )}
          </div>
        ) : (
          <div className="team-members-table-wrapper">
            <div className="team-members-list">
              {filteredMembers.map((member) => {
                const memberUser = member.user || {};
                const initial = memberUser.name
                  ? memberUser.name.charAt(0).toUpperCase()
                  : "U";
                const isTargetOwner = isOwner(memberUser._id);
                const isCurrent =
                  currentUser?._id &&
                  currentUser._id.toString() === memberUser._id?.toString();

                return (
                  <div key={member._id} className="team-member-row">
                    <div className="team-member-left">
                      <div className={`team-member-avatar avatar-role-${member.role}`}>
                        {initial}
                      </div>
                      <div className="team-member-info">
                        <div className="member-name-row">
                          <strong>{memberUser.name || "Unnamed Member"}</strong>
                          {isCurrent && <span className="current-user-badge">You</span>}
                          {isTargetOwner && (
                            <span className="owner-badge">
                              <Crown size={12} /> Owner
                            </span>
                          )}
                        </div>
                        <span className="member-email">{memberUser.email}</span>
                      </div>
                    </div>

                    <div className="team-member-right">
                      {/* ADMIN ROLE CONTROLS */}
                      {role === "admin" ? (
                        <div className="admin-member-actions">
                          <select
                            value={member.role}
                            onChange={(e) =>
                              handleUpdateRole(memberUser._id, e.target.value)
                            }
                            disabled={isTargetOwner}
                            className={`role-badge-select role-${member.role}`}
                            title={
                              isTargetOwner
                                ? "Organization owner role cannot be changed"
                                : "Change member access role"
                            }
                          >
                            <option value="admin">Admin</option>
                            <option value="manager">Manager</option>
                            <option value="employee">Employee</option>
                          </select>

                          {!isTargetOwner && (
                            <button
                              type="button"
                              className="member-delete-btn"
                              onClick={() =>
                                handleRemoveMember(memberUser._id, memberUser.name)
                              }
                              title="Remove member from organization"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      ) : (
                        /* MANAGER READ-ONLY BADGE */
                        <span className={`role-pill role-${member.role}`}>
                          {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* ==========================================
          ROLES & PERMISSIONS INFO CARD
      ========================================== */}
      <section className="team-permissions-guide">
        <div className="guide-header">
          <Info size={16} />
          <h3>Role Permissions Guide</h3>
        </div>
        <div className="guide-grid">
          <div className="guide-card">
            <span className="guide-role-badge role-admin">Admin</span>
            <p>Full control over projects, workspace settings, role assignments, and member invites.</p>
          </div>
          <div className="guide-card">
            <span className="guide-role-badge role-manager">Manager</span>
            <p>Create & edit projects, assign tasks, manage deadlines, and generate member invite links.</p>
          </div>
          <div className="guide-card">
            <span className="guide-role-badge role-employee">Employee</span>
            <p>Execute assigned tasks, log updates, view team schedules, and interact with Workspace AI Bot.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default TeamManagement;
