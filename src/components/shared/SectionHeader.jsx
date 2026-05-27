export default function SectionHeader({
  eyebrow,
  title,
  description,
  action
}) {
  return (
    <div className="section-header">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>

      {action && <div className="section-action">{action}</div>}
    </div>
  );
}