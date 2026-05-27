const signals = [
  {
    label: "Calories",
    getValue: (data) =>
      data.calories.consumed
        ? data.calories.target
          ? `${data.calories.consumed} / ${data.calories.target}`
          : `${data.calories.consumed}`
        : "Not entered",
    getScore: (data) => {
      if (!data.calories.consumed || !data.calories.target) return 0;
      const gap = Math.abs(data.calories.consumed - data.calories.target);
      return Math.max(0, Math.round(100 - (gap / data.calories.target) * 100));
    },
    target: "Consumed / target"
  },
  {
    label: "Protein",
    getValue: (data) =>
      data.protein.consumed
        ? data.protein.target
          ? `${data.protein.consumed}g / ${data.protein.target}g`
          : `${data.protein.consumed}g`
        : "Not entered",
    getScore: (data) => {
      if (!data.protein.consumed || !data.protein.target) return 0;
      return Math.min(
        100,
        Math.round((data.protein.consumed / data.protein.target) * 100)
      );
    },
    target: "Consumed / target"
  },
  {
    label: "Water",
    getValue: (data) =>
      data.water?.consumed
        ? data.water.target
          ? `${data.water.consumed}L / ${data.water.target}L`
          : `${data.water.consumed}L`
        : "Not entered",
    getScore: (data) => {
      if (!data.water?.consumed || !data.water?.target) return 0;
      return Math.min(
        100,
        Math.round((data.water.consumed / data.water.target) * 100)
      );
    },
    target: "Consumed / target"
  },
  {
    label: "Sleep",
    getValue: (data) => `${data.sleep.lastNight}h`,
    getScore: (data) => Math.min(100, Math.round((data.sleep.lastNight / 8) * 100)),
    target: "From daily check-in"
  },
  {
    label: "Mood",
    getValue: (data) => `${data.mood.score}/10`,
    getScore: (data) => data.mood.score * 10,
    target: "From daily check-in"
  },
  {
    label: "Stress",
    getValue: (data) => `${data.stress.score}/10`,
    getScore: (data) => Math.max(0, 100 - data.stress.score * 10),
    target: "Lower is safer"
  },
  {
    label: "Cravings",
    getValue: (data) => `${data.cravings.score}/10`,
    getScore: (data) => Math.max(0, 100 - data.cravings.score * 10),
    target: "Lower is safer"
  }
];

export default function SignalMonitor({ healthData }) {
  return (
    <article className="panel signal-monitor">
      <div className="panel-header">
        <div>
          <p className="eyebrow">System inputs</p>
          <h2>Diet and behavior signals</h2>
        </div>
      </div>

      <div className="signal-grid">
        {signals.map((signal) => {
          const score = signal.getScore(healthData);

          return (
            <div className="signal-card" key={signal.label}>
              <div className="signal-card-header">
                <span>{signal.label}</span>
                <strong>{signal.getValue(healthData)}</strong>
              </div>
              <div className="progress-track">
                <span style={{ width: `${score}%` }} />
              </div>
              <small>{signal.target}</small>
            </div>
          );
        })}
      </div>
    </article>
  );
}
