import { useLocation, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { UploadResumeResponse } from "@/lib/actions";

export function Interview() {
  const location = useLocation();
  const navigate = useNavigate();
  const candidate = location.state?.candidate as
    | UploadResumeResponse
    | undefined;

  if (!candidate) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">No candidate data found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Ready to Interview
          </h1>
          <p className="text-gray-600">
            Review your details and start when ready
          </p>
        </div>

        <Card className="p-8 shadow-lg mb-6">
          <div className="space-y-3 text-gray-700">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">
                Name
              </p>
              <p className="text-lg font-medium">{candidate.name}</p>
            </div>
            {candidate.email && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">
                  Email
                </p>
                <p>{candidate.email}</p>
              </div>
            )}
          </div>
        </Card>

        {candidate.summary && (
          <Card className="p-8 shadow-lg mb-8">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
              Summary
            </p>
            <p className="text-gray-700 leading-7">{candidate.summary}</p>
          </Card>
        )}

        <Button
          className="w-full py-6 text-lg font-semibold"
          onClick={() =>
            navigate(`/call/${candidate.sessionId}`, {
              state: { candidate },
            })
          }
        >
          Start Interview
        </Button>
      </div>
    </div>
  );
}
