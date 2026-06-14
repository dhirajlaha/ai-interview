import express from "express";
import multer from "multer";
import fs from "node:fs/promises";
import cors from "cors";
import { parseResumeFromFile } from "./lib/resume-parser.ts";
import { fetchGithubProfile } from "./lib/github-fetcher.ts";
import { transcribeAudioWithWhisper } from "./lib/stt-whisper.ts";
import { prisma } from "./db.ts";

const PORT = process.env.PORT || 8000;
const app = express();
app.use(express.json());
app.use(cors());

const upload = multer({
  dest: "uploads/resumes/",
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
});

const audioUpload = multer({
  dest: "uploads/audio/",
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB
  },
});

app.post("/api/candidate", upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Resume file is required." });
    }
    if (req.file.mimetype !== "application/pdf") {
      await fs.unlink(req.file.path);
      return res.status(400).json({ error: "Only PDF files are allowed." });
    }

    const parsedResume = await parseResumeFromFile(
      req.file.path,
      req.file.originalname,
    );

    await fs.unlink(req.file.path);

    // Upsert candidate by email if available, otherwise always create new
    const candidate = await prisma.candidate.create({
      data: {
        name: parsedResume.name,
        email: parsedResume.email,
        phone: parsedResume.phone,
      },
    });

    // Persist resume + start interview session in parallel
    const [, session] = await Promise.all([
      prisma.resume.create({
        data: {
          candidateId: candidate.id,
          rawText: parsedResume.resumeText,
          parsedProfile: {
            fileName: parsedResume.fileName,
            location: parsedResume.location,
            summary: parsedResume.summary,
            skills: parsedResume.skills,
            experience: parsedResume.experience,
            education: parsedResume.education,
            leadership: parsedResume.leadership,
          },
        },
      }),
      prisma.interviewSession.create({
        data: {
          candidateId: candidate.id,
          status: "CREATED",
        },
      }),
    ]);

    // Fetch and persist GitHub data if username was found in the resume
    if (parsedResume.githubUsername) {
      try {
        const { profile, repos } = await fetchGithubProfile(
          parsedResume.githubUsername,
        );

        const githubProfile = await prisma.githubProfile.create({
          data: {
            candidateId: candidate.id,
            username: profile.username,
            profileUrl: profile.profileUrl,
            followers: profile.followers,
            following: profile.following,
            summary: profile.summary,
          },
        });

        await prisma.githubRepository.createMany({
          data: repos.map((repo) => ({
            githubProfileId: githubProfile.id,
            repoName: repo.repoName,
            description: repo.description,
            language: repo.language,
            stars: repo.stars,
            forks: repo.forks,
            repoUrl: repo.repoUrl,
            topics: repo.topics,
          })),
        });
      } catch (githubError) {
        console.warn("GitHub fetch skipped:", githubError);
      }
    }

    return res.json({
      candidateId: candidate.id,
      sessionId: session.id,
      name: parsedResume.name,
      email: parsedResume.email,
      summary: parsedResume.summary,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "An error occurred while processing the resume." });
  }
});

app.post(
  "/api/interviews/:sessionId/audio-turn",
  audioUpload.single("audio"),
  async (req, res) => {
    let uploadedAudioPath: string | undefined;
    let cleanedAudioPath: string | undefined;
    let transcriptPath: string | null | undefined;

    try {
      const rawSessionId = req.params.sessionId;
      const sessionId = Array.isArray(rawSessionId)
        ? rawSessionId[0]
        : rawSessionId;

      if (!sessionId) {
        return res.status(400).json({ error: "Session ID is required." });
      }

      if (!req.file) {
        return res.status(400).json({ error: "Audio file is required." });
      }

      uploadedAudioPath = req.file.path;

      const session = await prisma.interviewSession.findUnique({
        where: { id: sessionId },
      });

      if (!session) {
        await fs.unlink(req.file.path).catch(() => undefined);
        return res.status(404).json({ error: "Interview session not found." });
      }

      const {
        transcript,
        cleanedAudioPath: normalizedAudioPath,
        transcriptPath: whisperTranscriptPath,
        model,
      } = await transcribeAudioWithWhisper(req.file.path);

      cleanedAudioPath = normalizedAudioPath;
      transcriptPath = whisperTranscriptPath;

      const keepAudioFiles = process.env.KEEP_AUDIO_FILES === "true";

      const question =
        typeof req.body?.question === "string" && req.body.question.trim()
          ? req.body.question.trim()
          : "Tell me about yourself.";

      const turnCount = await prisma.interviewTurn.count({
        where: { sessionId },
      });

      const turn = await prisma.interviewTurn.create({
        data: {
          sessionId,
          turnIndex: turnCount + 1,
          question,
          answer: transcript,
          audioPath: keepAudioFiles ? req.file.path : null,
          sttMetadata: {
            model,
            sourceMime: req.file.mimetype,
            cleanedAudioPath: keepAudioFiles ? cleanedAudioPath : null,
            transcriptPath: keepAudioFiles ? transcriptPath : null,
            keepAudioFiles,
          },
        },
      });

      await prisma.interviewSession.updateMany({
        where: { id: sessionId, status: "CREATED" },
        data: { status: "IN_PROGRESS", startedAt: new Date() },
      });

      const nextQuestion = `You said: "${transcript}". Can you expand on that with a specific example?`;

      return res.json({
        turnId: turn.id,
        transcript,
        nextQuestion,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        error: "Failed to process audio turn.",
      });
    } finally {
      if (process.env.KEEP_AUDIO_FILES !== "true") {
        await Promise.allSettled([
          uploadedAudioPath
            ? fs.unlink(uploadedAudioPath)
            : Promise.resolve(undefined),
          cleanedAudioPath
            ? fs.unlink(cleanedAudioPath)
            : Promise.resolve(undefined),
          transcriptPath
            ? fs.unlink(transcriptPath)
            : Promise.resolve(undefined),
        ]);
      }
    }
  },
);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
