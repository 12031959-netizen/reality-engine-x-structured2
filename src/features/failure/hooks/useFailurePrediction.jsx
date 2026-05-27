import { useAuth } from "../../../hooks/useAuth";
import { getLocalDateKey } from "../../../utils/dateKeys";
import {
  calculateRiskScore,
  getRiskLevel
} from "../logic/calculateRiskScore";
import { analyzeBehavior } from "../logic/analyzeBehavior";
import { generateFailureReasons } from "../logic/generateFailureReasons";
import { calculateNutritionPlan } from "../../../utils/nutritionPlan";

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) && value !== "" && value !== null ? number : null;
}

function clamp(number, min, max) {
  return Math.min(max, Math.max(min, number));
}

function calculateWaterTarget(account) {
  const profile = account.dietProfile || {};
  const weight = numberOrNull(profile.currentWeightKg) ||
    numberOrNull(account.currentWeight) ||
    numberOrNull(account.weightKg);

  if (!weight) return 3;

  return Math.round(clamp(weight * 0.035, 2, 4.5) * 10) / 10;
}

function buildHealthData(account) {
  const checkIn = account.dailyCheckIn;
  const wearableData = account.wearableData;
  const todayKey = getLocalDateKey();

  if (!checkIn?.savedAt || checkIn.checkInDate !== todayKey) return null;
  const hasTodayWearableData =
    wearableData?.savedAt && wearableData.wearableDate === todayKey;
  const nutritionPlan = calculateNutritionPlan(account);
  const waterTarget = calculateWaterTarget(account);

  return {
    calories: {
      consumed: Number(checkIn.calories) || 0,
      target: nutritionPlan.calorieTarget,
      goal: nutritionPlan.goal
    },
    protein: {
      consumed: Number(checkIn.protein) || 0,
      target: nutritionPlan.proteinTarget
    },
    water: {
      consumed: Number(checkIn.water) || 0,
      target: waterTarget
    },
    sleep: {
      lastNight: Number(checkIn.sleep) || 0
    },
    mood: {
      score: Number(checkIn.mood) || 0
    },
    stress: {
      score: Number(checkIn.stress) || 0
    },
    cravings: {
      score: Number(checkIn.cravings) || 0
    },
    wearable: hasTodayWearableData
      ? {
          steps: Number(wearableData.steps) || 0,
          heartRate: Number(wearableData.heartRate) || 0,
          activeMinutes: Number(wearableData.activeMinutes) || 0,
          recoveryScore: Number(wearableData.recoveryScore) || 0,
          source: wearableData.source || ""
        }
      : null,
    profile: account.dietProfile || {},
    nutritionPlan,
    savedAt: checkIn.savedAt
  };
}

export function useFailurePrediction() {
  const { account } = useAuth();
  const healthData = buildHealthData(account);

  if (!healthData) {
    return {
      hasData: false,
      score: null,
      level: getRiskLevel(null),
      behaviorInsights: [],
      reasons: [],
      healthData: null
    };
  }

  const score = calculateRiskScore(healthData);
  const level = getRiskLevel(score);
  const behaviorInsights = analyzeBehavior(healthData);
  const reasons = generateFailureReasons(healthData);

  return {
    hasData: true,
    score,
    level,
    behaviorInsights,
    reasons,
    healthData
  };
}
