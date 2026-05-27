import SectionHeader from "../../../components/shared/SectionHeader";
import { useAuth } from "../../../hooks/useAuth";
import { getLocalDateKey } from "../../../utils/dateKeys";
import TrendChart from "../components/TrendChart";
import ProgressChart from "../components/ProgressChart";

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) && value !== "" ? number : null;
}

function formatValue(value, suffix = "") {
  return value !== null && value !== undefined && value !== ""
    ? `${value}${suffix}`
    : "Not uploaded";
}

function scoreFrom(checkIn = {}, wearableData = {}) {
  const sleep = numberOrNull(checkIn.sleep);
  const mood = numberOrNull(checkIn.mood);
  const stress = numberOrNull(checkIn.stress);
  const cravings = numberOrNull(checkIn.cravings);
  const water = numberOrNull(checkIn.water);
  const steps = numberOrNull(wearableData.steps);
  const activeMinutes = numberOrNull(wearableData.activeMinutes);
  const recoveryScore = numberOrNull(wearableData.recoveryScore);
  const signals = [];

  if (sleep !== null) signals.push(Math.min(100, (sleep / 8) * 100));
  if (mood !== null) signals.push(mood * 10);
  if (stress !== null) signals.push(Math.max(0, 100 - stress * 10));
  if (cravings !== null) signals.push(Math.max(0, 100 - cravings * 10));
  if (water !== null) signals.push(Math.min(100, (water / 3) * 100));
  if (steps !== null) signals.push(Math.min(100, (steps / 8000) * 100));
  if (activeMinutes !== null) {
    signals.push(Math.min(100, (activeMinutes / 45) * 100));
  }
  if (recoveryScore !== null) signals.push(Math.min(100, recoveryScore));

  if (!signals.length) return null;

  return Math.round(
    signals.reduce((total, signal) => total + signal, 0) / signals.length
  );
}

function upsertRecord(records, date, patch) {
  const current = records.get(date) || { date };
  records.set(date, {
    ...current,
    ...patch
  });
}

function buildAnalyticsData(account, todayKey) {
  const records = new Map();

  (account.dailyHistory || []).forEach((record) => {
    upsertRecord(records, record.date, {
      checkIn: record.checkIn,
      wearableData: record.wearableData
    });
  });

  if (account.dailyCheckIn?.savedAt) {
    upsertRecord(records, account.dailyCheckIn.checkInDate || todayKey, {
      checkIn: account.dailyCheckIn
    });
  }

  if (account.wearableData?.savedAt) {
    upsertRecord(records, account.wearableData.wearableDate || todayKey, {
      wearableData: account.wearableData
    });
  }

  return Array.from(records.values())
    .filter((record) => record.checkIn || record.wearableData)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14)
    .map((record) => {
      const checkIn = record.checkIn || {};
      const wearableData = record.wearableData || {};

      return {
        day: new Date(`${record.date}T00:00:00`).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric"
        }),
        date: record.date,
        calories: numberOrNull(checkIn.calories),
        protein: numberOrNull(checkIn.protein),
        sleep: numberOrNull(checkIn.sleep),
        mood: numberOrNull(checkIn.mood),
        stress: numberOrNull(checkIn.stress),
        water: numberOrNull(checkIn.water),
        steps: numberOrNull(wearableData.steps),
        heartRate: numberOrNull(wearableData.heartRate),
        activeMinutes: numberOrNull(wearableData.activeMinutes),
        recoveryScore: numberOrNull(wearableData.recoveryScore),
        source: wearableData.source || "Daily check-in",
        score: scoreFrom(checkIn, wearableData)
      };
    });
}

export default function Analytics() {
  const { account } = useAuth();
  const todayKey = getLocalDateKey();
  const analyticsData = buildAnalyticsData(account, todayKey);
  const latest = analyticsData.at(-1);
  const profile = account.dietProfile || {};

  return (
    <div className="page-stack">
      <SectionHeader
        eyebrow="Progress analytics"
        title="Analytics"
        description="Analytics use your saved diet profile, daily check-ins, and uploaded mobile health data."
      />

      <section className="stats-grid">
        <article className="panel">
          <p className="eyebrow">Saved days</p>
          <h2>{analyticsData.length}</h2>
          <p>Daily records found from check-ins and uploaded health data.</p>
        </article>
        <article className="panel">
          <p className="eyebrow">Latest score</p>
          <h2>{formatValue(latest?.score, "%")}</h2>
          <p>Calculated only from the values saved in your account.</p>
        </article>
        <article className="panel">
          <p className="eyebrow">Uploaded steps</p>
          <h2>{formatValue(latest?.steps)}</h2>
          <p>{latest?.source || "Upload phone or Apple Watch data first."}</p>
        </article>
        <article className="panel">
          <p className="eyebrow">Heart rate</p>
          <h2>{formatValue(latest?.heartRate, " bpm")}</h2>
          <p>Shown when your uploaded health file includes heart data.</p>
        </article>
      </section>

      <section className="two-column">
        <TrendChart data={analyticsData} />
        <ProgressChart data={analyticsData} />
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Data used</p>
            <h2>Your uploaded and entered information</h2>
          </div>
        </div>

        <div className="profile-summary">
          <div>
            <span>Person</span>
            <strong>{profile.personName || account.name || "Not provided"}</strong>
          </div>
          <div>
            <span>Goal</span>
            <strong>{profile.goal || "Not provided"}</strong>
          </div>
          <div>
            <span>Weight target</span>
            <strong>
              {profile.currentWeightKg && profile.targetWeightKg
                ? `${profile.currentWeightKg} kg to ${profile.targetWeightKg} kg`
                : "Not provided"}
            </strong>
          </div>
          <div>
            <span>Latest calories</span>
            <strong>{formatValue(latest?.calories)}</strong>
          </div>
          <div>
            <span>Latest protein</span>
            <strong>{formatValue(latest?.protein, "g")}</strong>
          </div>
          <div>
            <span>Active minutes</span>
            <strong>{formatValue(latest?.activeMinutes, " min")}</strong>
          </div>
          <div>
            <span>Recovery</span>
            <strong>{formatValue(latest?.recoveryScore, "%")}</strong>
          </div>
          <div>
            <span>Mobile data source</span>
            <strong>{latest?.source || "Not uploaded"}</strong>
          </div>
        </div>
      </section>
    </div>
  );
}
