import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Scale, TrendingUp, History, Plus } from "lucide-react";
import SectionHeader from "../../../components/shared/SectionHeader";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import { useAuth } from "../../../hooks/useAuth";

function valueOrMissing(value, suffix = "") {
  const hasValue = value !== undefined && value !== null && value !== "" && value !== 0 && value !== "0" && value !== "0.00";
  return hasValue ? `${value}${suffix}` : "-";
}

export default function Progress() {
  const { account, saveProgress } = useAuth();
  const history = account.progressHistory || [];
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    weight: "",
    bodyMeasurement: "",
    progressNote: "",
    consistencyScore: "10"
  });

  const chartData = [...history].reverse().map(p => ({
    date: p.date,
    weight: Number(p.weight)
  }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const res = await saveProgress(form);
    if (res.ok) {
      setShowAdd(false);
      setForm({ weight: "", bodyMeasurement: "", progressNote: "", consistencyScore: "10" });
    } else {
      setError(res.message || "Could not save progress entry.");
    }
  }

  return (
    <div className="page-stack">
      <SectionHeader
        eyebrow="Evolution"
        title="Progress Tracking"
        description="Monitor your weight trends and body measurements over time to stay on track with your goals."
        action={
          <Button onClick={() => setShowAdd(!showAdd)}>
            {showAdd ? "Cancel" : <><Plus size={18} /> Add Entry</>}
          </Button>
        }
      />

      {showAdd && (
        <article className="panel animate-in">
          <h2>New Progress Entry</h2>
          <form onSubmit={handleSubmit} className="form-grid mt-md">
            <Input 
              label="Weight (kg)" 
              type="number" 
              step="0.1" 
              value={form.weight} 
              required 
              onChange={e => setForm({...form, weight: e.target.value})}
            />
            <Input 
              label="Body Measurement (e.g. Waist cm)" 
              value={form.bodyMeasurement} 
              onChange={e => setForm({...form, bodyMeasurement: e.target.value})}
            />
            <Input 
              label="Consistency Score (1-10)" 
              type="number" 
              min="1" max="10" 
              value={form.consistencyScore} 
              onChange={e => setForm({...form, consistencyScore: e.target.value})}
            />
            <div className="full-width">
              <label className="form-field">
                <span>Progress Note</span>
                <textarea 
                  value={form.progressNote} 
                  onChange={e => setForm({...form, progressNote: e.target.value})}
                />
              </label>
            </div>
            <div className="form-actions">
              <Button type="submit">Save Entry</Button>
            </div>
            {error && <p className="form-error full-width">{error}</p>}
          </form>
        </article>
      )}

      <div className="two-column">
        <section className="panel chart-panel">
          <div className="panel-header">
            <div className="stat-icon"><TrendingUp size={20} /></div>
            <h2>Weight Trend</h2>
          </div>
          <div style={{ width: '100%', height: 300 }}>
            {chartData.length > 0 ? (
              <ResponsiveContainer>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" />
                  <XAxis dataKey="date" stroke="#666" fontSize={12} />
                  <YAxis stroke="#666" fontSize={12} domain={['dataMin - 2', 'dataMax + 2']} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#111', border: '1px solid #333' }}
                    itemStyle={{ color: 'var(--color-primary)' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="weight" 
                    stroke="var(--color-primary)" 
                    strokeWidth={3} 
                    dot={{ fill: 'var(--color-primary)', r: 4 }}
                    activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex-center h-full text-muted">No trend data available. Add your first weight entry.</div>
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div className="stat-icon"><Scale size={20} /></div>
            <h2>Summary</h2>
          </div>
          <div className="stats-grid compact">
            <div className="stat-item">
              <p className="eyebrow">Current</p>
              <h3>{valueOrMissing(history[0]?.weight || account.currentWeight, " kg")}</h3>
            </div>
            <div className="stat-item">
              <p className="eyebrow">Target</p>
              <h3>{valueOrMissing(account.targetWeight, " kg")}</h3>
            </div>
            <div className="stat-item">
              <p className="eyebrow">Remaining</p>
              <h3>
                {account.targetWeight && (history[0]?.weight || account.currentWeight) 
                  ? Math.abs(Number(history[0]?.weight || account.currentWeight) - Number(account.targetWeight)).toFixed(1) + " kg"
                  : "-"}
              </h3>
            </div>
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="panel-header">
          <div className="stat-icon"><History size={20} /></div>
          <h2>Entry History</h2>
        </div>
        <div className="history-list mt-md">
          {history.length === 0 ? (
            <p className="text-muted">No progress entries yet.</p>
          ) : (
            history.map((p, idx) => (
              <div key={idx} className="history-item-compact">
                <div className="history-date"><strong>{p.date}</strong></div>
                <div className="history-val"><strong>{p.weight} kg</strong></div>
                <div className="history-info">{p.bodyMeasurement || "No measurements"}</div>
                <div className="history-note">{p.progressNote}</div>
                <div className="history-score">Score: {p.consistencyScore}/10</div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
