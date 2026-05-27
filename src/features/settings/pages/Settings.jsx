import { useEffect, useState } from "react";
import {
  Bell,
  BellRing,
  CheckCircle2,
  Clock,
  LogOut,
  Mail,
  Moon,
  ShieldCheck,
  Sun,
  UserRound
} from "lucide-react";
import SectionHeader from "../../../components/shared/SectionHeader";
import Button from "../../../components/ui/Button";
import Toast from "../../../components/ui/Toast";
import { useAuth } from "../../../hooks/useAuth";
import { useTheme } from "../../../hooks/useTheme";

export default function Settings() {
  const {
    account,
    logout,
    requestAppNotificationPermission,
    sendAppReminder,
    updateAccount
  } = useAuth();
  const { setTheme, theme } = useTheme();
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [notificationStatus, setNotificationStatus] = useState("");
  const [preferences, setPreferences] = useState({
    dailyReminders: account.preferences?.dailyReminders ?? true,
    riskAlerts: account.preferences?.riskAlerts ?? true,
    weeklySummary: account.preferences?.weeklySummary ?? false,
    privateMode: account.preferences?.privateMode ?? false,
    hourlyReminders: account.preferences?.hourlyReminders ?? true,
    appNotifications: account.preferences?.appNotifications ?? false,
    emailNotifications: account.preferences?.emailNotifications ?? false,
    remindMood: account.preferences?.remindMood ?? true,
    remindFood: account.preferences?.remindFood ?? true,
    remindWater: account.preferences?.remindWater ?? true
  });

  useEffect(() => {
    setPreferences({
      dailyReminders: account.preferences?.dailyReminders ?? true,
      riskAlerts: account.preferences?.riskAlerts ?? true,
      weeklySummary: account.preferences?.weeklySummary ?? false,
      privateMode: account.preferences?.privateMode ?? false,
      hourlyReminders: account.preferences?.hourlyReminders ?? true,
      appNotifications: account.preferences?.appNotifications ?? false,
      emailNotifications: account.preferences?.emailNotifications ?? false,
      remindMood: account.preferences?.remindMood ?? true,
      remindFood: account.preferences?.remindFood ?? true,
      remindWater: account.preferences?.remindWater ?? true
    });
  }, [account.preferences]);

  function updatePreference(field) {
    setPreferences((current) => ({
      ...current,
      [field]: !current[field]
    }));
  }

  async function handleSave() {
    setSaveError("");
    const result = await updateAccount({ preferences });

    if (!result.ok) {
      setSaveError(result.message || "Could not save settings.");
      return;
    }

    setSaved(true);

    setTimeout(() => {
      setSaved(false);
    }, 2500);
  }

  function handleEditDietProfile() {
    updateAccount({
      dietProfile: {
        ...account.dietProfile,
        completed: false
      }
    });
  }

  async function handleEnableAppNotifications() {
    const result = await requestAppNotificationPermission();
    setNotificationStatus(result.message);

    if (result.ok) {
      setPreferences((current) => ({
        ...current,
        appNotifications: true
      }));
    }
  }

  function handleTestReminder() {
    sendAppReminder();
    setNotificationStatus("Test reminder sent to the app notification inbox.");
  }

  return (
    <div className="page-stack">
      <SectionHeader
        eyebrow="Preferences"
        title="Settings"
        description="Control your account, display mode, reminders, and diet setup from one place."
        action={
          <Button variant="ghost" onClick={logout}>
            <LogOut size={18} />
            Logout
          </Button>
        }
      />

      <section className="settings-grid">
        <article className="panel settings-panel account-settings-panel">
          <div className="settings-panel-header">
            <div className="stat-icon">
              <UserRound size={22} />
            </div>
            <div>
              <p className="eyebrow">Account</p>
              <h2>{account.name}</h2>
            </div>
          </div>

          <div className="settings-list">
            <div>
              <span>Username</span>
              <strong>{account.username}</strong>
            </div>
            <div>
              <span>Email</span>
              <strong>{account.email}</strong>
            </div>
            <div>
              <span>Diet profile</span>
              <strong>
                {account.dietProfile?.completed ? "Completed" : "Needs setup"}
              </strong>
            </div>
          </div>

          <div className="form-actions">
            <Button variant="ghost" onClick={handleEditDietProfile}>
              Edit Diet Info
            </Button>
          </div>
        </article>

        <article className="panel settings-panel">
          <div className="settings-panel-header">
            <div className="stat-icon">
              {theme === "dark" ? <Moon size={22} /> : <Sun size={22} />}
            </div>
            <div>
              <p className="eyebrow">Appearance</p>
              <h2>{theme === "dark" ? "Dark mode" : "Light mode"}</h2>
            </div>
          </div>

          <div className="segmented-control" aria-label="Theme selector">
            <button
              className={theme === "dark" ? "active" : ""}
              type="button"
              onClick={() => setTheme("dark")}
            >
              <Moon size={17} />
              Dark
            </button>
            <button
              className={theme === "light" ? "active" : ""}
              type="button"
              onClick={() => setTheme("light")}
            >
              <Sun size={17} />
              Light
            </button>
          </div>
        </article>

        <article className="panel settings-panel">
          <div className="settings-panel-header">
            <div className="stat-icon">
              <Bell size={22} />
            </div>
            <div>
              <p className="eyebrow">Notifications</p>
              <h2>Reminders</h2>
            </div>
          </div>

          <div className="toggle-list">
            <label>
              <input
                type="checkbox"
                checked={preferences.hourlyReminders}
                onChange={() => updatePreference("hourlyReminders")}
              />
              <span>Every hour reminder</span>
            </label>
            <label>
              <input
                type="checkbox"
                checked={preferences.dailyReminders}
                onChange={() => updatePreference("dailyReminders")}
              />
              <span>Daily check-in reminder</span>
            </label>
            <label>
              <input
                type="checkbox"
                checked={preferences.riskAlerts}
                onChange={() => updatePreference("riskAlerts")}
              />
              <span>Diet failure risk alerts</span>
            </label>
            <label>
              <input
                type="checkbox"
                checked={preferences.weeklySummary}
                onChange={() => updatePreference("weeklySummary")}
              />
              <span>Weekly progress summary</span>
            </label>
          </div>
        </article>

        <article className="panel settings-panel">
          <div className="settings-panel-header">
            <div className="stat-icon">
              <Clock size={22} />
            </div>
            <div>
              <p className="eyebrow">Hourly reminder content</p>
              <h2>Mood, food, water</h2>
            </div>
          </div>

          <div className="toggle-list">
            <label>
              <input
                type="checkbox"
                checked={preferences.remindMood}
                onChange={() => updatePreference("remindMood")}
              />
              <span>Remind me about mood</span>
            </label>
            <label>
              <input
                type="checkbox"
                checked={preferences.remindFood}
                onChange={() => updatePreference("remindFood")}
              />
              <span>Remind me about food</span>
            </label>
            <label>
              <input
                type="checkbox"
                checked={preferences.remindWater}
                onChange={() => updatePreference("remindWater")}
              />
              <span>Remind me about drinking water</span>
            </label>
          </div>
        </article>

        <article className="panel settings-panel">
          <div className="settings-panel-header">
            <div className="stat-icon">
              <BellRing size={22} />
            </div>
            <div>
              <p className="eyebrow">App notifications</p>
              <h2>Browser reminder</h2>
            </div>
          </div>

          <p>
            App notifications work while the website is open. Your browser may
            also show a system notification after permission is granted.
          </p>

          <div className="form-actions">
            <Button variant="ghost" onClick={handleEnableAppNotifications}>
              Enable App Notifications
            </Button>
            <Button type="button" onClick={handleTestReminder}>
              Send Test
            </Button>
          </div>

          {notificationStatus && (
            <div className="toast toast-success">{notificationStatus}</div>
          )}
        </article>

        <article className="panel settings-panel">
          <div className="settings-panel-header">
            <div className="stat-icon">
              <Mail size={22} />
            </div>
            <div>
              <p className="eyebrow">Email reminders</p>
              <h2>Backend required</h2>
            </div>
          </div>

          <div className="toggle-list">
            <label className="disabled-toggle">
              <input type="checkbox" checked={false} disabled />
              <span>Send hourly reminders to {account.email}</span>
            </label>
          </div>

          <p>
            Email reminders need a backend job and an email provider such as
            Resend, SendGrid, or SMTP. This frontend can store the preference,
            but it cannot send email by itself.
          </p>
        </article>

        <article className="panel settings-panel">
          <div className="settings-panel-header">
            <div className="stat-icon">
              <ShieldCheck size={22} />
            </div>
            <div>
              <p className="eyebrow">Privacy</p>
              <h2>Local data</h2>
            </div>
          </div>

          <div className="toggle-list">
            <label>
              <input
                type="checkbox"
                checked={preferences.privateMode}
                onChange={() => updatePreference("privateMode")}
              />
              <span>Hide sensitive profile details when possible</span>
            </label>
          </div>

          <p>
            Login details, diet profile, preferences, and feedback are saved to
            your database-backed account.
          </p>
        </article>
      </section>

      <section className="panel settings-save-panel">
        <div>
          <p className="eyebrow">Save changes</p>
          <h2>Preference updates</h2>
          <p>Save reminder and privacy preferences to your account.</p>
        </div>

        <div>
          <Button onClick={handleSave}>
            <CheckCircle2 size={18} />
            Save Settings
          </Button>
          <Toast type="success" message={saved ? "Settings saved." : ""} />
          <Toast type="error" message={saveError} />
        </div>
      </section>
    </div>
  );
}
