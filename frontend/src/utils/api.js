const API_BASE_URL = process.env.REACT_APP_API_URL;

export const fetchAPI = async (endpoint) => {
  return fetch(`${API_BASE_URL}${endpoint}`);
};
