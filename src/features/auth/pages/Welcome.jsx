import { ArrowRight, ClipboardCheck, LineChart, ShieldCheck, Sparkles } from "lucide-react";
import Button from "../../../components/ui/Button";

const highlights = [
  {
    icon: ClipboardCheck,
    title: "Daily behaviors",
    text: "Log nutrition, sleep, and stress in seconds."
  },
  {
    icon: LineChart,
    title: "Smart Trends",
    text: "Watch your data transform into actionable insights."
  },
  {
    icon: ShieldCheck,
    title: "Risk Analysis",
    text: "Predict and prevent diet abandonment before it happens."
  }
];

export default function Welcome({ setAuthRoute }) {
  return (
    <section className="welcome-page">
      <div className="welcome-shell">
        <div className="welcome-copy">
          <p className="eyebrow">
            <Sparkles size={14} style={{ marginRight: 8, color: "var(--primary)" }} />
            The Future of Diet Management
          </p>
          <h1>Control your diet with precision</h1>
          <p>
            Experience the first diet management system that predicts failure before it happens. 
            Track your behaviors, understand your body, and achieve lasting results.
          </p>

          <div className="welcome-actions">
            <Button onClick={() => setAuthRoute("login")} className="btn-primary">
              Launch Console
              <ArrowRight size={18} />
            </Button>
            <Button variant="ghost" onClick={() => setAuthRoute("signup")}>
              Create account
            </Button>
          </div>
        </div>

        <div className="welcome-preview" aria-hidden="true">
          <div className="welcome-score">
            <span>Current Stability</span>
            <strong>82%</strong>
            <small>High Stability Zone</small>
          </div>

          <div className="welcome-bars">
            <div style={{ display: "flex", alignItems: "flex-end", height: "100%", gap: 12 }}>
              {[72, 48, 86, 62, 78, 55, 90].map((h, i) => (
                <span key={i} style={{ 
                  flex: 1, 
                  height: `${h}%`, 
                  borderRadius: "12px 12px 4px 4px",
                  background: "linear-gradient(to top, var(--primary), var(--success))",
                  opacity: 0.8
                }} />
              ))}
            </div>
          </div>
        </div>

        <div className="welcome-highlights">
          {highlights.map(({ icon: Icon, title, text }) => (
            <article key={title}>
              <div className="stat-icon" style={{ background: "rgba(14, 165, 233, 0.1)", width: 48, height: 48 }}>
                <Icon size={24} color="var(--primary)" />
              </div>
              <h2>{title}</h2>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
