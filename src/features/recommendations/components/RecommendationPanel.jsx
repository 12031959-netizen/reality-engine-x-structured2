export default function RecommendationPanel({ recommendation }) {
  return (
    <article className="panel recommendation-card">
      <div className="recommendation-top">
        <span>{recommendation.category}</span>
        <strong>{recommendation.priority}</strong>
      </div>

      <h2>{recommendation.title}</h2>
      <p>{recommendation.description}</p>
    </article>
  );
}