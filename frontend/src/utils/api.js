const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

export const fetchAPI = async (endpoint) => {
  try {
    // Handle absolute URLs and ensure single slash between base and endpoint
    if (endpoint.startsWith("http")) {
      const response = await fetch(endpoint);
      if (!response.ok) {
        console.warn(`API warning: ${endpoint} returned ${response.status}`);
      }
      return response;
    }
    const url = `${API_BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;
    console.log("Fetching:", url);
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`API warning: ${url} returned ${response.status}`);
    }
    return response;
  } catch (error) {
    console.error("Fetch failed for:", endpoint, "Error:", error.message);
    throw error;
  }
};
