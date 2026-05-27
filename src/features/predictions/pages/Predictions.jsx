import SectionHeader from "../../../components/shared/SectionHeader";
import PredictionCard from "../components/PredictionCard";
import { usePredictions } from "../hooks/usePredictions";
import { useAuth } from "../../../hooks/useAuth";
import { Sparkles, Loader2 } from "lucide-react";

export default function Predictions() {
  const { account } = useAuth();
  const { predictions, aiPredictions, loadingAi, errorAi } = usePredictions();

  const hasData = predictions.length > 0 || aiPredictions.length > 0;

  return (
    <div className="page-stack">
      <SectionHeader
        eyebrow="AI prediction center"
        title="Predictions"
        description="Predictions are generated from your diet setup, daily check-in, and uploaded mobile health data."
      />

      {!hasData && !loadingAi ? (
        <article className="panel">
          <p className="eyebrow">No entered data</p>
          <h2>No predictions yet</h2>
          <p>
            Save a daily check-in or upload mobile data first. The prediction
            center only shows insights generated from your database records.
          </p>
        </article>
      ) : (
        <div className="page-stack">
          {/* AI Insights Section */}
          <section className="panel ai-prediction-highlight">
            <div className="assistant-chat-header">
              <div className="stat-icon">
                <Sparkles size={22} className="text-primary" />
              </div>
              <div>
                <p className="eyebrow">Real AI Engine</p>
                <h2>Premium Insights</h2>
              </div>
            </div>

            {loadingAi ? (
              <div className="flex-center py-xl">
                <Loader2 className="animate-spin text-primary" size={32} />
                <p className="mt-md text-muted">Calculating AI predictions with OpenRouter...</p>
              </div>
            ) : errorAi ? (
              <p className="text-error">{errorAi}</p>
            ) : aiPredictions.length > 0 ? (
              <div className="card-list mt-lg">
                {aiPredictions.map((prediction) => (
                  <PredictionCard 
                    key={prediction.title} 
                    prediction={prediction} 
                    isAi={true}
                  />
                ))}
              </div>
            ) : (
              <p className="text-muted">No AI insights generated for this data yet.</p>
            )}
          </section>

          {/* Heuristic Predictions Section */}
          {predictions.length > 0 && (
            <section className="page-stack">
              <div className="assistant-chat-header px-md">
                <div>
                  <p className="eyebrow">Data Analysis</p>
                  <h2>Core Predictions</h2>
                </div>
              </div>
              <div className="card-list">
                {predictions.map((prediction) => (
                  <PredictionCard key={prediction.title} prediction={prediction} />
                ))}
              </div>
            </section>
          )}

          {/* Saved Prediction History Section */}
          {(account?.predictionHistory || []).length > 0 && (
            <section className="page-stack">
              <div className="assistant-chat-header px-md">
                <div>
                  <p className="eyebrow">Database Records</p>
                  <h2>Prediction History</h2>
                </div>
              </div>
              <div className="card-list">
                {(account?.predictionHistory || []).map((p, idx) => (
                  <article key={idx} className="panel prediction-card">
                    <div className="prediction-header">
                      <h3>{p.predictionStatus || "AI Insight"}</h3>
                      <div className={`badge ${p.riskLevel?.toLowerCase()}`}>{p.riskLevel} Risk</div>
                    </div>
                    <p>{p.reason}</p>
                    <div className="prediction-footer mt-md">
                      <small>Generated on: {p.date}</small>
                      <strong>{(p.successProbability * 100).toFixed(0)}% Success Probability</strong>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
