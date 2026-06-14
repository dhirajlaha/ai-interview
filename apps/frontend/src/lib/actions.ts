/**
 * Server actions and API calls for the frontend
 */
import { config } from "@/config/env";

export interface UploadResumeResponse {
  candidateId: string;
  sessionId: string;
  name: string;
  email: string | null;
  summary: string | null;
}

export async function uploadResume(
  formData: FormData,
): Promise<UploadResumeResponse> {
  const response = await fetch(config.apiEndpoints.uploadResume, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to upload resume");
  }

  return response.json();
}
