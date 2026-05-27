export default function HealthScoreCard({ score }) {
  if (score === null || score === undefined) {
    return (
      <article className="panel health-score-card">
        <div>
          <p className="eyebrow">Health score</p>
          <h2>Pending</h2>
          <p>
            Save a daily check-in before Reality Engine X calculates a score
            from your own inputs.
          </p>
        </div>

        <div className="score-ring score-ring-pending">
          <span>--</span>
        </div>
      </article>
    );
  }

  return (
    <article className="panel health-score-card">
      <div>
        <p className="eyebrow">Health score</p>
        <h2>{score}/100</h2>
        <p>
          Your score is calculated from nutrition, sleep, activity, mood,
          cravings, and weekly consistency.
        </p>
      </div>

      <div
        className="score-ring"
        style={{
          "--score-value": `${score}%`
        }}
      >
        <span>{score}%</span>
      </div>
    </article>
  );
}
