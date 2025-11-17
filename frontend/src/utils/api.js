// src/utils/api.js
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

export const fetchAPI = async (endpoint, options = {}) => {
  // Handle absolute URLs
  const url = endpoint.startsWith("http")
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  // Merge default headers
  const defaultHeaders = {
    "Content-Type": "application/json",
  };

  const config = {
    method: options.method || "GET",
    headers: {
      ...defaultHeaders,
      ...(options.headers || {}),
    },
    ...options,
  };

  // Stringify body if it's an object and method is not GET/HEAD
  if (
    config.body &&
    typeof config.body === "object" &&
    !["GET", "HEAD"].includes(config.method.toUpperCase())
  ) {
    config.body = JSON.stringify(config.body);
  }

  try {
    const response = await fetch(url, config);
    return response;
  } catch (error) {
    console.error(`[API ERROR] ${url}`, error);
    throw error;
  }
};