function getCalorieImpact(goal, calorieGap) {
  if (calorieGap === null) return "High";

  if (goal === "Fat loss" && calorieGap < 0) {
    return Math.abs(calorieGap) <= 15 ? "Strong" : Math.abs(calorieGap) <= 25 ? "Medium" : "High";
  }

  if ((goal === "Muscle gain" || goal === "Lean bulk") && calorieGap < 0) {
    return Math.abs(calorieGap) <= 8 ? "Strong" : Math.abs(calorieGap) <= 15 ? "Medium" : "High";
  }

  return Math.abs(calorieGap) <= 10 ? "Strong" : Math.abs(calorieGap) <= 20 ? "Medium" : "High";
}

function describeCalorieGap(goal, calorieGap) {
  if (calorieGap === null) {
    return "Calories were entered, but a target could not be calculated because profile data is incomplete.";
  }

  if (goal === "Fat loss") {
    if (calorieGap === 0) {
      return "Calories are exactly on the fat-loss target.";
    }

    if (calorieGap > 0) {
      return `Fat loss needs a calorie deficit, but your calories are ${calorieGap}% above the target.`;
    }

    if (calorieGap < -25) {
      return `Calories are ${Math.abs(calorieGap)}% below the fat-loss target. This may speed scale loss short term, but it raises fatigue, hunger, and rebound risk.`;
    }

    return `Calories are ${Math.abs(calorieGap)}% below the fat-loss target, which can be acceptable if energy, sleep, protein, and cravings stay controlled.`;
  }

  if (goal === "Muscle gain" || goal === "Lean bulk") {
    if (calorieGap < 0) {
      return `Muscle gain needs a surplus, but calories are ${Math.abs(calorieGap)}% below the bulk target.`;
    }

    if (calorieGap > 15) {
      return `Calories are ${calorieGap}% above the bulk target. The target already includes a surplus, so extra calories may add fat faster than muscle.`;
    }
  }

  return `Your calories are ${Math.abs(calorieGap)}% ${calorieGap >= 0 ? "above" : "below"} the target estimated from your diet profile.`;
}

export function analyzeBehavior(healthData) {
  const insights = [];
  const calories = healthData.calories.consumed;
  const calorieTarget = healthData.calories.target;
  const calorieGoal = healthData.calories.goal;
  const protein = healthData.protein.consumed;
  const proteinTarget = healthData.protein.target;
  const water = healthData.water?.consumed || 0;
  const waterTarget = healthData.water?.target || 3;

  if (calories > 0) {
    const calorieGap = calorieTarget
      ? Math.round(((calories - calorieTarget) / calorieTarget) * 100)
      : null;

    insights.push({
      label: "Calories vs diet target",
      value: calorieTarget ? `${calories} / ${calorieTarget}` : `${calories}`,
      impact: getCalorieImpact(calorieGoal, calorieGap),
      description: describeCalorieGap(calorieGoal, calorieGap)
    });
  }

  if (protein > 0) {
    const proteinGap = proteinTarget
      ? Math.max(0, Math.round(((proteinTarget - protein) / proteinTarget) * 100))
      : null;

    insights.push({
      label: "Protein vs diet target",
      value: proteinTarget ? `${protein}g / ${proteinTarget}g` : `${protein}g`,
      impact:
        proteinGap === null || proteinGap === 0
          ? "Strong"
          : proteinGap <= 25
            ? "Medium"
            : "High",
      description:
        proteinTarget
          ? proteinGap === 0
            ? "Your protein meets the estimated target for diet success."
            : `Protein is about ${proteinGap}% under the estimated target.`
          : "Protein was entered, but a target could not be calculated because profile data is incomplete."
    });
  }

  if (water > 0) {
    const waterGap = waterTarget
      ? Math.max(0, Math.round(((waterTarget - water) / waterTarget) * 100))
      : null;

    insights.push({
      label: "Water vs hydration target",
      value: waterTarget ? `${water}L / ${waterTarget}L` : `${water}L`,
      impact:
        waterGap === null || waterGap <= 10
          ? "Strong"
          : waterGap <= 25
            ? "Medium"
            : "High",
      description:
        waterGap === null || waterGap <= 10
          ? "Water intake supports recovery, hunger control, and diet consistency."
          : `Water is about ${waterGap}% under the estimated hydration target, which can increase hunger, fatigue, and cravings.`
    });
  }

  if (!calories || !protein || !water) {
    insights.push({
      label: "Nutrition data missing",
      value: "Incomplete",
      impact: "High",
      description:
        "Calories, protein, and water are required before the diet success risk can be calculated clearly."
    });
  }

  if (healthData.sleep.lastNight < 6) {
    insights.push({
      label: "Low sleep detected",
      value: `${healthData.sleep.lastNight}h`,
      impact: "High",
      description:
        "Low sleep increases cravings, hunger, stress response, and poor food decisions."
    });
  }

  if (healthData.stress.score >= 7) {
    insights.push({
      label: "Stress pressure",
      value: `${healthData.stress.score}/10`,
      impact: "High",
      description:
        "High stress can reduce diet consistency and increase emotional eating."
    });
  }

  if (healthData.cravings.score >= 7) {
    insights.push({
      label: "Strong cravings",
      value: `${healthData.cravings.score}/10`,
      impact: "Medium",
      description:
        "Cravings are elevated. A planned snack can prevent uncontrolled eating."
    });
  }

  if (healthData.mood.score <= 5) {
    insights.push({
      label: "Mood pressure",
      value: `${healthData.mood.score}/10`,
      impact: "Medium",
      description:
        "Lower mood can make it harder to follow planned meals and resist cravings."
    });
  }

  if (healthData.wearable?.steps > 0) {
    insights.push({
      label: "Uploaded steps",
      value: `${healthData.wearable.steps}`,
      impact: healthData.wearable.steps < 3000 ? "Medium" : "Input",
      description:
        "This value came from your uploaded mobile health data."
    });
  }

  if (healthData.wearable?.heartRate > 0) {
    insights.push({
      label: "Uploaded heart rate",
      value: `${healthData.wearable.heartRate} bpm`,
      impact: healthData.wearable.heartRate > 90 ? "Medium" : "Input",
      description:
        "This heart-rate value is used as recovery context for the risk calculation."
    });
  }

  if (healthData.wearable?.recoveryScore > 0) {
    insights.push({
      label: "Uploaded recovery",
      value: `${healthData.wearable.recoveryScore}%`,
      impact: healthData.wearable.recoveryScore < 45 ? "Medium" : "Input",
      description:
        "This recovery score came from the mobile data saved in your account."
    });
  }

  if (insights.length === 0) {
    insights.push({
      label: "No major driver",
      value: "OK",
      impact: "Low",
      description:
        "The values you entered do not show a strong failure pressure right now."
    });
  }

  return insights;
}
