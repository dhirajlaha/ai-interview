/**
 * Environment configuration for the frontend
 */

export const API_BASE_URL = "http://localhost:8000";

export const config = {
  apiBaseUrl: API_BASE_URL,
  apiEndpoints: {
    uploadResume: `${API_BASE_URL}/api/candidate`,
  },
};
