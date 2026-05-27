import { apiClient } from "./apiClient";

export function saveDailyCheckIn(accountId, payload) {
  return apiClient.post(`/accounts/${accountId}/daily-checkin`, payload);
}

export function getHealthSummary(accountId) {
  return apiClient.get(`/accounts/${accountId}`);
}
