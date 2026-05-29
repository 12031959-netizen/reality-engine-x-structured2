import { useEffect, useState } from "react";
import {
  Activity,
  BarChart3,
  BellRing,
  ClipboardCheck,
  Database,
  HeartPulse,
  MessageSquare,
  UserRound,
  Watch
} from "lucide-react";
import SectionHeader from "../../../components/shared/SectionHeader";
import Button from "../../../components/ui/Button";
import { useAuth } from "../../../hooks/useAuth";
import { apiClient } from "../../../services/apiClient";
import "../admin-styles.css";

function safeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && value !== "" ? number : null;
}

function getLatestRecord(account) {
  const history = [...(account.dailyHistory || [])].sort((a, b) =>
    (b.date || "").localeCompare(a.date || "")
  );

  return history.find((record) => record.checkIn || record.wearableData) || null;
}

function calculateCompletion(account) {
  const profile = account.dietProfile || {};
  const latest = getLatestRecord(account);
  const hasProfile = Boolean(profile.completed);
  const hasCheckIn = Boolean(account.dailyCheckIn?.savedAt || latest?.checkIn);
  const hasWearable = Boolean(account.wearableData?.savedAt || latest?.wearableData);

  return [hasProfile, hasCheckIn, hasWearable].filter(Boolean).length;
}

export default function AdminDashboard({ setActiveRoute }) {
  const { logout } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [status, setStatus] = useState("Loading users...");

  async function loadUsers() {
    setStatus("Loading users...");

    try {
      const result = await apiClient.get("/admin/accounts");
      const feedbackResult = await apiClient.get("/feedback");
      const users = result.accounts || [];

      setAccounts(users);
      setFeedback(feedbackResult.feedback || []);
      setStatus(
        users.length
          ? "Connected to backend. Showing all saved users."
          : "No users have been created yet."
      );
    } catch (error) {
      console.error("Dashboard load failed:", error);
      setAccounts([]);
      setFeedback([]);
      setStatus("Backend is offline or database connection failed.");
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  const completionTotal = accounts.reduce(
    (total, account) => total + calculateCompletion(account),
    0
  );

  return (
    <div className="page-stack">
      <SectionHeader
        eyebrow="Admin control"
        title="Admin Dashboard"
        description="Monitor system statistics and manage users, diet profiles, check-ins, mobile data, and feedback."
        action={
          <div className="form-actions admin-header-actions">
            <Button variant="ghost" onClick={loadUsers}>
              Refresh
            </Button>
            <Button variant="ghost" onClick={logout}>
              Logout
            </Button>
          </div>
        }
      />

      <section className="stats-grid">
        <AdminStat
          icon={UserRound}
          label="Users"
          value={accounts.length}
          text="Non-admin accounts"
        />
        <AdminStat
          icon={ClipboardCheck}
          label="Check-ins"
          value={accounts.filter((account) => account.dailyCheckIn?.savedAt).length}
          text="Users with a saved check-in"
        />
        <AdminStat
          icon={HeartPulse}
          label="Mobile Data"
          value={accounts.filter((account) => account.wearableData?.savedAt).length}
          text="Users with health data"
        />
        <AdminStat
          icon={BarChart3}
          label="Data coverage"
          value={`${completionTotal}/${accounts.length * 3 || 0}`}
          text="Profile, check-in, mobile data"
        />
        <AdminStat
          icon={BarChart3}
          label="Feedback"
          value={feedback.length}
          text="Messages written by users"
        />
      </section>

      <section className="stats-grid">
        <ManagementCard 
          icon={UserRound} 
          title="User Manager" 
          description="Control accounts and roles"
          onClick={() => setActiveRoute("admin-users")}
        />
        <ManagementCard 
          icon={ClipboardCheck} 
          title="Diet Manager" 
          description="Oversee user diet profiles"
          onClick={() => setActiveRoute("admin-diets")}
        />
        <ManagementCard 
          icon={Activity} 
          title="Check-in Manager" 
          description="Audit daily food & mood logs"
          onClick={() => setActiveRoute("admin-checkins")}
        />
        <ManagementCard
          icon={Database}
          title="User Data"
          description="Read saved failure risk, diet plans, meals, mood, progress, and recommendations"
          onClick={() => setActiveRoute("admin-user-data")}
        />
        <ManagementCard 
          icon={Watch} 
          title="Mobile Data Manager" 
          description="Sync and verify health data"
          onClick={() => setActiveRoute("admin-wearables")}
        />
        <ManagementCard 
          icon={BellRing} 
          title="Notification Manager" 
          description="Broadcast alerts to all users"
          onClick={() => setActiveRoute("admin-notifications")}
        />
        <ManagementCard 
          icon={MessageSquare} 
          title="Feedback Manager" 
          description="Review user submissions"
          onClick={() => setActiveRoute("admin-feedback")}
        />
      </section>

      <article className="panel">
        <p className="eyebrow">Connection</p>
        <h2>{status}</h2>
      </article>
    </div>
  );
}

function AdminStat({ icon: Icon, label, value, text }) {
  return (
    <article className="panel admin-stat-card">
      <div className="stat-icon">
        <Icon size={21} />
      </div>
      <p className="eyebrow">{label}</p>
      <h2>{value}</h2>
      <span>{text}</span>
    </article>
  );
}

function ManagementCard({ icon: Icon, title, description, onClick }) {
  return (
    <article className="panel admin-stat-card management-card" onClick={onClick} style={{ cursor: "pointer" }}>
      <div className="stat-icon" style={{ background: "rgba(34, 197, 94, 0.12)", color: "var(--success)" }}>
        <Icon size={21} />
      </div>
      <p className="eyebrow">Database Control</p>
      <h3 style={{ margin: "8px 0" }}>{title}</h3>
      <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{description}</span>
      <div style={{ marginTop: "12px" }}>
        <Button variant="ghost" size="sm">Open Manager</Button>
      </div>
    </article>
  );
}
