function calculateCalorieRisk(goal, calories, target) {
  if (!calories || !target) return 22;

  const ratio = calories / target;
  const overRatio = Math.max(0, ratio - 1);
  const underRatio = Math.max(0, 1 - ratio);
  const absoluteGap = Math.abs(ratio - 1);

  if (goal === "Fat loss") {
    if (overRatio > 0) {
      return overRatio >= 0.35 ? 42 : overRatio >= 0.2 ? 32 : overRatio >= 0.1 ? 18 : 8;
    }

    return underRatio >= 0.35 ? 20 : underRatio >= 0.25 ? 14 : underRatio >= 0.15 ? 8 : 2;
  }

  if (goal === "Muscle gain" || goal === "Lean bulk") {
    if (underRatio > 0) {
      return underRatio >= 0.25 ? 34 : underRatio >= 0.15 ? 24 : underRatio >= 0.08 ? 14 : 3;
    }

    return overRatio >= 0.3 ? 20 : overRatio >= 0.2 ? 13 : overRatio >= 0.1 ? 7 : 3;
  }

  return absoluteGap >= 0.3 ? 24 : absoluteGap >= 0.2 ? 16 : absoluteGap >= 0.1 ? 8 : 2;
}

export function calculateRiskScore(healthData) {
  if (!healthData) return null;

  const sleep = healthData.sleep.lastNight;
  const mood = healthData.mood.score;
  const stress = healthData.stress.score;
  const cravings = healthData.cravings.score;
  const calories = healthData.calories.consumed;
  const calorieTarget = healthData.calories.target;
  const calorieGoal = healthData.calories.goal;
  const protein = healthData.protein.consumed;
  const proteinTarget = healthData.protein.target;
  const water = healthData.water?.consumed || 0;
  const waterTarget = healthData.water?.target || 3;

  const proteinGap =
    protein && proteinTarget
      ? Math.max(0, proteinTarget - protein) / proteinTarget
      : 1;
  const waterGap =
    water && waterTarget
      ? Math.max(0, waterTarget - water) / waterTarget
      : 1;

  const calorieRisk = calculateCalorieRisk(calorieGoal, calories, calorieTarget);
  const proteinRisk =
    proteinGap >= 0.5 ? 16 : proteinGap >= 0.25 ? 10 : proteinGap > 0 ? 6 : 2;
  const waterRisk =
    !water ? 10 : waterGap >= 0.5 ? 14 : waterGap >= 0.25 ? 9 : waterGap > 0.1 ? 5 : 2;
  const missingNutritionRisk = calories > 0 && protein > 0 ? 0 : 14;
  const sleepRisk = sleep < 5 ? 20 : sleep < 6 ? 15 : sleep < 7 ? 8 : 3;
  const stressRisk = stress >= 8 ? 18 : stress >= 7 ? 14 : stress >= 5 ? 8 : 3;
  const cravingRisk =
    cravings >= 8 ? 18 : cravings >= 7 ? 14 : cravings >= 5 ? 8 : 3;
  const moodRisk = mood <= 3 ? 12 : mood <= 5 ? 8 : 3;
  const wearableRisk = healthData.wearable
    ? (healthData.wearable.steps > 0 && healthData.wearable.steps < 3000 ? 8 : 0) +
      (healthData.wearable.activeMinutes > 0 &&
      healthData.wearable.activeMinutes < 15
        ? 6
        : 0) +
      (healthData.wearable.recoveryScore > 0 &&
      healthData.wearable.recoveryScore < 45
        ? 8
        : 0) +
      (healthData.wearable.heartRate > 90 ? 6 : 0)
    : 0;

  const risk =
    calorieRisk +
    proteinRisk +
    waterRisk +
    missingNutritionRisk +
    sleepRisk +
    stressRisk +
    cravingRisk +
    moodRisk +
    wearableRisk;

  return Math.min(100, Math.round(risk));
}

export function getRiskLevel(score) {
  if (score === null || score === undefined) {
    return {
      label: "No Risk Data",
      className: "risk-low",
      message: "Save a daily check-in before the system calculates risk."
    };
  }

  if (score >= 75) {
    return {
      label: "High Risk",
      className: "risk-high",
      message:
        "Nutrition and lifestyle signals show strong pressure against the diet plan."
    };
  }

  if (score >= 45) {
    return {
      label: "Medium Risk",
      className: "risk-medium",
      message:
        "There are warning signs, but the plan is still recoverable."
    };
  }

  return {
    label: "Low Risk",
    className: "risk-low",
    message: "Your current nutrition and lifestyle pattern supports your diet goal."
  };
}
