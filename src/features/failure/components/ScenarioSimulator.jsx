import { useMemo } from "react";

const THRESHOLDS = {
  proteinMinRatio: 0.85,
  waterMinRatio: 0.75,
  stressMax: 5,
  keepRiskMax: 50,
  sleepMin: 6,
  cravingsMax: 6
};

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function hasValue(value) {
  return value !== undefined && value !== null && value !== "" && Number(value) > 0;
}

function valueOrMissing(value, suffix = "") {
  return hasValue(value) ? `${value}${suffix}` : "Not available";
}

function percentDifference(value, target) {
  if (!hasValue(value) || !hasValue(target)) return null;
  return Math.round(((value - target) / target) * 100);
}

function buildMetricRow(label, value, recommendation) {
  return [label, value, recommendation];
}

function getCalorieBounds(goal) {
  if (goal === "Fat loss") {
    return { min: 0.85, max: 1.1 };
  }

  if (goal === "Muscle gain" || goal === "Lean bulk") {
    return { min: 0.95, max: 1.15 };
  }

  return { min: 0.9, max: 1.1 };
}

function describeFailedCalorieCheck(goal, ratio, gap, bounds) {
  if (ratio === null) {
    return "Calories or BMR calorie target is missing, so the system cannot safely keep the current test.";
  }

  if (ratio < bounds.min) {
    if (goal === "Fat loss") {
      return `Calories are ${Math.abs(gap)}% below target. Faster loss can happen, but fatigue and cravings can rise -> increase intake closer to target before continuing current test.`;
    }

    if (goal === "Muscle gain" || goal === "Lean bulk") {
      return `Calories are ${Math.abs(gap)}% below bulk target, so the surplus is not strong enough -> increase intake toward the target.`;
    }

    return `Calories are ${Math.abs(gap)}% below target, which can reduce energy and adherence -> increase intake before continuing current test.`;
  }

  if (goal === "Muscle gain" || goal === "Lean bulk") {
    return `Calories are ${gap}% above bulk target. The target already includes surplus -> reduce toward target to limit unnecessary fat gain.`;
  }

  return `Calories are ${gap}% above target for ${goal === "Fat loss" ? "fat loss" : "this plan"} -> reduce intake toward the target.`;
}

function calculateConfidence({
  checks,
  failedChecks,
  baseScore,
  sleep,
  cravings,
  steps,
  activeMinutes,
  recoveryScore
}) {
  const completeSignals = [
    checks[0].complete,
    checks[1].complete,
    checks[2].complete,
    checks[3].complete,
    checks[4].complete,
    hasValue(sleep),
    hasValue(cravings),
    hasValue(steps) || hasValue(activeMinutes) || hasValue(recoveryScore)
  ].filter(Boolean).length;
  const completenessScore = (completeSignals / 8) * 70;
  const requiredPassScore =
    ((checks.length - failedChecks.length) / checks.length) * 20;
  const riskScore = Number.isFinite(baseScore)
    ? Math.max(0, (100 - baseScore) / 100) * 10
    : 0;
  const failedPenalty = failedChecks.length * 6;

  return clampScore(completenessScore + requiredPassScore + riskScore - failedPenalty);
}

