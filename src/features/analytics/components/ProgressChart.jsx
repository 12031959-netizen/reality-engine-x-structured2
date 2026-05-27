import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

export default function ProgressChart({ data }) {
  if (!data.length) {
    return (
      <article className="panel chart-panel">
        <p className="eyebrow">Consistency</p>
        <h2>Progress Score</h2>
        <p>There is no saved check-in yet, so no consistency score is available.</p>
      </article>
    );
  }

  return (
    <article className="panel chart-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Consistency</p>
          <h2>Progress Score</h2>
        </div>
      </div>

      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="day" />
            <YAxis domain={[0, 100]} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="score"
              stroke="#38bdf8"
              strokeWidth={3}
              dot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}
