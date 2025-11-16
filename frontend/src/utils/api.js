const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

export const fetchAPI = async (endpoint) => {
  // Handle absolute URLs and ensure single slash between base and endpoint
  if (endpoint.startsWith("http")) {
    return fetch(endpoint);
  }
  const url = `${API_BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;
  return fetch(url);
};
