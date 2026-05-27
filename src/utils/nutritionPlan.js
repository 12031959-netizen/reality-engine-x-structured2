function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) && value !== "" && value !== null ? number : null;
}

function pickNumber(...values) {
  for (const value of values) {
    const number = numberOrNull(value);
    if (number !== null) return number;
  }

  return null;
}

const activityMultipliers = {
  Low: 1.25,
  Moderate: 1.45,
  High: 1.65,
  Athlete: 1.85
};

function normalizeGoal(goal, currentWeight, targetWeight) {
  const text = String(goal || "").trim().toLowerCase();

  if (
    text.includes("fat loss") ||
    text.includes("lose") ||
    text.includes("loss") ||
    text.includes("cut")
  ) {
    return "Fat loss";
  }

  if (
    text.includes("lean bulk") ||
    text.includes("bulk") ||
    text.includes("muscle") ||
    text.includes("gain")
  ) {
    return "Muscle gain";
  }

  if (text.includes("maintain")) {
    return "Maintenance";
  }

  if (text.includes("health")) {
    return "Health improvement";
  }

  if (currentWeight && targetWeight) {
    if (targetWeight < currentWeight) return "Fat loss";
    if (targetWeight > currentWeight) return "Muscle gain";
  }

  return "Maintenance";
}

function clamp(number, min, max) {
  return Math.min(max, Math.max(min, number));
}

function calculateGoalAdjustment(goal, maintenance, currentWeight, targetWeight) {
  const weightDelta = currentWeight && targetWeight ? targetWeight - currentWeight : 0;
  const changePercent = currentWeight ? Math.abs(weightDelta) / currentWeight : 0;

  if (goal === "Fat loss") {
    const deficit = Math.round(clamp(maintenance * (changePercent >= 0.1 ? 0.2 : 0.15), 300, 650));
    return -deficit;
  }

  if (goal === "Muscle gain") {
    const surplus = Math.round(clamp(maintenance * (changePercent >= 0.08 ? 0.12 : 0.08), 200, 350));
    return surplus;
  }

  if (goal === "Health improvement") {
    if (weightDelta < -1) return -250;
    if (weightDelta > 1) return 150;
  }

  return 0;
}

function calculateCalorieTarget(goal, bmr, maintenance, goalAdjustment, gender) {
  const rawTarget = Math.round(maintenance + goalAdjustment);
  const minimumCalories = gender === "female" ? 1200 : 1500;

  if (goal === "Fat loss") {
    const fatLossFloor = Math.max(minimumCalories, Math.round(bmr * 0.75));
    return Math.max(fatLossFloor, Math.min(maintenance - 1, rawTarget));
  }

  return Math.max(minimumCalories, rawTarget);
}

export function calculateNutritionPlan(account = {}) {
  const profile = account.dietProfile || {};
  const existingTarget = pickNumber(
    account.dailyCaloriesTarget,
    profile.dailyCaloriesTarget
  );
  const existingProteinTarget = pickNumber(account.proteinTarget, profile.proteinTarget);
  const weight = pickNumber(
    profile.currentWeightKg,
    account.currentWeight,
    account.weightKg
  );
  const targetWeight = pickNumber(
    profile.targetWeightKg,
    account.targetWeight,
    account.targetWeightKg
  );
  const height = pickNumber(profile.heightCm, account.height, account.heightCm);
  const age = pickNumber(profile.age, account.age);
  const gender = String(profile.gender || account.gender || "Male").toLowerCase();
  const activityLevel = profile.activityLevel || account.activityLevel || "Moderate";
  const goal = normalizeGoal(
    profile.goal || account.healthGoal || account.goal,
    weight,
    targetWeight
  );

  if (!weight || !height || !age) {
    return {
      ready: false,
      bmr: 0,
      maintenanceCalories: 0,
      maintenance: 0,
      calorieTarget: existingTarget || 0,
      proteinTarget: existingProteinTarget || 0,
      proteinMultiplier: 0,
      activityMultiplier: 0,
      goal,
      targetWeight,
      message:
        "Complete diet setup first so I can calculate BMR, calories, and protein."
    };
  }

  const bmr =
    gender === "female"
      ? 10 * weight + 6.25 * height - 5 * age - 161
      : 10 * weight + 6.25 * height - 5 * age + 5;
  const activityMultiplier =
    activityMultipliers[activityLevel] || activityMultipliers.Moderate;
  const maintenance = Math.round(bmr * activityMultiplier);
  const goalAdjustment = calculateGoalAdjustment(goal, maintenance, weight, targetWeight);
  const calculatedCalorieTarget = calculateCalorieTarget(
    goal,
    bmr,
    maintenance,
    goalAdjustment,
    gender
  );
  const proteinMultiplier =
    goal === "Fat loss" ? 2 : goal === "Muscle gain" ? 1.8 : 1.6;
  const calculatedProteinTarget = Math.round(weight * proteinMultiplier);

  return {
    ready: true,
    goal,
    bmr: Math.round(bmr),
    maintenanceCalories: maintenance,
    maintenance,
    calorieTarget: calculatedCalorieTarget,
    customCalorieTarget: existingTarget || 0,
    proteinTarget: existingProteinTarget || calculatedProteinTarget,
    proteinMultiplier,
    activityMultiplier,
    targetWeight,
    goalAdjustment,
    deficitCalories: goalAdjustment < 0 ? Math.abs(goalAdjustment) : 0,
    surplusCalories: goalAdjustment > 0 ? goalAdjustment : 0
  };
}
