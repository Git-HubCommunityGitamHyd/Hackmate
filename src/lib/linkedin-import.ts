import type { LinkedInImport } from "@/lib/db/schema";

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let closedQuote = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
        closedQuote = true;
      } else {
        field += char;
      }
      continue;
    }

    if (closedQuote && char !== "," && char !== "\r" && char !== "\n" && char !== " " && char !== "\t") {
      throw new Error("The CSV contains an unexpected character after a quoted field");
    }
    if (char === '"' && field.length === 0) {
      quoted = true;
      closedQuote = false;
    } else if (char === ",") {
      row.push(field.trim());
      field = "";
      closedQuote = false;
    } else if (char === "\r" || char === "\n") {
      row.push(field.trim());
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      field = "";
      closedQuote = false;
      if (char === "\r" && text[i + 1] === "\n") i += 1;
    } else if (!closedQuote) {
      field += char;
    }
  }

  if (quoted) throw new Error("The CSV has an unterminated quoted field");
  if (field.length > 0 || row.length > 0) {
    row.push(field.trim());
    if (row.some((value) => value.length > 0)) rows.push(row);
  }
  return rows;
}

function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function getValue(
  values: string[],
  indexByHeader: Map<string, number>,
  aliases: string[],
): string | null {
  for (const alias of aliases) {
    const index = indexByHeader.get(normalizeHeader(alias));
    const value = index === undefined ? "" : values[index]?.trim() ?? "";
    if (value) return value;
  }
  return null;
}

export function parseLinkedInCsv(text: string, fileName: string): LinkedInImport {
  const rows = parseCsv(text);
  if (rows.length < 2) throw new Error("The CSV must include a header and at least one data row");

  const headers = rows[0].map(normalizeHeader);
  const indexByHeader = new Map(headers.map((header, index) => [header, index]));
  const file = fileName.toLowerCase();
  const experiences: LinkedInImport["experiences"] = [];
  const education: LinkedInImport["education"] = [];
  const skills: string[] = [];
  let headline: string | null = null;
  let about: string | null = null;

  for (const values of rows.slice(1)) {
    headline ??= getValue(values, indexByHeader, ["headline"]);
    about ??= getValue(values, indexByHeader, ["summary", "about"]);

    const company = getValue(values, indexByHeader, ["company name", "company", "organization"]);
    const title = getValue(values, indexByHeader, ["title", "position", "job title"]);
    const isExperience =
      file.includes("position") ||
      file.includes("experience") ||
      (!!title && (!!company || headers.some((h) => ["description", "location", "startedon", "startdate"].includes(h))));
    if (isExperience && (company || title)) {
      experiences.push({
        title,
        company,
        location: getValue(values, indexByHeader, ["location"]),
        startDate: getValue(values, indexByHeader, ["started on", "start date"]),
        endDate: getValue(values, indexByHeader, ["finished on", "end date"]),
        description: getValue(values, indexByHeader, ["description"]),
      });
    }

    const school = getValue(values, indexByHeader, ["school name", "school", "institution"]);
    const degree = getValue(values, indexByHeader, ["degree name", "degree"]);
    const isEducation =
      file.includes("education") ||
      (!!school && headers.some((h) => ["degreename", "degree", "startdate", "enddate"].includes(h)));
    if (isEducation && (school || degree)) {
      education.push({
        school,
        degree,
        fieldOfStudy: getValue(values, indexByHeader, ["field of study"]),
        startDate: getValue(values, indexByHeader, ["start date"]),
        endDate: getValue(values, indexByHeader, ["end date"]),
        description: getValue(values, indexByHeader, ["notes", "activities", "description"]),
      });
    }

    const skill = getValue(
      values,
      indexByHeader,
      file.includes("skill") ? ["name", "skill", "skill name"] : ["skill", "skill name"],
    );
    if (skill && (file.includes("skill") || indexByHeader.has("skill") || indexByHeader.has("skillname"))) {
      skills.push(skill);
    }
  }

  const imported: LinkedInImport = {
    headline,
    about,
    experiences,
    education,
    skills: [...new Set(skills)],
  };
  if (
    !imported.headline &&
    !imported.about &&
    imported.experiences.length === 0 &&
    imported.education.length === 0 &&
    imported.skills.length === 0
  ) {
    throw new Error("No LinkedIn profile, experience, education, or skills data was found in this CSV");
  }
  return imported;
}

export function normalizeLinkedInProfileUrl(value: string): { url: string; username: string } {
  let parsed: URL;
  try {
    parsed = new URL(value.trim());
  } catch {
    throw new Error("Enter a valid LinkedIn profile URL");
  }
  if (
    !["linkedin.com", "www.linkedin.com"].includes(parsed.hostname.toLowerCase()) ||
    parsed.protocol !== "https:"
  ) {
    throw new Error("Enter a LinkedIn profile URL beginning with https://www.linkedin.com/in/");
  }
  const match = parsed.pathname.match(/^\/in\/([^/]+)\/?$/i);
  if (!match) throw new Error("The URL must point to a LinkedIn profile (/in/username)");
  let username: string;
  try {
    username = decodeURIComponent(match[1]);
  } catch {
    throw new Error("The LinkedIn profile URL contains an invalid username");
  }
  if (!/^[A-Za-z0-9_-]+$/.test(username)) {
    throw new Error("The LinkedIn profile URL contains an invalid username");
  }
  return {
    url: `https://www.linkedin.com/in/${encodeURIComponent(username)}`,
    username,
  };
}
