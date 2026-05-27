import { AlertTriangle } from "lucide-react";

export default function AlertBanner({ reasons }) {
  return (
    <article className="alert-banner">
      <div className="alert-icon">
        <AlertTriangle size={22} />
      </div>

      <div>
        <h3>Primary failure drivers</h3>
        <ul>
          {reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      </div>
    </article>
  );
}