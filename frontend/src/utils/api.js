// src/utils/api.js
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

export const fetchDataFromAPI = async (year) => {
  if (!year) {
    throw new Error("Tahun tidak valid");
  }

  const response = await fetch(`${API_BASE_URL}/api/data?year=${year}`);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error);
  }

  return data;
};
