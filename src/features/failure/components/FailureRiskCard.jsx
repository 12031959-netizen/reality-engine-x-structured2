export default function FailureRiskCard({ score, level }) {
  return (
    <article className={`panel failure-risk-card ${level.className}`}>
      <div>
        <p className="eyebrow">Diet plan failure probability</p>
        <h1>{score}%</h1>
        <h2>{level.label}</h2>
        <p>{level.message}</p>
      </div>

      <div className="risk-meter">
        <div className="risk-meter-inner">
          <span>{score}</span>
        </div>
      </div>
    </article>
  );
}
