import { env } from "../config/env";

async function request(path, options = {}) {
  let response;

  if (!env.apiBaseUrl) {
    throw new Error("VITE_API_BASE_URL is missing. Set it in Vercel to your hosted backend URL, then redeploy.");
  }

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
      `Cannot reach the API at ${env.apiBaseUrl}. Make sure the hosted backend is deployed and running.`
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

  patch(path, payload, options) {
    return request(path, {
      method: "PATCH",
      body: JSON.stringify(payload),
      ...options
    });
  },

  delete(path, options) {
    return request(path, { method: "DELETE", ...options });
  }
};
