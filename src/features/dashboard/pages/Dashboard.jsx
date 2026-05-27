import {
  Apple,
  Bed,
  ClipboardCheck,
  Droplets,
  HeartPulse,
  Scale,
  ShieldAlert,
  Target,
  Utensils
} from "lucide-react";
import SectionHeader from "../../../components/shared/SectionHeader";
import Button from "../../../components/ui/Button";
import { useAuth } from "../../../hooks/useAuth";
import { addDaysToDateKey, getLocalDateKey } from "../../../utils/dateKeys";
import StatCard from "../components/StatCard";
import HealthScoreCard from "../components/HealthScoreCard";
import StreakCard from "../components/StreakCard";

function valueOrMissing(value, suffix = "") {
  const hasValue = value !== undefined && value !== null && value !== "";
  return hasValue ? `${value}${suffix}` : "Not entered";
}

function calculateScore(checkIn) {
  if (!checkIn) return null;

  const sleepScore = Math.min(100, Math.round((Number(checkIn.sleep) / 8) * 100));
  const moodScore = Number(checkIn.mood) * 10;
  const stressScore = Math.max(0, 100 - Number(checkIn.stress) * 10);
  const cravingScore = Math.max(0, 100 - Number(checkIn.cravings) * 10);

  return Math.round((sleepScore + moodScore + stressScore + cravingScore) / 4);
}

function calculateRisk(checkIn) {
  if (!checkIn) {
    return {
      label: "Not entered",
      trend: "",
      message: "Complete a daily check-in to calculate failure risk."
    };
  }

  const sleep = Number(checkIn.sleep);
  const stress = Number(checkIn.stress);
  const cravings = Number(checkIn.cravings);
  const risk = Math.min(
    100,
    Math.round((stress * 4 + cravings * 4 + Math.max(0, 8 - sleep) * 7) * 1.6)
  );

  if (risk >= 70) {
    return {
      label: "High",
      trend: `${risk}%`,
      message: "Your own check-in shows high pressure from today's signals."
    };
  }

  if (risk >= 40) {
    return {
      label: "Medium",
      trend: `${risk}%`,
      message: "Your own check-in shows some risk signals to watch."
    };
  }

  return {
    label: "Low",
    trend: `${risk}%`,
    message: "Your own check-in currently shows low failure risk."
  };
}

function calculateCheckInStreak(account, todayKey) {
  if (!account) {
    return {
      days: 0,
      isPendingToday: false,
      latestDate: null
    };
  }

  const checkInDates = new Set(
    (account.dailyHistory || [])
      .filter((record) => record.date && record.checkIn)
      .map((record) => record.date)
  );

  if (account.dailyCheckIn?.savedAt) {
    checkInDates.add(account.dailyCheckIn.checkInDate || todayKey);
  }

  const sortedDates = Array.from(checkInDates).sort((a, b) => b.localeCompare(a));
  const latestDate = sortedDates[0];

  if (!latestDate) {
    return {
      days: 0,
      isPendingToday: false,
      latestDate: null
    };
  }

  let streak = 0;
  let currentDateKey = latestDate;

  while (checkInDates.has(currentDateKey)) {
    streak += 1;
    currentDateKey = addDaysToDateKey(currentDateKey, -1);
  }

  return {
    days: latestDate === todayKey || latestDate === addDaysToDateKey(todayKey, -1) ? streak : 0,
    isPendingToday: latestDate === addDaysToDateKey(todayKey, -1),
    latestDate
  };
}

export default function Dashboard({ setActiveRoute }) {
  const { account } = useAuth();
  const profile = account?.dietProfile || {};
  const checkIn = account?.dailyCheckIn;
  const todayKey = getLocalDateKey();
  const hasCheckIn = Boolean(checkIn?.savedAt && checkIn.checkInDate === todayKey);
  const todayCheckIn = hasCheckIn ? checkIn : null;
  const score = calculateScore(todayCheckIn);
  const risk = calculateRisk(todayCheckIn);
  const streak = calculateCheckInStreak(account, todayKey);

  return (
    <div className="page-stack">
      <SectionHeader
        eyebrow="Reality Engine X"
        title={`${profile.personName || account?.name || "Your"} Diet Dashboard`}
        description="This dashboard now shows only information you entered in diet setup or daily check-in."
        action={
          <Button onClick={() => setActiveRoute("checkin")}>
            <ClipboardCheck size={18} />
            Daily Check-In
          </Button>
        }
      />

      <section className="hero-grid">
        <article className="hero-card premium-hero">
          <div className="hero-content">
            <p className="eyebrow" style={{ color: "var(--success)" }}>Live Insights</p>
            <h2 className="gradient-text">
              {hasCheckIn
                ? `System stability is ${risk.label.toLowerCase()}.`
                : "Awaiting your first data entry for today."}
            </h2>
            <p>
              {hasCheckIn
                ? risk.message
                : "Log your nutrition, hydration, and mental metrics to activate your real-time risk analysis dashboard."}
            </p>
          </div>

          <div className="hero-actions">
            <Button onClick={() => setActiveRoute("checkin")} className="btn-primary">
              <ClipboardCheck size={18} />
              {hasCheckIn ? "Refine Check-In" : "Complete Today's Log"}
            </Button>

            <Button variant="ghost" onClick={() => setActiveRoute("account")}>
              Configuration Dashboard
            </Button>

            <Button variant="ghost" onClick={() => setActiveRoute("meals")}>
              <Utensils size={18} />
              Meal Log
            </Button>
          </div>
        </article>

        <HealthScoreCard score={score} />
      </section>

      <section className="stats-grid">
        <StatCard
          title="Active Plan"
          value={account?.dietPlans?.[0]?.planName || "No Plan"}
          subtitle={account?.dietPlans?.[0] ? `${account.dietPlans[0].dailyCalories} kcal target` : "Set a plan in Diet Plans"}
          icon={Target}
        />

        <StatCard
          title="Current Weight"
          value={valueOrMissing(account?.progressHistory?.[0]?.weight || profile.currentWeightKg, "kg")}
          subtitle="Latest recorded weight"
          icon={Scale}
        />

        <StatCard
          title="Weight Goal"
          value={valueOrMissing(profile.targetWeightKg, "kg")}
          subtitle={`Target: ${profile.goal || 'Not set'}`}
          icon={Target}
        />

        <StatCard
          title="Daily Calories"
          value={valueOrMissing(todayCheckIn?.calories)}
          subtitle={hasCheckIn ? "Logged today" : "Not logged yet"}
          icon={Apple}
        />

        <StatCard
          title="Protein"
          value={valueOrMissing(todayCheckIn?.protein, "g")}
          subtitle={hasCheckIn ? "Logged today" : "Not logged yet"}
          icon={HeartPulse}
        />

        <StatCard
          title="Risk Level"
          value={risk.label}
          subtitle="AI failure prediction"
          trend={risk.trend}
          icon={ShieldAlert}
        />
      </section>

      <section className="two-column">
        <StreakCard
          streakDays={streak.days}
          isPendingToday={streak.isPendingToday}
          latestDate={streak.latestDate}
        />

        <article className="panel">
          <p className="eyebrow">Data source</p>
          <h2>Database-backed values</h2>
          <p>
            Dashboard cards use your diet setup and daily check-in only. If you
            have not entered a value, the dashboard will show it as missing.
          </p>

          <div className="tag-row">
            <span>Diet setup</span>
            <span>Daily check-in</span>
            <span>Saved in database</span>
            <span>Entered records only</span>
          </div>
        </article>
      </section>
    </div>
  );
}
