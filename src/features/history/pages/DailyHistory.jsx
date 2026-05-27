import { CalendarDays, ClipboardCheck, Watch } from "lucide-react";
import SectionHeader from "../../../components/shared/SectionHeader";
import { useAuth } from "../../../hooks/useAuth";

function formatValue(value, suffix = "") {
  if (value === null || value === undefined || value === "" || value === 0 || value === "0") return null;
  return `${value}${suffix}`;
}

function HistoryRow({ label, value, suffix }) {
  const formatted = formatValue(value, suffix);
  if (!formatted) return null;
  return (
    <>
      <span>{label}</span>
      <strong>{formatted}</strong>
    </>
  );
}

function formatDate(dateString) {
  if (!dateString) return "No date";
  const date = dateString.includes('T') ? new Date(dateString) : new Date(`${dateString}T00:00:00`);
  if (isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

export default function DailyHistory() {
  const { account } = useAuth();
  const history = account?.dailyHistory || [];

  return (
    <div className="page-stack">
      <SectionHeader
        eyebrow="Saved records"
        title="Daily History"
        description="Review your historical health data. Only active entries with recorded values are shown."
      />

      {history.length === 0 ? (
        <article className="panel">
          <p className="eyebrow">No records yet</p>
          <h2>Nothing has been saved</h2>
          <p>
            Save a Daily Check-In or import Mobile Data to create your first
            daily record.
          </p>
        </article>
      ) : (
        <section className="history-list">
          {history.map((record) => (
            <article className="panel history-card" key={record.date}>
              <div className="history-card-header">
                <div className="stat-icon">
                  <CalendarDays size={21} />
                </div>
                <div>
                  <p className="eyebrow">{record.date.includes('T') ? record.date.split('T')[0] : record.date}</p>
                  <h2>{formatDate(record.date)}</h2>
                </div>
              </div>

              <div className="history-columns">
                <div className={`history-section ${!record.checkIn ? 'text-muted' : ''}`}>
                  <div className="history-section-title">
                    <ClipboardCheck size={18} />
                    <strong>Daily Check-In</strong>
                  </div>

                  {record.checkIn ? (
                    <>
                      <div className="history-grid">
                        <HistoryRow label="Calories" value={record.checkIn.calories} />
                        <HistoryRow label="Protein" value={record.checkIn.protein} suffix="g" />
                        <HistoryRow label="Sleep" value={record.checkIn.sleep} suffix="h" />
                        <HistoryRow label="Water" value={record.checkIn.water} suffix="L" />
                        <HistoryRow label="Mood" value={record.checkIn.mood} suffix="/10" />
                        <HistoryRow label="Stress" value={record.checkIn.stress} suffix="/10" />
                        <HistoryRow label="Cravings" value={record.checkIn.cravings} suffix="/10" />
                      </div>
                      {record.checkIn.notes && (
                        <p className="history-note">{record.checkIn.notes}</p>
                      )}
                    </>
                  ) : (
                    <p className="text-muted" style={{ fontSize: '13px', fontStyle: 'italic', marginTop: '12px' }}>No check-in recorded.</p>
                  )}
                </div>

                <div className={`history-section ${!record.wearableData ? 'text-muted' : ''}`}>
                  <div className="history-section-title">
                    <Watch size={18} />
                    <strong>Mobile Data</strong>
                  </div>

                  {record.wearableData ? (
                    <div className="history-grid">
                      <HistoryRow label="Device" value={record.wearableData.device} />
                      <HistoryRow label="Steps" value={record.wearableData.steps} />
                      <HistoryRow label="Heart Rate" value={record.wearableData.heartRate} suffix=" bpm" />
                      <HistoryRow label="Active Minutes" value={record.wearableData.activeMinutes} suffix=" min" />
                      <HistoryRow label="Recovery" value={record.wearableData.recoveryScore} suffix="%" />
                      <HistoryRow label="Source" value={record.wearableData.source} />
                    </div>
                  ) : (
                    <p className="text-muted" style={{ fontSize: '13px', fontStyle: 'italic', marginTop: '12px' }}>No mobile data.</p>
                  )}
                </div>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
