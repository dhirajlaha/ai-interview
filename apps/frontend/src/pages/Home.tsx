import { useActionState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { uploadResume, type UploadResumeResponse } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

interface FormState {
  success: boolean;
  data: UploadResumeResponse | null;
  error: string;
}

const handleUploadAction = async (
  _state: FormState,
  formData: FormData,
): Promise<FormState> => {
  const file = formData.get("resume") as File;

  if (!file) {
    return {
      success: false,
      data: null,
      error: "Please select a file",
    };
  }

  if (file.type !== "application/pdf") {
    return {
      success: false,
      data: null,
      error: "Only PDF files are allowed",
    };
  }

  if (file.size > 5 * 1024 * 1024) {
    return {
      success: false,
      data: null,
      error: "File size must be less than 5MB",
    };
  }

  try {
    const result = await uploadResume(formData);
    return { success: true, data: result, error: "" };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : "Failed to upload resume",
    };
  }
};

export function Home() {
  const navigate = useNavigate();

  const [state, formAction, isPending] = useActionState(handleUploadAction, {
    success: false,
    data: null,
    error: "",
  });

  // Navigate on successful upload
  useEffect(() => {
    if (state.success && state.data) {
      navigate("/interview", { state: { candidate: state.data } });
    }
  }, [state.success, state.data, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md p-8 shadow-lg">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            AI Interview Platform
          </h1>
          <p className="text-gray-600">Upload your resume to get started</p>
        </div>

        <form action={formAction} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="resume" className="text-base font-medium">
              Resume (PDF)
            </Label>
            <Input
              id="resume"
              name="resume"
              type="file"
              accept="application/pdf"
              disabled={isPending}
              className="cursor-pointer"
              required
            />
            {state.error && (
              <p className="text-sm text-red-600">{state.error}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={isPending}
            className="w-full py-6 text-lg font-semibold"
          >
            {isPending ? "Uploading..." : "Upload Resume"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
