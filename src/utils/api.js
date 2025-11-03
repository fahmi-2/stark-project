// src/utils/api.js
export const fetchDataFromAPI = async (year) => {
  if (!year) {
    throw new Error("Tahun tidak valid");
  }

  const response = await fetch(`http://127.0.0.1:8000/api/data?year=${year}`);
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error);
  }

  return data;
};