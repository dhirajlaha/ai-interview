import { spawn } from "node:child_process";
import fs from "node:fs/promises";

const WHISPER_CPP_BIN =
  process.env.WHISPER_CPP_BIN ||
  "/Users/dhirajlaha/ai-models/whisper.cpp/build/bin/whisper-cli";

const WHISPER_CPP_MODEL =
  process.env.WHISPER_CPP_MODEL ||
  "/Users/dhirajlaha/ai-models/whisper.cpp/models/ggml-small.en.bin";

function runCommand(
  command: string,
  args: string[],
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args);

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(new Error(stderr || `${command} exited with code ${code}`));
    });
  });
}

function sanitizeTranscript(raw: string) {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeWhisperConsole(raw: string) {
  return raw
    .split("\n")
    .map((line) => line.replace(/^\[[^\]]+\]\s*/, "").trim())
    .filter(Boolean)
    .filter(
      (line) =>
        !/^(main:|whisper_|system_info:|output_|model_|n_threads|n_processors)/i.test(
          line,
        ),
    )
    .join(" ");
}

export interface WhisperResult {
  transcript: string;
  cleanedAudioPath: string;
  transcriptPath: string | null;
  model: string;
}

export async function transcribeAudioWithWhisper(
  inputPath: string,
): Promise<WhisperResult> {
  const cleanedAudioPath = `${inputPath}.clean.wav`;
  const outputPrefix = `${inputPath}.whisper`;
  const transcriptPath = `${outputPrefix}.txt`;

  await runCommand("ffmpeg", [
    "-y",
    "-i",
    inputPath,
    "-ar",
    "16000",
    "-ac",
    "1",
    cleanedAudioPath,
  ]);

  const whisperRun = await runCommand(WHISPER_CPP_BIN, [
    "-m",
    WHISPER_CPP_MODEL,
    "-f",
    cleanedAudioPath,
    "-of",
    outputPrefix,
    "-otxt",
    "-nt",
  ]);

  let transcript = "";
  let transcriptOutputPath: string | null = null;

  try {
    const transcriptFile = await fs.readFile(transcriptPath, "utf8");
    transcript = sanitizeTranscript(transcriptFile);
    transcriptOutputPath = transcriptPath;
  } catch {
    transcript = sanitizeTranscript(
      sanitizeWhisperConsole(`${whisperRun.stdout}\n${whisperRun.stderr}`),
    );
  }

  if (!transcript) {
    throw new Error("Whisper produced an empty transcript.");
  }

  return {
    transcript,
    cleanedAudioPath,
    transcriptPath: transcriptOutputPath,
    model: WHISPER_CPP_MODEL,
  };
}
