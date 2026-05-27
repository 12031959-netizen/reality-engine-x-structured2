import { useEffect, useState } from "react";
import { CalendarDays, History, Trash2, X } from "lucide-react";
import Button from "../../../components/ui/Button";
import SectionHeader from "../../../components/shared/SectionHeader";
import FailureRiskCard from "../components/FailureRiskCard";
import RiskBreakdown from "../components/RiskBreakdown";
import AlertBanner from "../components/AlertBanner";
import ScenarioSimulator from "../components/ScenarioSimulator";
import FailureSystemFlow from "../components/FailureSystemFlow";
import InterventionPlan from "../components/InterventionPlan";
import SignalMonitor from "../components/SignalMonitor";
import BmrPlanCard from "../components/BmrPlanCard";
import { useFailurePrediction } from "../hooks/useFailurePrediction";
import { useAuth } from "../../../hooks/useAuth";

export default function FailurePrediction({ setActiveRoute }) {
  const { hasData, score, level, behaviorInsights, reasons, healthData } =
    useFailurePrediction();
  const { account, deleteFailureRiskResult, saveFailureRiskResult } = useAuth();
  const [showHistory, setShowHistory] = useState(false);
  const history = account?.failureRiskHistory || [];
  const checkInDate = account?.dailyCheckIn?.checkInDate;

  useEffect(() => {
    if (!hasData || score === null || !checkInDate) return;

    const alreadySaved = history.some((item) =>
      item.checkInDate === checkInDate && Number(item.riskScore) === Number(score)
    );

    if (alreadySaved) return;

    saveFailureRiskResult?.({
      checkInDate,
      riskScore: score,
      riskLevel: level.label,
      riskMessage: level.message,
      reasons,
      insights: behaviorInsights,
      metrics: {
        calories: healthData?.calories,
        protein: healthData?.protein,
        water: healthData?.water,
        sleep: healthData?.sleep,
        mood: healthData?.mood,
        stress: healthData?.stress,
        cravings: healthData?.cravings,
        wearable: healthData?.wearable
      }
    });
  }, [hasData, score, checkInDate, history.length]);

  async function handleDeleteRisk(riskId) {
    if (!window.confirm("Delete this saved failure risk result?")) return;

    const result = await deleteFailureRiskResult(riskId);
    if (!result.ok) {
      alert(result.message || "Failed to delete failure risk result");
    }
  }

  return (
    <div className="page-stack">
      <SectionHeader
        eyebrow="Prediction engine"
        title="Diet Failure Prediction System"
        description="A full risk engine that reads calories, protein, water, sleep, mood, stress, cravings, and mobile data to calculate failure probability and explain the causes."
        action={
          <Button variant="outline" onClick={() => setShowHistory(true)}>
            <History size={16} />
            View History ({history.length})
          </Button>
        }
      />

      <FailureSystemFlow />

      {!hasData ? (
        <article className="panel">
          <p className="eyebrow">No entered check-in</p>
          <h2>No failure risk calculated yet</h2>
          <p>
            The failure prediction system now uses only your saved daily
            check-in. Save calories, protein, water, sleep, mood, stress, and cravings
            before this page calculates risk.
          </p>

          <Button onClick={() => setActiveRoute?.("checkin")}>
            Add Daily Check-In
          </Button>
        </article>
      ) : (
        <>
          <FailureRiskCard score={score} level={level} />

          <BmrPlanCard healthData={healthData} />

          <SignalMonitor healthData={healthData} />

          <AlertBanner reasons={reasons} />

          <section className="two-column">
            <RiskBreakdown insights={behaviorInsights} />
            <ScenarioSimulator baseScore={score} healthData={healthData} />
          </section>

          <InterventionPlan healthData={healthData} />
        </>
      )}

      {showHistory && (
        <div className="modal-backdrop" onClick={() => setShowHistory(false)}>
          <article className="panel modal-card animate-in" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header border-b pb-sm mb-md flex items-center justify-between">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div className="stat-icon">
                  <History size={20} />
                </div>
                <h2 style={{ margin: 0 }}>Failure Risk History</h2>
              </div>
              <Button variant="ghost" onClick={() => setShowHistory(false)} style={{ padding: "4px" }}>
                <X size={20} />
              </Button>
            </div>

            <div className="checkin-history-list">
              {history.length === 0 ? (
                <p className="text-muted italic py-lg text-center">No failure risk results saved yet.</p>
              ) : (
                <div className="history-items-stack">
                  {history.map((item) => (
                    <div key={item.id} className="history-item-row">
                      <div className="history-item-info">
                        <div className="history-item-date-row">
                          <CalendarDays size={15} />
                          <span>{item.checkInDate}</span>
                        </div>
                        <div className="macro-summary-line">
                          <span>Risk: <strong>{item.riskScore}%</strong></span>
                          <span>-</span>
                          <span><strong>{item.riskLevel}</strong></span>
                        </div>
                        <p className="history-note-text">{item.riskMessage}</p>
                        {item.reasons?.length > 0 && (
                          <div className="metrics-summary-line">
                            <span>{item.reasons.slice(0, 2).join(" ")}</span>
                          </div>
                        )}
                      </div>
                      <button
                        className="btn-delete-checkin"
                        title="Delete result"
                        type="button"
                        onClick={() => handleDeleteRisk(item.id)}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </article>
        </div>
      )}
    </div>
  );
}