function buildNextDayTest(baseScore, healthData) {
  const calories = healthData?.calories.consumed || 0;
  const calorieTarget = healthData?.calories.target || 0;
  const calorieGoal = healthData?.calories.goal || "";
  const protein = healthData?.protein.consumed || 0;
  const proteinTarget = healthData?.protein.target || 0;
  const water = healthData?.water?.consumed || 0;
  const waterTarget = healthData?.water?.target || 3;
  const sleep = healthData?.sleep.lastNight || 0;
  const stress = healthData?.stress.score || 0;
  const cravings = healthData?.cravings.score || 0;
  const steps = healthData?.wearable?.steps || 0;
  const activeMinutes = healthData?.wearable?.activeMinutes || 0;
  const recoveryScore = healthData?.wearable?.recoveryScore || 0;

  const calorieRatio = hasValue(calories) && hasValue(calorieTarget)
    ? calories / calorieTarget
    : null;
  const proteinRatio = hasValue(protein) && hasValue(proteinTarget)
    ? protein / proteinTarget
    : null;
  const waterRatio = hasValue(water) && hasValue(waterTarget)
    ? water / waterTarget
    : null;
  const calorieGap = percentDifference(calories, calorieTarget);
  const calorieBounds = getCalorieBounds(calorieGoal);
  const proteinGap =
    proteinRatio === null ? null : Math.max(0, Math.round((1 - proteinRatio) * 100));
  const waterGap =
    waterRatio === null ? null : Math.max(0, Math.round((1 - waterRatio) * 100));

  const checks = [
    {
      key: "calories",
      complete: calorieRatio !== null,
      passed:
        calorieRatio !== null &&
        calorieRatio >= calorieBounds.min &&
        calorieRatio <= calorieBounds.max,
      failedRecommendation: describeFailedCalorieCheck(
        calorieGoal,
        calorieRatio,
        calorieGap,
        calorieBounds
      )
    },
    {
      key: "protein",
      complete: proteinRatio !== null,
      passed: proteinRatio !== null && proteinRatio >= THRESHOLDS.proteinMinRatio,
      failedRecommendation:
        proteinRatio === null
          ? "Protein or protein target is missing, so the system cannot safely keep the current test."
          : `Protein intake is ${proteinGap}% below target, which increases diet failure risk -> adjust protein before continuing current test.`
    },
    {
      key: "water",
      complete: waterRatio !== null,
      passed: waterRatio !== null && waterRatio >= THRESHOLDS.waterMinRatio,
      failedRecommendation:
        waterRatio === null
          ? "Water is missing, so hydration pressure cannot be checked in the next-day test."
          : `Water intake is ${waterGap}% below target, which can increase hunger and cravings -> raise hydration before keeping the same test.`
    },
    {
      key: "stress",
      complete: hasValue(stress),
      passed: hasValue(stress) && stress <= THRESHOLDS.stressMax,
      failedRecommendation:
        hasValue(stress)
          ? `Stress is ${stress}/10, above the safe limit of ${THRESHOLDS.stressMax}/10 -> add recovery or stress management before keeping the same test.`
          : "Stress is missing, so the system cannot confirm that the current test is safe."
    },
    {
      key: "risk",
      complete: Number.isFinite(baseScore),
      passed: Number.isFinite(baseScore) && baseScore < THRESHOLDS.keepRiskMax,
      failedRecommendation:
        `Failure risk is ${baseScore}%, not below ${THRESHOLDS.keepRiskMax}% -> the system should adjust tomorrow's test instead of keeping it unchanged.`
    }
  ];

  const secondaryRecommendations = [];

  if (hasValue(sleep) && sleep < THRESHOLDS.sleepMin) {
    secondaryRecommendations.push(
      `Sleep is ${sleep}h, below ${THRESHOLDS.sleepMin}h -> improve recovery target for tomorrow.`
    );
  }

  if (hasValue(cravings) && cravings > THRESHOLDS.cravingsMax) {
    secondaryRecommendations.push(
      `Cravings are ${cravings}/10, above ${THRESHOLDS.cravingsMax}/10 -> plan a controlled high-protein meal or snack.`
    );
  }

  const failedChecks = checks.filter((check) => !check.passed);
  const keepCurrentTest = failedChecks.length === 0;
  const confidence = calculateConfidence({
    checks,
    failedChecks,
    baseScore,
    sleep,
    cravings,
    steps,
    activeMinutes,
    recoveryScore
  });
  const recommendations = [
    ...failedChecks.map((check) => check.failedRecommendation),
    ...secondaryRecommendations
  ];

  if (keepCurrentTest) {
    return {
      mode: "Keep current test",
      message:
        "All required checks passed: calories are close enough to target, protein is high enough, stress is controlled, and risk is below 50%.",
      score: baseScore,
      confidence,
      recommendations: [
        "No required metric failed. Continue the current test and monitor tomorrow's check-in."
      ],
      rows: [
        buildMetricRow("Calories", valueOrMissing(calories), "Within acceptable range"),
        buildMetricRow("Protein", valueOrMissing(protein, "g"), "Within acceptable range"),
        buildMetricRow("Water", valueOrMissing(water, "L"), "Within acceptable range"),
        buildMetricRow("Stress", valueOrMissing(stress, "/10"), "Within acceptable range"),
        buildMetricRow("Risk", `${baseScore}%`, "Below decision threshold"),
        buildMetricRow("Sleep", valueOrMissing(sleep, "h"), "Support metric"),
        buildMetricRow("Cravings", valueOrMissing(cravings, "/10"), "Support metric")
      ]
    };
  }

  const nextCalories = calorieTarget || calories;
  const nextProtein = proteinTarget || protein;
  const nextWater = waterTarget || water;
  const nextStress = hasValue(stress) ? Math.min(stress, 4) : 4;
  const nextSleep = hasValue(sleep) ? Math.max(sleep, 7) : 7;
  const nextCravings = hasValue(cravings) ? Math.min(cravings, 4) : 4;
  const nextSteps = hasValue(steps) ? Math.max(steps, 8000) : 8000;

  let adjustedScore = baseScore;
  if (failedChecks.some((check) => check.key === "calories")) adjustedScore -= 18;
  if (failedChecks.some((check) => check.key === "protein")) adjustedScore -= 14;
  if (failedChecks.some((check) => check.key === "water")) adjustedScore -= 6;
  if (failedChecks.some((check) => check.key === "stress")) adjustedScore -= 8;
  if (hasValue(sleep) && sleep < THRESHOLDS.sleepMin) adjustedScore -= 7;
  if (hasValue(cravings) && cravings > THRESHOLDS.cravingsMax) adjustedScore -= 8;

  return {
    mode: baseScore >= 70 ? "Best next-day test" : "Adjusted next-day test",
    message:
      "The current test is not safe to keep unchanged because one or more required metrics failed. The system is giving specific adjustments instead.",
    score: clampScore(adjustedScore),
    confidence,
    recommendations,
    rows: [
      buildMetricRow("Calories", valueOrMissing(nextCalories), "Move toward BMR goal calories"),
      buildMetricRow("Protein", valueOrMissing(nextProtein, "g"), "Reach at least 85% of protein target"),
      buildMetricRow("Water", valueOrMissing(nextWater, "L"), "Reach at least 75% of hydration target"),
      buildMetricRow("Stress", valueOrMissing(nextStress, "/10"), "Reduce to 5/10 or lower"),
      buildMetricRow("Risk", `${baseScore}% -> ${clampScore(adjustedScore)}%`, "Lower predicted failure pressure"),
      buildMetricRow("Sleep", valueOrMissing(nextSleep, "h"), "Improve recovery if possible"),
      buildMetricRow("Cravings", valueOrMissing(nextCravings, "/10"), "Reduce overeating pressure"),
      buildMetricRow("Steps", valueOrMissing(nextSteps), "Use mobile data as support, not a required gate")
    ]
  };
}

export default function ScenarioSimulator({ baseScore, healthData }) {
  const nextDayTest = useMemo(
    () => buildNextDayTest(baseScore, healthData),
    [baseScore, healthData]
  );

  return (
    <article className="panel simulator-card">
      <p className="eyebrow">System next-day test</p>
      <h2>{nextDayTest.mode}</h2>
      <p>{nextDayTest.message}</p>

      <div className="system-confidence">
        <span>Decision confidence</span>
        <strong>{nextDayTest.confidence}%</strong>
      </div>

      <div className="system-recommendations">
        {nextDayTest.recommendations.map((recommendation) => (
          <div className="action-row" key={recommendation}>
            <span>{recommendation}</span>
          </div>
        ))}
      </div>

      <div className="system-test-grid">
        {nextDayTest.rows.map(([label, value, reason]) => (
          <div className="system-test-row" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{reason}</small>
          </div>
        ))}
      </div>

      <div className="simulated-result">
        <span>System test risk</span>
        <strong>{nextDayTest.score}%</strong>
      </div>
    </article>
  );
}
