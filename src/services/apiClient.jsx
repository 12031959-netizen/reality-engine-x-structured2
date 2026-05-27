import { env } from "../config/env";

async function request(path, options = {}) {
  let response;

  try {
    response = await fetch(`${env.apiBaseUrl}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers
      }
    });
  } catch (error) {
    throw new Error(
      `Cannot reach the API at ${env.apiBaseUrl}. Start the backend server and make sure WAMP/MySQL is running.`
    );
  }

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof data === "object" && data !== null && "message" in data
        ? data.message
        : "Request failed";

    throw new Error(message);
  }

  return data;
}

export const apiClient = {
  get(path, options) {
    return request(path, { method: "GET", ...options });
  },

  post(path, payload, options) {
    return request(path, {
      method: "POST",
      body: JSON.stringify(payload),
      ...options
    });
  },

  put(path, payload, options) {
    return request(path, {
      method: "PUT",
      body: JSON.stringify(payload),
      ...options
    });
  },

  delete(path, options) {
    return request(path, { method: "DELETE", ...options });
  }
};
