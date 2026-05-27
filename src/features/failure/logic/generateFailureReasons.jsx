export function generateFailureReasons(healthData) {
  const reasons = [];
  const calories = healthData.calories.consumed;
  const calorieTarget = healthData.calories.target;
  const calorieGoal = healthData.calories.goal;
  const protein = healthData.protein.consumed;
  const proteinTarget = healthData.protein.target;
  const water = healthData.water?.consumed || 0;
  const waterTarget = healthData.water?.target || 3;

  if (!calories) {
    reasons.push("Calories are missing, so diet success cannot be judged clearly.");
  }

  if (!protein) {
    reasons.push("Protein is missing, so the nutrition plan is incomplete.");
  }

  if (!water) {
    reasons.push("Water is missing, so hydration risk cannot be judged clearly.");
  }

  if (calories && calorieTarget) {
    const calorieDifference = calories - calorieTarget;
    const calorieGap = Math.abs(calorieDifference) / calorieTarget;

    if (calorieGoal === "Fat loss" && calorieDifference > 0) {
      reasons.push(
        `Fat loss needs a calorie deficit, but calories are ${Math.round(calorieGap * 100)}% above target.`
      );
    } else if (calorieGoal === "Fat loss" && calorieDifference < 0 && calorieGap > 0.25) {
      reasons.push("Calories are very low for the fat-loss target, which can increase fatigue, hunger, and rebound risk.");
    } else if ((calorieGoal === "Muscle gain" || calorieGoal === "Lean bulk") && calorieDifference < 0) {
      reasons.push("Muscle gain needs calories near the bulk target, but intake is below target.");
    } else if ((calorieGoal === "Muscle gain" || calorieGoal === "Lean bulk") && calorieDifference > 0 && calorieGap > 0.15) {
      reasons.push("Calories are above the bulk target; the target already includes a surplus.");
    } else if (calorieGap > 0.2) {
      reasons.push("Calories are far from the target estimated for this diet plan.");
    } else if (calorieGap > 0.1) {
      reasons.push("Calories are slightly outside the target range.");
    }
  }

  if (protein && proteinTarget && protein < proteinTarget * 0.75) {
    reasons.push("Protein is too low for the current diet target.");
  }

  if (water && waterTarget && water < waterTarget * 0.75) {
    reasons.push("Water intake is low enough to increase hunger, fatigue, and cravings.");
  } else if (water && waterTarget && water < waterTarget * 0.9) {
    reasons.push("Water intake is slightly under the hydration target.");
  }

  if (healthData.sleep.lastNight < 6) {
    reasons.push("Sleep is below the recovery target.");
  }

  if (healthData.mood.score <= 5) {
    reasons.push("Mood is low enough to affect consistency.");
  }

  if (healthData.cravings.score >= 7) {
    reasons.push("Cravings are currently elevated.");
  }

  if (healthData.stress.score >= 7) {
    reasons.push("Stress is high enough to affect discipline and hunger.");
  }

  if (healthData.wearable?.steps > 0 && healthData.wearable.steps < 3000) {
    reasons.push("Uploaded mobile data shows low movement today.");
  }

  if (
    healthData.wearable?.recoveryScore > 0 &&
    healthData.wearable.recoveryScore < 45
  ) {
    reasons.push("Uploaded mobile recovery is low.");
  }

  if (healthData.wearable?.heartRate > 90) {
    reasons.push("Uploaded heart-rate data is elevated.");
  }

  if (reasons.length === 0) {
    reasons.push("No major risk drivers detected from your latest check-in.");
  }

  return reasons;
}
