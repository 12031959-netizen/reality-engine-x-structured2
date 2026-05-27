import SectionHeader from "../../../components/shared/SectionHeader";
import RecommendationPanel from "../components/RecommendationPanel";
import { useRecommendations } from "../hooks/useRecommendations";

export default function Recommendations() {
  const { recommendations } = useRecommendations();

  return (
    <div className="page-stack">
      <SectionHeader
        eyebrow="Adaptive coaching"
        title="Recommendations"
        description="Personalized actions based on calories, recovery, stress, cravings, and adherence."
      />

      <section className="card-list">
        {recommendations.map((recommendation) => (
          <RecommendationPanel
            key={recommendation.id || `${recommendation.title}-${recommendation.date}`}
            recommendation={recommendation}
          />
        ))}
      </section>
    </div>
  );
}
