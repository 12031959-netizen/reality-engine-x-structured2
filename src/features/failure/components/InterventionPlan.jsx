import { CheckCircle2 } from "lucide-react";

function buildActions(healthData) {
  const actions = [];
  const calories = healthData.calories.consumed;
  const calorieTarget = healthData.calories.target;
  const protein = healthData.protein.consumed;
  const proteinTarget = healthData.protein.target;
  const water = healthData.water?.consumed || 0;
  const waterTarget = healthData.water?.target || 3;

  if (!calories) {
    actions.push("Enter calories today so the diet plan can be judged correctly.");
  }

  if (!protein) {
    actions.push("Enter protein today so the system can check muscle and hunger support.");
  }

  if (!water) {
    actions.push("Enter water today so the system can judge hydration pressure.");
  }

  if (calories && calorieTarget) {
    const calorieGap = calories - calorieTarget;

    if (Math.abs(calorieGap) > calorieTarget * 0.2) {
      actions.push(
        calorieGap > 0
          ? "Reduce the next meal size or snacks to bring calories closer to target."
          : "Add a planned meal or snack so calories are not too low for the plan."
      );
    }
  }

  if (protein && proteinTarget && protein < proteinTarget) {
    actions.push("Add a protein source to move closer to the daily protein target.");
  }

  if (water && waterTarget && water < waterTarget * 0.9) {
    actions.push("Bring water closer to the hydration target to reduce hunger and craving pressure.");
  }

  if (healthData.sleep.lastNight < 6) {
    actions.push("Move bedtime earlier tonight and avoid late caffeine.");
  }

  if (healthData.stress.score >= 7) {
    actions.push("Use a short stress reset before the highest-risk meal.");
  }

  if (healthData.cravings.score >= 7) {
    actions.push("Prepare a controlled high-protein snack before cravings push calories off plan.");
  }

  return actions.length
    ? actions
    : ["Keep the current routine and check nutrition plus behavior signals again tomorrow."];
}

export default function InterventionPlan({ healthData }) {
  const actions = buildActions(healthData);

  return (
    <article className="panel intervention-plan">
      <p className="eyebrow">System output</p>
      <h2>Next 24-hour action plan</h2>
      <p>
        These actions are generated from nutrition and behavior drivers detected
        by the failure prediction system.
      </p>

      <div className="action-list">
        {actions.map((action) => (
          <div className="action-row" key={action}>
            <CheckCircle2 size={19} />
            <span>{action}</span>
          </div>
        ))}
      </div>
    </article>
  );
}
