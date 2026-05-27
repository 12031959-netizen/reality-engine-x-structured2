import { useEffect, useState } from "react";
import { useAuth } from "../../../hooks/useAuth";
import { getLocalDateKey } from "../../../utils/dateKeys";
import { apiClient } from "../../../services/apiClient";

function clamp(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) && value !== "" ? number : null;
}

function getLatestRecord(account, todayKey) {
  if (!account) return { checkIn: null, wearableData: null };
  const history = [...(account.dailyHistory || [])].sort((a, b) =>
    b.date.localeCompare(a.date)
  );
  const latestHistory = history.find(
    (record) => record.checkIn || record.wearableData
  );

  return {
    checkIn:
      account.dailyCheckIn?.checkInDate === todayKey
        ? account.dailyCheckIn
        : latestHistory?.checkIn || null,
    wearableData:
      account.wearableData?.wearableDate === todayKey
        ? account.wearableData
        : latestHistory?.wearableData || null
  };
}

function buildHeuristicPredictions(checkIn, profile, wearableData) {
  if (!checkIn?.savedAt && !wearableData?.savedAt) return [];

  const sleep = numberOrNull(checkIn?.sleep);
  const mood = numberOrNull(checkIn?.mood);
  const stress = numberOrNull(checkIn?.stress);
  const cravings = numberOrNull(checkIn?.cravings);
  const calories = numberOrNull(checkIn?.calories);
  const protein = numberOrNull(checkIn?.protein);
  const water = numberOrNull(checkIn?.water);
  const steps = numberOrNull(wearableData?.steps);
  const heartRate = numberOrNull(wearableData?.heartRate);
  const activeMinutes = numberOrNull(wearableData?.activeMinutes);
  const recoveryScore = numberOrNull(wearableData?.recoveryScore);
  const targetWeight = numberOrNull(profile?.targetWeightKg);
  const currentWeight = numberOrNull(profile?.currentWeightKg);
  const proteinTarget = currentWeight ? Math.round(currentWeight * 1.6) : null;
  const predictions = [];

  if (sleep !== null || stress !== null || cravings !== null || mood !== null) {
    const riskScore = clamp(
      (stress || 0) * 5 +
      (cravings || 0) * 5 +
      Math.max(0, 7 - (sleep || 7)) * 8 +
      Math.max(0, 5 - (mood || 5)) * 4
    );

    predictions.push({
      title: "Diet failure risk",
      level: riskScore >= 70 ? "High" : riskScore >= 40 ? "Medium" : "Low",
      probability: riskScore,
      description:
        "Calculated from the sleep, stress, and cravings values you entered in the latest check-in."
    });
  }

  if (sleep !== null || stress !== null || recoveryScore !== null) {
    const recoveryPrediction = clamp(
      recoveryScore !== null
        ? recoveryScore
        : (sleep / 8) * 100 - (stress || 0) * 3
    );

    predictions.push({
      title: "Recovery support",
      level:
        recoveryPrediction >= 70
          ? "Positive"
          : recoveryPrediction >= 40
            ? "Watch"
            : "Low",
      probability: recoveryPrediction,
      description:
        recoveryScore !== null
          ? "Estimated from your uploaded mobile recovery score, plus your check-in when available."
          : "Estimated from your entered sleep and stress values."
    });
  }

  if (calories !== null || protein !== null || water !== null) {
    const proteinScore =
      protein !== null && proteinTarget
        ? Math.min(100, (protein / proteinTarget) * 100)
        : protein !== null
          ? 80
          : 0;
    const nutritionScore = clamp(
      (calories !== null ? 30 : 0) +
      proteinScore * 0.45 +
      (water !== null ? Math.min(25, (water / 3) * 25) : 0)
    );

    predictions.push({
      title: "Nutrition logging completeness",
      level: nutritionScore >= 80 ? "Strong" : "Incomplete",
      probability: nutritionScore,
      description:
        proteinTarget
          ? `Uses your calories, water, and protein against an estimated ${proteinTarget}g protein target from your entered weight.`
          : "Uses only the calories, protein, and water values you entered."
    });
  }

  if (steps !== null || activeMinutes !== null) {
    const activityScore = clamp(
      (steps !== null ? Math.min(70, (steps / 8000) * 70) : 0) +
      (activeMinutes !== null
        ? Math.min(30, (activeMinutes / 45) * 30)
        : 0)
    );

    predictions.push({
      title: "Mobile activity support",
      level:
        activityScore >= 75 ? "Strong" : activityScore >= 40 ? "Moderate" : "Low",
      probability: activityScore,
      description:
        "Calculated from the steps and active minutes uploaded from your phone, Apple Watch, or health export."
    });
  }

  if (heartRate !== null) {
    const heartScore = clamp(heartRate < 55 ? 90 : heartRate <= 85 ? 75 : 45);

    predictions.push({
      title: "Heart-rate recovery signal",
      level: heartRate <= 85 ? "Stable" : "Watch",
      probability: heartScore,
      description:
        `Uses the uploaded heart-rate value of ${heartRate} bpm as a recovery context signal.`
    });
  }

  if (targetWeight && currentWeight) {
    predictions.push({
      title: "Goal direction",
      level: targetWeight > currentWeight ? "Gain phase" : "Loss phase",
      probability: clamp(Math.abs(targetWeight - currentWeight) * 12),
      description:
        "Based on the current and target weight you entered in the diet setup form."
    });
  }

  return predictions;
}

export function usePredictions() {
  const { account, refreshAccount } = useAuth();
  const [aiPredictions, setAiPredictions] = useState([]);
  const [loadingAi, setLoadingAi] = useState(false);
  const [errorAi, setErrorAi] = useState(null);

  const todayKey = getLocalDateKey();
  const latestRecord = getLatestRecord(account, todayKey);

  const heuristicPredictions = buildHeuristicPredictions(
    latestRecord.checkIn,
    account?.dietProfile,
    latestRecord.wearableData
  );

  useEffect(() => {
    async function fetchAiPredictions() {
      if (!account || (!latestRecord.checkIn && !latestRecord.wearableData)) return;

      setLoadingAi(true);
      setErrorAi(null);
      try {
        const result = await apiClient.post("/ai/predictions", {
          userID: account.id,
          accountContext: {
            id: account.id,
            user: { name: account.name },
            dietProfile: account.dietProfile,
            dailyCheckIn: latestRecord.checkIn,
            wearableData: latestRecord.wearableData
          }
        });
        if (result.ok) {
          setAiPredictions(result.predictions);
          if (typeof refreshAccount === "function") {
            await refreshAccount();
          }
        }
      } catch (err) {
        console.error("AI Predictions error:", err);
        setErrorAi("Could not load AI insights.");
      } finally {
        setLoadingAi(false);
      }
    }

    fetchAiPredictions();
  }, [account?.id, latestRecord.checkIn?.savedAt, latestRecord.wearableData?.savedAt]);

  return {
    predictions: heuristicPredictions,
    aiPredictions,
    loadingAi,
    errorAi,
    total: heuristicPredictions.length + aiPredictions.length
  };
}
