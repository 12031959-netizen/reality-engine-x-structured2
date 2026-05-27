export default function WearableCard({ label, value, description }) {
  return (
    <article className="panel wearable-card">
      <p>{label}</p>
      <h2>{value}</h2>
      <span>{description}</span>
    </article>
  );
}