import { useEffect, useMemo, useState } from "react";
import { Brain, Sparkles, Smile, AlertCircle, Calendar, Plus, RefreshCw, Star } from "lucide-react";
import SectionHeader from "../../../components/shared/SectionHeader";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import Toast from "../../../components/ui/Toast";
import { useAuth } from "../../../hooks/useAuth";
import { getLocalDateKey } from "../../../utils/dateKeys";

const emptyForm = {
  moodLevel: "5",
  stressLevel: "5",
  cravingLevel: "5",
  sleepHours: "7.0",
  motivationLevel: "5",
  consistencyStatus: "On Track"
};

const rangeHints = {
  moodLevel: { low: "Hard day", high: "Great day" },
  stressLevel: { low: "Calm", high: "High pressure" },
  cravingLevel: { low: "Controlled", high: "Very strong" },
  motivationLevel: { low: "Sluggish", high: "Highly driven" }
};

export default function MoodLog() {
  const { account, saveMoodLog } = useAuth();
  const todayKey = getLocalDateKey();
  const logs = account?.moodLogs || [];

  // Find if today's log already exists
  const todayLog = useMemo(() => {
    return logs.find(log => log.date === todayKey);
  }, [logs, todayKey]);

  const [showForm, setShowForm] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState(todayLog ? {
    moodLevel: todayLog.moodLevel?.toString() || "5",
    stressLevel: todayLog.stressLevel?.toString() || "5",
    cravingLevel: todayLog.cravingLevel?.toString() || "5",
    sleepHours: todayLog.sleepHours?.toString() || "7.0",
    motivationLevel: todayLog.motivationLevel?.toString() || "5",
    consistencyStatus: todayLog.consistencyStatus || "On Track"
  } : emptyForm);

  // Keep form in sync when todayLog changes
  useEffect(() => {
    if (todayLog) {
      setForm({
        moodLevel: todayLog.moodLevel?.toString() || "5",
        stressLevel: todayLog.stressLevel?.toString() || "5",
        cravingLevel: todayLog.cravingLevel?.toString() || "5",
        sleepHours: todayLog.sleepHours?.toString() || "7.0",
        motivationLevel: todayLog.motivationLevel?.toString() || "5",
        consistencyStatus: todayLog.consistencyStatus || "On Track"
      });
    }
  }, [todayLog]);

  function updateField(field, value) {
    setForm(current => ({
      ...current,
      [field]: value
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        date: todayKey
      };
      const result = await saveMoodLog(payload);
      if (result.ok) {
        setSaved(true);
        setShowForm(false);
        setTimeout(() => {
          setSaved(false);
        }, 3000);
      } else {
        alert(result.message || "Failed to save mood log");
      }
    } catch (err) {
      alert("Error: " + err.message);
    }
  }

  // Calculate consistency overview stats
  const averageMood = useMemo(() => {
    if (!logs.length) return 0;
    const sum = logs.reduce((acc, log) => acc + Number(log.moodLevel || 0), 0);
    return (sum / logs.length).toFixed(1);
  }, [logs]);

  const averageMotivation = useMemo(() => {
    if (!logs.length) return 0;
    const sum = logs.reduce((acc, log) => acc + Number(log.motivationLevel || 0), 0);
    return (sum / logs.length).toFixed(1);
  }, [logs]);

  return (
    <div className="page-stack">
      <SectionHeader
        eyebrow="Mental State & Recovery"
        title="Mood & Motivation"
        description="Log your daily emotional health, stress levels, cravings, and motivation levels to stay aligned with your diet stability."
        action={
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? "Cancel" : todayLog ? <><RefreshCw size={18} /> Update Today's Log</> : <><Plus size={18} /> Log Today's Mood</>}
          </Button>
        }
      />

      {saved && <Toast type="success" message="Your mood and behavior signals have been logged successfully!" />}

      {showForm && (
        <article className="panel animate-in">
          <div className="panel-header">
            <div className="stat-icon"><Smile size={20} /></div>
            <h2>{todayLog ? "Update Today's Mood Log" : "Log Today's Mood & Behavior"}</h2>
          </div>
          
          <form onSubmit={handleSubmit} className="form-grid mt-md">
            <div className="range-grid checkin-range-grid full-width">
              <RangeField
                label="Mood level"
                value={form.moodLevel}
                hint={rangeHints.moodLevel}
                onChange={val => updateField("moodLevel", val)}
              />
              <RangeField
                label="Stress level"
                value={form.stressLevel}
                hint={rangeHints.stressLevel}
                onChange={val => updateField("stressLevel", val)}
              />
              <RangeField
                label="Craving pressure"
                value={form.cravingLevel}
                hint={rangeHints.cravingLevel}
                onChange={val => updateField("cravingLevel", val)}
              />
              <RangeField
                label="Motivation level"
                value={form.motivationLevel}
                hint={rangeHints.motivationLevel}
                onChange={val => updateField("motivationLevel", val)}
              />
            </div>

            <div className="two-column full-width mt-md">
              <Input
                label="Sleep Hours"
                type="number"
                step="0.1"
                min="0"
                max="24"
                value={form.sleepHours}
                onChange={e => updateField("sleepHours", e.target.value)}
                required
              />

              <label className="form-field">
                <span>Consistency Status</span>
                <select
                  value={form.consistencyStatus}
                  onChange={e => updateField("consistencyStatus", e.target.value)}
                  className="premium-select"
                >
                  <option value="On Track">On Track</option>
                  <option value="Tracking">Tracking</option>
                  <option value="Struggling">Struggling</option>
                  <option value="Off Plan">Off Plan</option>
                </select>
              </label>
            </div>

            <div className="form-actions mt-lg">
              <Button type="submit">Save Mood Log</Button>
            </div>
          </form>
        </article>
      )}

      {/* Overview Cards */}
      <section className="stats-grid">
        <article className="panel" style={{ background: "linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(147, 51, 234, 0.1))", border: "1px solid rgba(147, 51, 234, 0.2)" }}>
          <div className="flex justify-between items-start">
            <div>
              <p className="eyebrow" style={{ color: "var(--color-primary)" }}>Consistency Overview</p>
              <h2 className="gradient-text mt-sm" style={{ fontSize: "1.8rem" }}>
                {todayLog ? `Status: ${todayLog.consistencyStatus}` : "Awaiting Today's Entry"}
              </h2>
            </div>
            <div className="stat-icon"><Sparkles size={22} className="text-primary" /></div>
          </div>
          <p className="mt-md text-muted" style={{ fontSize: "0.9rem" }}>
            {todayLog 
              ? "Your mood signals are tracked. This feeds direct predictions to failure risk analysis." 
              : "Complete today's log to generate live behavioral insight analysis."}
          </p>
        </article>

        <article className="panel">
          <p className="eyebrow">Average Mood</p>
          <div className="flex items-baseline gap-sm">
            <h2 style={{ fontSize: "2.4rem" }}>{averageMood}</h2>
            <small className="text-muted">/10</small>
          </div>
          <p className="mt-sm text-muted">Averaged across all registered entries.</p>
        </article>

        <article className="panel">
          <p className="eyebrow">Average Motivation</p>
          <div className="flex items-baseline gap-sm">
            <h2 style={{ fontSize: "2.4rem" }}>{averageMotivation}</h2>
            <small className="text-muted">/10</small>
          </div>
          <p className="mt-sm text-muted">Reflects your cognitive willpower score.</p>
        </article>
      </section>

      {/* History Section */}
      <section className="panel mt-lg">
        <div className="panel-header">
          <div className="stat-icon"><Calendar size={20} /></div>
          <h2>Mood & Recovery History</h2>
          <span className="badge">{logs.length} Entries</span>
        </div>

        <div className="history-list mt-md">
          {logs.length === 0 ? (
            <div className="flex-center py-xl text-muted">
              <AlertCircle size={32} className="mb-sm" />
              <p className="italic">No mood logs saved yet. Click &quot;Log Today&quot; to save your first entry!</p>
            </div>
          ) : (
            <div className="grid-list">
              {logs.map((log, index) => {
                const isToday = log.date === todayKey;
                return (
                  <article key={log.moodLogiD || index} className={`mood-history-card ${isToday ? 'today-highlight' : ''}`} style={{
                    background: "var(--panel-bg)",
                    border: isToday ? "2px solid var(--color-primary)" : "1px solid var(--border-color)",
                    borderRadius: "16px",
                    padding: "20px",
                    position: "relative",
                    transition: "transform 0.2s ease, box-shadow 0.2s ease"
                  }}>
                    <div className="flex justify-between items-center mb-md">
                      <div className="flex items-center gap-sm">
                        <span style={{ fontSize: "1.4rem" }}>{getMoodEmoji(log.moodLevel)}</span>
                        <div>
                          <strong style={{ display: "block" }}>{isToday ? "Today" : formatDate(log.date)}</strong>
                          <span className={`badge ${getStatusClass(log.consistencyStatus)}`}>{log.consistencyStatus}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-xs">
                        <Star size={14} className="text-warning fill-warning" />
                        <span style={{ fontWeight: "600" }}>{log.moodLevel}/10</span>
                      </div>
                    </div>

                    <div className="profile-summary compact" style={{ gridTemplateColumns: "repeat(2, 1fr)", gap: "10px", marginTop: "12px", border: "none", padding: 0 }}>
                      <div>
                        <span>Stress</span>
                        <strong>{log.stressLevel}/10</strong>
                      </div>
                      <div>
                        <span>Cravings</span>
                        <strong>{log.cravingLevel}/10</strong>
                      </div>
                      <div>
                        <span>Motivation</span>
                        <strong>{log.motivationLevel}/10</strong>
                      </div>
                      <div>
                        <span>Sleep</span>
                        <strong>{log.sleepHours}h</strong>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function RangeField({ label, value, hint, onChange }) {
  return (
    <label className="checkin-range-field">
      <div className="range-heading">
        <span>{label}</span>
        <strong>{value}/10</strong>
      </div>
      <input
        type="range"
        min="1"
        max="10"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <div className="range-labels">
        <small>{hint.low}</small>
        <small>{hint.high}</small>
      </div>
    </label>
  );
}

function getMoodEmoji(level) {
  const lvl = Number(level);
  if (lvl >= 8) return "😊";
  if (lvl >= 6) return "🙂";
  if (lvl >= 4) return "😐";
  return "😔";
}

function getStatusClass(status) {
  switch (status?.toLowerCase()) {
    case "on track": return "success";
    case "tracking": return "info";
    case "struggling": return "warning";
    case "off plan": return "error";
    default: return "";
  }
}

function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(`${dateString}T00:00:00`);
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric"
  });
}
