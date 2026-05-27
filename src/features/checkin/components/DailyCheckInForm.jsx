import { Bed, Brain, Droplets, Flame, HeartPulse, Utensils } from "lucide-react";
import { useState } from "react";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import Toast from "../../../components/ui/Toast";
import { useAuth } from "../../../hooks/useAuth";

const emptyCheckIn = {
  calories: "",
  protein: "",
  sleep: "",
  water: "",
  mood: "5",
  stress: "5",
  cravings: "5",
  notes: ""
};

const rangeHints = {
  mood: {
    low: "Hard day",
    high: "Great day"
  },
  stress: {
    low: "Calm",
    high: "High pressure"
  },
  cravings: {
    low: "Controlled",
    high: "Very strong"
  }
};

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function formatNumber(value, digits = 0) {
  return Number(value || 0).toLocaleString(undefined, {
    maximumFractionDigits: digits
  });
}

function calculateMealTotals(logs) {
  return logs.reduce(
    (totals, log) => ({
      calories: totals.calories + toNumber(log.calories),
      protein: totals.protein + toNumber(log.protein),
      water: totals.water + toNumber(log.waterintake)
    }),
    {
      calories: 0,
      protein: 0,
      water: 0
    }
  );
}

export default function DailyCheckInForm({ setActiveRoute }) {
  const { account, saveDailyCheckIn, todayKey } = useAuth();
  const todayCheckIn = account.dailyCheckIn?.checkInDate === todayKey
    ? account.dailyCheckIn
    : null;
  const hasTodayCheckIn = Boolean(todayCheckIn);
  const todayMealLogs = (account.foodLogs || []).filter((log) => log.date === todayKey);
  const mealTotals = calculateMealTotals(todayMealLogs);
  const hasMealTotals = todayMealLogs.length > 0;
  const [form, setForm] = useState(emptyCheckIn);
  const [saved, setSaved] = useState(false);

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  function useMealLogTotals() {
    setForm((current) => ({
      ...current,
      calories: mealTotals.calories ? String(Math.round(mealTotals.calories)) : current.calories,
      protein: mealTotals.protein ? String(Math.round(mealTotals.protein)) : current.protein,
      water: mealTotals.water ? String(Math.round(mealTotals.water * 10) / 10) : current.water
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      const result = await saveDailyCheckIn(form);
      
      if (result.ok) {
        setForm(emptyCheckIn);
        setSaved(true);
        setActiveRoute?.("failure");
        setTimeout(() => {
          setSaved(false);
        }, 2500);
      } else {
        console.error("DailyCheckInForm: Save failed with result:", result);
        alert(result.message || "Failed to save check-in");
      }
    } catch (err) {
      console.error("DailyCheckInForm: Unhandled submission error:", err);
      alert("An unexpected error occurred: " + err.message);
    }
  }

  return (
    <section className="checkin-layout">
      <form className="checkin-form" onSubmit={handleSubmit} autoComplete="off">
        {!hasTodayCheckIn && (
          <article className="alert-banner checkin-reset-banner">
            <div>
              <h3>New daily check-in required</h3>
              <p>
                Today&apos;s form starts empty. Yesterday&apos;s data was saved
                separately and will not be reused for today.
              </p>
            </div>
          </article>
        )}

        {hasTodayCheckIn && (
          <article className="alert-banner checkin-success-banner" style={{ background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.3)", color: "#10b981", borderRadius: "12px", padding: "16px", marginBottom: "20px" }}>
            <div>
              <h3 style={{ margin: 0, fontWeight: "600" }}>✓ Today's Check-In is Saved!</h3>
              <p style={{ margin: "4px 0 0 0", fontSize: "0.9rem", opacity: 0.9 }}>
                Your check-in has been successfully saved in the database. You can review or edit your entries below anytime today.
              </p>
            </div>
          </article>
        )}

        <article className="panel checkin-section">
          <div className="checkin-section-header">
            <div className="stat-icon">
              <Utensils size={20} />
            </div>
            <div>
              <p className="eyebrow">Step 1</p>
              <h2>Nutrition today</h2>
              <p>Enter what you actually consumed today.</p>
            </div>
          </div>

          {hasMealTotals && (
            <div className="checkin-meal-sync">
              <div>
                <span>Meal log totals today</span>
                <strong>{formatNumber(mealTotals.calories)} kcal</strong>
                <small>
                  {todayMealLogs.length} meals / {formatNumber(mealTotals.protein)}g protein / {formatNumber(mealTotals.water, 1)}L water
                </small>
              </div>
              <Button type="button" variant="ghost" onClick={useMealLogTotals}>
                Use Meal Log Totals
              </Button>
            </div>
          )}

          <div className="form-grid">
            <Input
              label="Calories consumed"
              type="number"
              value={form.calories}
              placeholder="Example: 2200"
              hint="Used for dashboard and prediction context."
              onChange={(event) => updateField("calories", event.target.value)}
            />
            <Input
              label="Protein consumed (g)"
              type="number"
              value={form.protein}
              placeholder="Example: 120"
              hint="Used to understand nutrition completeness."
              onChange={(event) => updateField("protein", event.target.value)}
            />
            <Input
              label="Water intake (L)"
              type="number"
              step="0.1"
              value={form.water}
              placeholder="Example: 2.5"
              hint="Used for recovery context."
              onChange={(event) => updateField("water", event.target.value)}
            />
          </div>
        </article>

        <article className="panel checkin-section">
          <div className="checkin-section-header">
            <div className="stat-icon">
              <Bed size={20} />
            </div>
            <div>
              <p className="eyebrow">Step 2</p>
              <h2>Recovery</h2>
              <p>Sleep is one of the strongest diet-failure signals.</p>
            </div>
          </div>

          <Input
            label="Sleep hours"
            type="number"
            step="0.1"
            value={form.sleep}
            placeholder="Example: 7.5"
            hint="The risk system uses this directly."
            onChange={(event) => updateField("sleep", event.target.value)}
          />
        </article>

        <article className="panel checkin-section">
          <div className="checkin-section-header">
            <div className="stat-icon">
              <Brain size={20} />
            </div>
            <div>
              <p className="eyebrow">Step 3</p>
              <h2>Behavior signals</h2>
              <p>Rate the mental signals that affect diet consistency.</p>
            </div>
          </div>

          <div className="range-grid checkin-range-grid">
            <RangeField
              label="Mood"
              value={form.mood}
              hint={rangeHints.mood}
              onChange={(value) => updateField("mood", value)}
            />
            <RangeField
              label="Stress"
              value={form.stress}
              hint={rangeHints.stress}
              onChange={(value) => updateField("stress", value)}
            />
            <RangeField
              label="Cravings"
              value={form.cravings}
              hint={rangeHints.cravings}
              onChange={(value) => updateField("cravings", value)}
            />
          </div>
        </article>

        <article className="panel checkin-section">
          <div className="checkin-section-header">
            <div className="stat-icon">
              <HeartPulse size={20} />
            </div>
            <div>
              <p className="eyebrow">Step 4</p>
              <h2>Daily notes</h2>
              <p>Add context that numbers do not explain.</p>
            </div>
          </div>

          <label className="form-field">
            <span>Notes</span>
            <textarea
              placeholder="Training, cravings, hunger, energy, schedule, emotional eating..."
              value={form.notes}
              onChange={(event) => updateField("notes", event.target.value)}
            />
          </label>

          <div className="form-actions">
            <Button type="submit">Save Check-In</Button>
          </div>

          <Toast
            type="success"
            message={saved ? "Daily check-in saved successfully." : ""}
          />
        </article>
      </form>

      <aside className="panel checkin-guide">
        <p className="eyebrow">What this powers</p>
        <h2>Why these questions matter</h2>

        <div className="guide-list">
          <GuideItem
            icon={Flame}
            title="Failure risk"
            text="Calories, protein, water, sleep, stress, cravings, and mood are used to calculate your risk."
          />
          <GuideItem
            icon={Utensils}
            title="Dashboard metrics"
            text="Calories, protein, water, and sleep update the dashboard cards."
          />
          <GuideItem
            icon={Droplets}
            title="Predictions"
            text="The prediction page only uses values you save here."
          />
        </div>
      </aside>
    </section>
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

function GuideItem({ icon: Icon, title, text }) {
  return (
    <div className="guide-item">
      <div className="stat-icon">
        <Icon size={18} />
      </div>
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
    </div>
  );
}
