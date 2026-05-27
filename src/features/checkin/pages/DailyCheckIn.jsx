import { useState } from "react";
import { Calendar, History, Trash2, Utensils, X } from "lucide-react";
import SectionHeader from "../../../components/shared/SectionHeader";
import Button from "../../../components/ui/Button";
import DailyCheckInForm from "../components/DailyCheckInForm";
import { useAuth } from "../../../hooks/useAuth";

export default function DailyCheckIn({ setActiveRoute }) {
  const { account, deleteDailyCheckIn } = useAuth();
  const [showHistory, setShowHistory] = useState(false);

  const historyLogs = (account?.dailyHistory || [])
    .filter((item) => item.checkIn)
    .map((item) => ({
      date: item.date,
      ...item.checkIn
    }));
  const hasLatestInHistory =
    account?.dailyCheckIn?.checkInDate &&
    historyLogs.some((log) => log.date === account.dailyCheckIn.checkInDate);
  const checkInLogs =
    account?.dailyCheckIn && !hasLatestInHistory
      ? [
          {
            date: account.dailyCheckIn.checkInDate,
            ...account.dailyCheckIn
          },
          ...historyLogs
        ]
      : historyLogs;

  return (
    <div className="page-stack">
      <SectionHeader
        eyebrow="Daily behavior input"
        title="Daily Check-In"
        description="Enter today's nutrition, recovery, and behavior signals. These values power the dashboard, predictions, analytics, and failure-risk system."
        action={
          <Button variant="outline" onClick={() => setShowHistory(true)}>
            <History size={16} className="mr-xs" /> View History ({checkInLogs.length})
          </Button>
        }
      />

      <DailyCheckInForm setActiveRoute={setActiveRoute} />
      
      <article className="panel settings-save-panel">
        <div>
          <p className="eyebrow">Meal details</p>
          <h2>Track meals and macros separately</h2>
          <p>
            Use the meal log page to save each meal by day and calculate daily
            calories, protein, carbs, and fats.
          </p>
        </div>

        <Button onClick={() => setActiveRoute?.("meals")}>
          <Utensils size={18} />
          Open Meal Log
        </Button>
      </article>

      {showHistory && (
        <div className="modal-backdrop" onClick={() => setShowHistory(false)}>
          <article className="panel modal-card animate-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header border-b pb-sm mb-md flex items-center justify-between">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className="stat-icon"><History size={20} /></div>
                <h2 style={{ margin: 0 }}>Check-In History</h2>
              </div>
              <Button variant="ghost" onClick={() => setShowHistory(false)} style={{ padding: '4px' }}>
                <X size={20} />
              </Button>
            </div>

            <div className="checkin-history-list">
              {checkInLogs.length === 0 ? (
                <p className="text-muted italic py-lg text-center">No check-in logs found.</p>
              ) : (
                <div className="history-items-stack">
                  {checkInLogs.map((log) => (
                    <div key={log.date} className="history-item-row">
                      <div className="history-item-info">
                        <div className="history-item-date-row">
                          <Calendar size={15} />
                          <span>{log.date}</span>
                        </div>
                        <div className="macro-summary-line">
                          <span>Calories: <strong>{log.calories || 0}</strong> kcal</span>
                          <span>•</span>
                          <span>Protein: <strong>{log.protein || 0}</strong>g</span>
                          <span>•</span>
                          <span>Water: <strong>{log.water || 0}</strong>L</span>
                          <span>•</span>
                          <span>Sleep: <strong>{log.sleep || 0}</strong> hrs</span>
                        </div>
                        <div className="metrics-summary-line">
                          <span>Mood: <strong>{log.mood || 0}</strong>/10</span>
                          <span>•</span>
                          <span>Stress: <strong>{log.stress || 0}</strong>/10</span>
                          <span>•</span>
                          <span>Cravings: <strong>{log.cravings || 0}</strong>/10</span>
                        </div>
                        {log.notes && (
                          <p className="history-note-text">
                            "{log.notes}"
                          </p>
                        )}
                      </div>
                      <button 
                        className="btn-delete-checkin" 
                        title="Delete log"
                        onClick={async () => {
                          if (window.confirm(`Are you sure you want to delete the daily check-in for ${log.date}?`)) {
                            const res = await deleteDailyCheckIn(log.date);
                            if (!res.ok) {
                              alert(res.message || "Failed to delete check-in");
                            }
                          }
                        }}
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
