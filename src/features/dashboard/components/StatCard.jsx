export default function StatCard({ title, value, subtitle, icon: Icon, trend }) {
  return (
    <article className="stat-card">
      <div className="stat-top">
        <div>
          <p>{title}</p>
          <h3>{value}</h3>
        </div>

        {Icon && (
          <div className="stat-icon">
            <Icon size={20} />
          </div>
        )}
      </div>

      <div className="stat-bottom">
        <span>{subtitle}</span>
        {trend && <strong>{trend}</strong>}
      </div>
    </article>
  );
}