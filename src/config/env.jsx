export const env = {
  appName: "Reality Engine X",
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? "http://localhost:5001" : "")
};
