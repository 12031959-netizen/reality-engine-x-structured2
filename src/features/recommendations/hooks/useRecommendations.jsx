import { useAuth } from "../../../hooks/useAuth";

export function useRecommendations() {
  const { account } = useAuth();
  const recommendations = (account?.recommendationHistory || []).map((item) => ({
    id: item.recommendationID,
    category: item.recommendationType || "Recommendation",
    priority: item.predictionID ? "AI generated" : "Saved",
    title: item.recommendationType || "Saved recommendation",
    description: item.recommendationText || "No recommendation text saved.",
    date: item.date
  }));

  return {
    recommendations
  };
}
