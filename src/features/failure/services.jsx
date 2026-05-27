import { calculateRiskScore } from "./logic/calculateRiskScore";
import { analyzeBehavior } from "./logic/analyzeBehavior";
import { generateFailureReasons } from "./logic/generateFailureReasons";

export function getFailurePrediction(healthData) {
  if (!healthData) {
    return {
      risk: null,
      breakdown: [],
      reasons: []
    };
  }

  return {
    risk: calculateRiskScore(healthData),
    breakdown: analyzeBehavior(healthData),
    reasons: generateFailureReasons(healthData)
  };
}
