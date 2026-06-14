import fs from "node:fs/promises";
import { PDFParse } from "pdf-parse";

export interface ParsedResume {
  fileName: string;
  name: string;
  email: string | null;
  phone: string | null;
  location: string | null;
  githubUsername: string | null;
  summary: string | null;
  skills: string[];
  experience: string[];
  education: string[];
  leadership: string[];
  resumeText: string;
}

const SECTION_TITLES = [
  "Summary",
  "Education",
  "Experience",
  "Technical Skills",
  "Leadership & Extracurricular",
];

function cleanLine(line: string) {
  return line.replace(/\s+/g, " ").trim();
}

function getSection(lines: string[], title: string) {
  const startIndex = lines.findIndex((line) => cleanLine(line) === title);

  if (startIndex === -1) {
    return [];
  }

  const endIndex = lines.findIndex(
    (line, index) =>
      index > startIndex && SECTION_TITLES.includes(cleanLine(line)),
  );

  return lines
    .slice(startIndex + 1, endIndex === -1 ? undefined : endIndex)
    .map(cleanLine)
    .filter(Boolean)
    .filter((line) => !/^--\s*\d+\s+of\s+\d+\s*--$/i.test(line));
}

function splitSectionItems(lines: string[]) {
  return lines
    .map((line) => line.replace(/^[•*\-]\s*/, "").trim())
    .filter(Boolean);
}

export function parseResumeText(
  fileName: string,
  resumeText: string,
): ParsedResume {
  const lines = resumeText
    .split("\n")
    .map(cleanLine)
    .filter(Boolean)
    .filter((line) => !/^--\s*\d+\s+of\s+\d+\s*--$/i.test(line));

  const headerBlock = lines.slice(0, 3).join(" ");
  const firstLine = lines[0] ?? fileName.replace(/\.pdf$/i, "");
  const headerPrefix = headerBlock.split(/[#§ï]/)[0] ?? "";

  const emailMatch = resumeText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  const phoneMatch = resumeText.match(/(?:\+?\d[\d\s()-]{8,}\d)/);

  const githubUrlMatch = resumeText.match(
    /\(https?:\/\/(?:www\.)?github\.com\/([A-Za-z0-9_-]+)(?:\/[^)]*)?\)/i,
  );
  const githubSymbolMatch = resumeText.match(/§\s*([A-Za-z0-9_-]+)/);
  const githubUsername = githubUrlMatch?.[1] ?? githubSymbolMatch?.[1] ?? null;

  return {
    fileName,
    name: firstLine,
    email: emailMatch?.[0] ?? null,
    phone: phoneMatch?.[0]?.trim() ?? null,
    githubUsername,
    location:
      headerPrefix.replace(firstLine, "").replace(/[•*]/g, " ").trim() || null,
    summary: getSection(lines, "Summary").join(" ") || null,
    skills: splitSectionItems(getSection(lines, "Technical Skills"))
      .flatMap((item) => item.split(/\s*•\s*|,\s*/))
      .map((item) => item.trim())
      .filter(Boolean),
    experience: splitSectionItems(getSection(lines, "Experience")),
    education: splitSectionItems(getSection(lines, "Education")),
    leadership: splitSectionItems(
      getSection(lines, "Leadership & Extracurricular"),
    ),
    resumeText,
  };
}

export async function parseResumeFromFile(
  filePath: string,
  fileName: string,
): Promise<ParsedResume> {
  const pdfBuffer = await fs.readFile(filePath);
  const pdfBytes = new Uint8Array(pdfBuffer);
  const pdfData = new PDFParse({ data: pdfBytes });

  const pdfResult = await pdfData.getText({ parseHyperlinks: true });

  return parseResumeText(fileName, pdfResult.text);
}
