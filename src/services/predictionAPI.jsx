import { apiClient } from "./apiClient";

export function getPredictionSummary(accountId) {
  return apiClient.get(`/accounts/${accountId}`);
}
