import { GoogleGenAI } from "@google/genai";

interface GenerateNextQuestionInput {
  candidateName: string;
  resumeSummary: string | null;
  githubSummary: string | null;
  lastQuestion: string;
  lastAnswer: string;
  recentTurns: Array<{ question: string; answer: string | null }>;
}

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemma-4-31b-it";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const DEBUG_GEMINI = process.env.DEBUG_GEMINI === "true";
const GEMINI_TIMEOUT_MS = process.env.GEMINI_TIMEOUT_MS
  ? Number(process.env.GEMINI_TIMEOUT_MS)
  : undefined;

const INTERVIEWER_SYSTEM_PROMPT = `You are a senior technical interviewer conducting a realistic, structured interview.
Persona and behavior:
- Be professional, concise, and neutral.
- Ask one question at a time.
- Focus on depth over breadth.
- Adapt to the candidate's background from resume and GitHub context.
- Escalate difficulty gradually based on answer quality.
- Avoid repeating previously asked questions.

Question quality rules:
- Prefer scenario-based and experience-based questions.
- Ask for specifics (tradeoffs, architecture, debugging steps, metrics).
- Keep each question clear and under 35 words.
- Return only the question text with no labels, bullets, or explanations.`;

const ai = GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: GEMINI_API_KEY,
    })
  : null;

function compactText(value: string | null | undefined) {
  return value?.replace(/\s+/g, " ").trim() || "";
}

function clipText(value: string | null | undefined, maxChars: number) {
  const text = compactText(value);
  if (text.length <= maxChars) {
    return text;
  }
  return `${text.slice(0, maxChars).trim()}...`;
}

function buildPrompt(input: GenerateNextQuestionInput) {
  const history = input.recentTurns
    .slice(-4)
    .map((turn, index) => {
      const answer = clipText(turn.answer, 260) || "(no answer)";
      return `${index + 1}. Q: ${clipText(turn.question, 180)}\n   A: ${answer}`;
    })
    .join("\n");

  return `You are an AI technical interviewer.

Candidate profile:
- Name: ${input.candidateName}
- Resume summary: ${clipText(input.resumeSummary, 600) || "N/A"}
- GitHub summary: ${clipText(input.githubSummary, 320) || "N/A"}

Most recent turn:
- Question: ${clipText(input.lastQuestion, 220)}
- Candidate answer: ${clipText(input.lastAnswer, 400)}

Previous interview turns:
${history || "No previous turns."}

Task:
Generate exactly ONE high-quality follow-up interview question.
Rules:
1) Return only the question text.
2) Keep it under 100 words.
3) Make it specific and technical when possible.
4) Do not repeat the previous question.
5) Do not include explanations, bullets, or prefixes.`;
}

function normalizeQuestion(text: string) {
  const firstLine = text.split("\n")[0]?.trim() || text.trim();
  return firstLine.endsWith("?") ? firstLine : `${firstLine}?`;
}

function extractFirstQuestion(text: string) {
  const normalized = text.replace(/\s+/g, " ").trim();
  const questionIndex = normalized.indexOf("?");
  if (questionIndex === -1) {
    return normalized;
  }

  return normalized.slice(0, questionIndex + 1).trim();
}

function isVagueQuestion(question: string) {
  const lower = question.toLowerCase();
  const vagueStarts = [
    "could you tell",
    "could you describe",
    "can you tell",
    "can you describe",
    "tell me more",
  ];

  const wordCount = question.split(/\s+/).filter(Boolean).length;
  return vagueStarts.some((start) => lower.startsWith(start)) || wordCount < 7;
}

async function generateQuestionWithStreaming(
  model: string,
  input: GenerateNextQuestionInput,
): Promise<string> {
  const startedAt = Date.now();

  const stream = await ai!.models.generateContentStream({
    model,
    contents: buildPrompt(input),
    config: {
      systemInstruction: INTERVIEWER_SYSTEM_PROMPT,
    },
  });

  let accumulated = "";

  for await (const chunk of stream) {
    if (GEMINI_TIMEOUT_MS && Date.now() - startedAt > GEMINI_TIMEOUT_MS) {
      if (DEBUG_GEMINI) {
        console.warn("[gemini] stream timed out", {
          model,
          timeoutMs: GEMINI_TIMEOUT_MS,
        });
      }
      throw new Error(
        "LLM stream timeout before a valid question was produced.",
      );
    }

    if (!chunk.text) {
      continue;
    }

    accumulated += chunk.text;

    // Keep collecting full streamed text to avoid returning an incomplete question.
  }

  if (!accumulated.trim()) {
    throw new Error("LLM returned empty output.");
  }

  const finalQuestion = normalizeQuestion(extractFirstQuestion(accumulated));
  if (isVagueQuestion(finalQuestion)) {
    throw new Error("LLM returned a vague question.");
  }

  if (DEBUG_GEMINI) {
    console.info("[gemini] stream final question", {
      model,
      elapsedMs: Date.now() - startedAt,
      question: finalQuestion,
    });
  }

  return finalQuestion;
}

async function generateQuestionWithNonStreaming(
  model: string,
  input: GenerateNextQuestionInput,
): Promise<string> {
  const response = await ai!.models.generateContent({
    model,
    contents: buildPrompt(input),
    config: {
      systemInstruction: INTERVIEWER_SYSTEM_PROMPT,
      temperature: 0.5,
      maxOutputTokens: 80,
      thinkingConfig: {
        thinkingBudget: 0,
      },
    },
  });

  const text = response.text?.trim();
  if (!text) {
    throw new Error("LLM returned empty output in non-streaming mode.");
  }

  const question = normalizeQuestion(extractFirstQuestion(text));
  if (isVagueQuestion(question)) {
    throw new Error("LLM returned a vague question in non-streaming mode.");
  }

  return question;
}

export async function generateNextInterviewQuestion(
  input: GenerateNextQuestionInput,
): Promise<string> {
  if (!ai) {
    if (DEBUG_GEMINI) {
      console.info("[gemini] skipped: GEMINI_API_KEY not set");
    }
    throw new Error("GEMINI_API_KEY not set.");
  }

  try {
    if (DEBUG_GEMINI) {
      console.info("[gemini] generateContentStream called", {
        model: GEMINI_MODEL,
        timeoutMs: GEMINI_TIMEOUT_MS ?? "disabled",
        promptChars: buildPrompt(input).length,
        candidateName: input.candidateName,
        resumeSummaryChars: compactText(input.resumeSummary).length,
        githubSummaryChars: compactText(input.githubSummary).length,
        lastQuestionChars: compactText(input.lastQuestion).length,
        lastAnswerChars: compactText(input.lastAnswer).length,
        recentTurns: input.recentTurns.length,
      });
    }

    try {
      return await generateQuestionWithStreaming(GEMINI_MODEL, input);
    } catch (streamError) {
      if (DEBUG_GEMINI) {
        console.warn("[gemini] stream failed, retrying same model non-stream", {
          model: GEMINI_MODEL,
          reason:
            streamError instanceof Error
              ? streamError.message
              : String(streamError),
        });
      }

      return await generateQuestionWithNonStreaming(GEMINI_MODEL, input);
    }
  } catch (error) {
    console.warn("Gemini question generation failed:", error);
    throw error;
  }
}
