import { useMemo, useRef, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import type { UploadResumeResponse } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { config } from "@/config/env";

interface AudioTurnResponse {
  turnId: string;
  transcript: string;
  nextQuestion: string;
}

export function Call() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const location = useLocation();
  const candidate = location.state?.candidate as
    | UploadResumeResponse
    | undefined;

  const [isRecording, setIsRecording] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasRecordedAudio, setHasRecordedAudio] = useState(false);
  const [transcript, setTranscript] = useState<string>("");
  const [nextQuestion, setNextQuestion] = useState<string>(
    "Tell me about yourself and your recent project experience.",
  );
  const [error, setError] = useState<string>("");

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordedBlobRef = useRef<Blob | null>(null);

  const bars = useMemo(
    () => Array.from({ length: 20 }, (_, i) => 20 + ((i * 13 + 17) % 60)),
    [],
  );

  const stopTracks = () => {
    if (!streamRef.current) {
      return;
    }

    streamRef.current.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const uploadRecording = async () => {
    if (!sessionId || !recordedBlobRef.current) {
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("audio", recordedBlobRef.current, "answer.webm");
      formData.append("question", nextQuestion);

      const response = await fetch(
        `${config.apiBaseUrl}/api/interviews/${sessionId}/audio-turn`,
        {
          method: "POST",
          body: formData,
        },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || "Failed to process audio turn.");
      }

      const payload = (await response.json()) as AudioTurnResponse;
      setTranscript(payload.transcript);
      setNextQuestion(payload.nextQuestion);
      setHasRecordedAudio(false);
      recordedBlobRef.current = null;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Audio upload failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const startRecording = async () => {
    try {
      setError("");

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      streamRef.current = stream;
      chunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "";

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      recorderRef.current = recorder;

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        recordedBlobRef.current = blob.size > 0 ? blob : null;
        setHasRecordedAudio(Boolean(recordedBlobRef.current));
        chunksRef.current = [];
        stopTracks();
      };

      recorder.start();
      setIsRecording(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not access microphone.",
      );
      stopTracks();
    }
  };

  const stopRecording = () => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      return;
    }

    recorder.stop();
    setIsRecording(false);
  };

  const candidateInitial = (candidate?.name?.trim()?.[0] ?? "U").toUpperCase();

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center gap-8 p-4">
      <div className="text-center space-y-1">
        <h1 className="text-3xl font-bold">Interview Call</h1>
        <p className="text-slate-400 text-sm">
          Talk naturally and submit each answer when ready.
        </p>
      </div>

      <div className="w-full max-w-4xl grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 text-center">
          <p className="text-xs uppercase tracking-wide text-slate-400 mb-4">
            AI Interviewer
          </p>
          <div className="mx-auto mb-4 size-28 rounded-full bg-linear-to-br from-violet-500 via-indigo-500 to-cyan-400 p-0.5">
            <div className="size-full rounded-full bg-slate-950 grid place-items-center text-2xl font-bold">
              AI
            </div>
          </div>
          <div className="flex items-center justify-center gap-2">
            {bars.slice(0, 8).map((height, i) => (
              <span
                key={`ai-${i}`}
                className="rounded-full bg-indigo-400/80"
                style={{
                  width: `${Math.max(8, height / 3)}px`,
                  height: `${Math.max(8, height / 3)}px`,
                }}
              />
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 text-center">
          <p className="text-xs uppercase tracking-wide text-slate-400 mb-4">
            You
          </p>
          <div
            className={
              isRecording
                ? "mx-auto mb-4 size-28 rounded-full bg-linear-to-br from-emerald-400 to-teal-500 p-0.5 animate-pulse"
                : "mx-auto mb-4 size-28 rounded-full bg-linear-to-br from-emerald-400 to-teal-500 p-0.5"
            }
          >
            <div className="size-full rounded-full bg-slate-950 grid place-items-center text-2xl font-bold">
              {candidateInitial}
            </div>
          </div>
          <div className="flex items-center justify-center gap-2">
            {bars.slice(8).map((height, i) => (
              <span
                key={`user-${i}`}
                className={
                  isRecording
                    ? "rounded-full bg-emerald-300"
                    : "rounded-full bg-slate-600"
                }
                style={{
                  width: `${Math.max(8, height / 3)}px`,
                  height: `${Math.max(8, height / 3)}px`,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <p className="text-slate-300 text-lg">
        {isRecording
          ? "Listening..."
          : isSubmitting
            ? "Transcribing..."
            : hasRecordedAudio
              ? "Recorded. Click Submit Answer."
              : "Ready"}
      </p>

      <div className="w-full max-w-xl rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">
            Current Question
          </p>
          <p className="text-slate-100">{nextQuestion}</p>
        </div>

        {transcript && (
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">
              Last Transcript
            </p>
            <p className="text-slate-200">{transcript}</p>
          </div>
        )}

        {error && <p className="text-red-400 text-sm">{error}</p>}
      </div>

      <div className="flex gap-3">
        <Button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isSubmitting}
          className={
            isRecording
              ? "bg-amber-600 hover:bg-amber-700"
              : "bg-emerald-600 hover:bg-emerald-700"
          }
        >
          {isRecording ? "Stop Mic" : "Start Mic"}
        </Button>
        <Button
          onClick={uploadRecording}
          disabled={!hasRecordedAudio || isRecording || isSubmitting}
          className="bg-rose-600 hover:bg-rose-700"
        >
          Submit Answer
        </Button>
      </div>
    </div>
  );
}
