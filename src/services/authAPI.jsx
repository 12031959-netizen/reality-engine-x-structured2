import { apiClient } from "./apiClient";

export function loginUser(credentials) {
  return apiClient.post("/auth/login", credentials);
}

export function signupUser(payload) {
  return apiClient.post("/auth/signup", payload);
}