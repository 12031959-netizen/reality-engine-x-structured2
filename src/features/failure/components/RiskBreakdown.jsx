export default function RiskBreakdown({ insights }) {
  return (
    <article className="panel">
      <p className="eyebrow">Risk breakdown</p>
      <h2>Why this score happened</h2>

      <div className="insight-list">
        {insights.map((insight) => (
          <div className="insight-row" key={insight.label}>
            <div>
              <h3>{insight.label}</h3>
              <p>{insight.description}</p>
            </div>

            <div className="impact-pill">
              <strong>{insight.value}</strong>
              <span>{insight.impact}</span>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}
