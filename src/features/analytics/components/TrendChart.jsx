import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

export default function TrendChart({ data }) {
  if (!data.length) {
    return (
      <article className="panel chart-panel">
        <p className="eyebrow">Signals</p>
        <h2>Weekly Trend</h2>
        <p>
          Save a daily check-in or upload mobile data before analytics can
          draw a trend.
        </p>
      </article>
    );
  }

  return (
    <article className="panel chart-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Signals</p>
          <h2>Your Entered and Uploaded Data</h2>
        </div>
      </div>

      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="day" />
            <YAxis yAxisId="score" domain={[0, 10]} />
            <YAxis yAxisId="largeValues" orientation="right" hide />
            <Tooltip />
            <Legend />
            <Line
              yAxisId="largeValues"
              type="monotone"
              dataKey="calories"
              stroke="#38bdf8"
              strokeWidth={3}
              dot={{ r: 5 }}
            />
            <Line
              yAxisId="largeValues"
              type="monotone"
              dataKey="steps"
              stroke="#8b5cf6"
              strokeWidth={3}
              dot={{ r: 5 }}
            />
            <Line
              yAxisId="largeValues"
              type="monotone"
              dataKey="heartRate"
              stroke="#ef4444"
              strokeWidth={3}
              dot={{ r: 5 }}
            />
            <Line
              yAxisId="score"
              type="monotone"
              dataKey="sleep"
              stroke="#22c55e"
              strokeWidth={3}
              dot={{ r: 5 }}
            />
            <Line
              yAxisId="score"
              type="monotone"
              dataKey="mood"
              stroke="#f59e0b"
              strokeWidth={3}
              dot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}
