import { Sparkles } from "lucide-react";

export default function PredictionCard({ prediction, isAi }) {
  const getLevelColor = (level) => {
    const l = String(level || "").toLowerCase();
    if (l.includes("high") || l.includes("loss")) return "var(--color-error)";
    if (l.includes("medium") || l.includes("watch")) return "var(--color-warning)";
    if (l.includes("positive") || l.includes("stable") || l.includes("strong")) return "var(--color-success)";
    return "var(--color-primary)";
  };

  return (
    <article className={`panel prediction-card ${isAi ? 'ai-premium-card' : ''}`}>
      <div className="prediction-top">
        <div className="flex-grow" style={{ flex: 1 }}>
          <div className="flex-between align-start" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <p className="eyebrow" style={{ color: getLevelColor(prediction.level), margin: 0 }}>
              {prediction.level}
            </p>
            {isAi && (
              <span className="ai-badge" style={{ 
                background: 'var(--color-primary-soft)', 
                color: 'var(--color-primary)',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '0.7rem',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontWeight: 'bold'
              }}>
                <Sparkles size={10} />
                REAL AI
              </span>
            )}
          </div>
          <h2 className="prediction-title" style={{ marginTop: '4px' }}>{prediction.title}</h2>
        </div>

        <div className="prediction-probability" style={{ marginLeft: '1rem' }}>
          <strong>{prediction.probability}%</strong>
        </div>
      </div>

      <p className="prediction-description" style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginTop: '8px' }}>
        {prediction.description}
      </p>

      <div className="progress-track" style={{ marginTop: '12px', height: '6px', background: 'var(--color-border)', borderRadius: '3px', overflow: 'hidden' }}>
        <span 
          style={{ 
            display: 'block',
            height: '100%',
            width: `${prediction.probability}%`,
            backgroundColor: getLevelColor(prediction.level),
            boxShadow: `0 0 8px ${getLevelColor(prediction.level)}66`,
            transition: 'width 1s ease-out'
          }} 
        />
      </div>
    </article>
  );
}