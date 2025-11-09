const API_BASE_URL =
  process.env.REACT_APP_API_URL || "https://stark-backend.legain.id";

console.log("API_BASE_URL:", API_BASE_URL); // Debug log

export const fetchAPI = async (endpoint) => {
  const fullUrl = `${API_BASE_URL}${endpoint}`;
  console.log("Fetching:", fullUrl); // Debug log
  return fetch(fullUrl);
};
