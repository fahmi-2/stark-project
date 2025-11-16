const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

export const fetchAPI = async (endpoint) => {
  if (endpoint.startsWith("http")) {
  return fetch(endpoint);
  }
  const url = `${API_BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;
  return fetch(url);
};
