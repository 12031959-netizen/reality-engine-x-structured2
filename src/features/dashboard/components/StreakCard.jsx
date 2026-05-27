import { Flame } from "lucide-react";

export default function StreakCard({ streakDays, isPendingToday, latestDate }) {
  const hasStreak = streakDays > 0;
  const message = hasStreak
    ? isPendingToday
      ? "Your streak is still alive. Complete today's check-in to extend it."
      : "Your streak includes consecutive daily check-ins."
    : latestDate
      ? "Your last check-in is not recent enough to keep the streak active."
      : "Complete a daily check-in to start tracking consistency.";

  return (
    <article className="panel streak-card">
      <div className="streak-icon">
        <Flame size={24} />
      </div>

      <div>
        <p className="eyebrow">Consistency streak</p>
        <h2>
          {hasStreak
            ? `${streakDays} ${streakDays === 1 ? "day" : "days"}`
            : "Not started"}
        </h2>
        <p>{message}</p>
      </div>
    </article>
  );
}
