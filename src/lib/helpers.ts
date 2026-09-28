import type { Analysis, Issue } from "@/types/global";

export const createClassroomCode = (name: string) => {
  const classToken = name
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .trim()
    .split(/\s+/)
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 4);

  const randomToken = Math.floor(Math.random() * 900 + 100);

  return `ARCH-${classToken || "CLS"}${randomToken}`;
};

export function removeDuplicatedIssues(issues: Issue[]) {
  return issues.filter((issue_left, index_left) => {
    let hasASubDuplicatedIssue = false;

    issues.forEach((issue_right, index_right) => {
      if (index_right <= index_left) {
        return;
      }

      if (issue_left.title === issue_right.title) {
        if (issue_left?.code?.includes(issue_right.code as string)) {
          hasASubDuplicatedIssue = true;
        }
      }
    });

    return !hasASubDuplicatedIssue;
  });
}

export function cleanFileName(fileName: string) {
  return fileName.replaceAll("\\", "/").split("/").pop();
}

export function tokenizeCode(code: string) {
  const tokens: string[] = [];
  const tokenPattern =
    /\/\/[^\r\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|===|!==|=>|==|!=|<=|>=|&&|\|\||\+\+|--|\+=|-=|\*=|\/=|\*\*|[A-Za-z_$][\w$]*|\d+(?:\.\d+)?|\S/g;

  for (const match of code.matchAll(tokenPattern)) {
    const token = match[0];

    if (token.startsWith("//") || token.startsWith("/*")) {
      continue;
    }

    tokens.push(token);
  }

  return tokens;
}

export function normalizeCodeForSimilarity(code: string) {
  return tokenizeCode(code).join(" ");
}

export function normalizeAnalysisForSimilarity(analysis: Analysis) {
  const excludedKeys = new Set([
    "$id",
    "userId",
    "id",
    "$createdAt",
    "$updatedAt",
  ]);
  const analysisData = Object.fromEntries(
    Object.entries(analysis).filter(([key]) => !excludedKeys.has(key)),
  );

  return normalizeCodeForSimilarity(
    JSON.stringify({
      ...analysisData,
      fileName: cleanFileName(analysis.fileName),
    }),
  );
}
