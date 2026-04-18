import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { getAnalysisById, getClassroomStudents, getUserById } from "@/lib/db";
import { useClassroomContext } from "@/contexts/classroomContext";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomOneDark } from "react-syntax-highlighter/dist/esm/styles/hljs";

type AnalysisIssue = {
  id?: string;
  title?: string;
  type?: string;
  line?: number;
  functionName?: string;
  functionLines?: string;
  suggestion?: string;
  advice?: string;
  principle?: string;
};

type AnalysisDetail = {
  id: string;
  userId: string;
  fileName: string;
  fileType: string;
  code: string;
  createdAt: string;
  updatedAt?: string;
  comments?: Array<{ id?: string; line?: number; text?: string }>;
  functions?: Array<{
    id?: string;
    name?: string;
    complexity?: number;
    maxNesting?: number;
    lines?: number;
    line?: number;
  }>;
  variables?: Array<{ id?: string; name?: string; line?: number }>;
  issues?: AnalysisIssue[];
};

type LocationState = {
  studentName?: string;
  studentEmail?: string;
  classroomName?: string;
  classroomId?: string;
};

const TYPE_DISPLAY_ORDER = [
  "critical",
  "error",
  "warning",
  "improvement",
  "info",
  "hint",
  "style",
  "unknown",
];

const ISSUE_PRINCIPLE_BY_TITLE: Record<string, string> = {
  "Unused Variable": "YAGNI (You Aren't Gonna Need It)",
  "Unused Function": "YAGNI (You Aren't Gonna Need It)",
  "Use of var": "KISS (Keep It Simple, Stupid)",
  "Poor Variable Naming": "KISS (Keep It Simple, Stupid)",
  "Naming Convention": "KISS (Keep It Simple, Stupid)",
  "Name Reuse": "DRY (Don't Repeat Yourself)",
  "Function Too Long": "Single Responsibility Principle",
  "Too Many Parameters": "KISS (Keep It Simple, Stupid)",
  "High Complexity": "Separation of Concerns",
  "Duplicate Code Blocks": "DRY (Don't Repeat Yourself)",
  "Deep Nesting": "KISS (Keep It Simple, Stupid)",
  "TODO Comment": "Avoid Premature Optimization",
  "Commented-out Code": "YAGNI (You Aren't Gonna Need It)",
};

const BASE_ISSUE_PENALTIES = [
  { title: "High Complexity", penalty: 2.0 },
  { title: "Deep Nesting", penalty: 1.5 },
  { title: "Function Too Long", penalty: 1.25 },
  { title: "Too Many Parameters", penalty: 1.0 },
  { title: "Name Reuse", penalty: 0.75 },
  { title: "Duplicate Code Blocks", penalty: 1.0 },
  { title: "Poor Variable Naming", penalty: 0.75 },
  { title: "Naming Convention", penalty: 0.75 },
  { title: "Commented-out Code", penalty: 0.5 },
  { title: "TODO Comment", penalty: 0.2 },
];

const LANGUAGE_ISSUE_PENALTIES: Record<
  string,
  Array<{ title: string; penalty: number }>
> = {
  javascript: [{ title: "Use of var", penalty: 0.25 }],
};

const DEFAULT_PENALTY_BY_TYPE: Record<string, number> = {
  critical: 2.5,
  error: 2.0,
  warning: 1.0,
  improvement: 0.75,
  info: 0.25,
};

const DEFAULT_FALLBACK_PENALTY = 0.75;

const StudentAnalysisShow = () => {
  const { analysisId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state || {}) as LocationState;
  const { classrooms } = useClassroomContext();

  const [analysis, setAnalysis] = useState<AnalysisDetail | null>(null);
  const [studentName, setStudentName] = useState(state.studentName || "");
  const [studentEmail, setStudentEmail] = useState(state.studentEmail || "");
  const [classroomName, setClassroomName] = useState(state.classroomName || "");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalysis = async () => {
      if (!analysisId) {
        setError("Missing analysis ID.");
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const detail = (await getAnalysisById(
          analysisId,
        )) as AnalysisDetail | null;

        if (!detail) {
          setAnalysis(null);
          setError(null);
          return;
        }

        setAnalysis(detail);

        if (!studentName || !studentEmail) {
          const student = await getUserById(detail.userId);
          if (student) {
            setStudentName(student.name || "Unknown Student");
            setStudentEmail(student.email || "Unknown Email");
          }
        }

        if (!classroomName) {
          const match = await findClassroomNameForStudent(
            classrooms,
            detail.userId,
          );
          if (match) {
            setClassroomName(match);
          }
        }
      } catch {
        setError("Could not load this analysis right now.");
      } finally {
        setIsLoading(false);
      }
    };

    void fetchAnalysis();
  }, [analysisId, classrooms, classroomName, studentEmail, studentName]);

  const sortedIssues = useMemo(() => {
    const issues = analysis?.issues || [];

    return [...issues].sort((left, right) => {
      const rankLeft = TYPE_DISPLAY_ORDER.indexOf(
        String(left.type || "unknown").toLowerCase(),
      );
      const rankRight = TYPE_DISPLAY_ORDER.indexOf(
        String(right.type || "unknown").toLowerCase(),
      );

      const normalizedLeft =
        rankLeft === -1 ? TYPE_DISPLAY_ORDER.length : rankLeft;
      const normalizedRight =
        rankRight === -1 ? TYPE_DISPLAY_ORDER.length : rankRight;

      if (normalizedLeft !== normalizedRight) {
        return normalizedLeft - normalizedRight;
      }

      return (left.line || 0) - (right.line || 0);
    });
  }, [analysis?.issues]);

  const severityBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    for (const issue of sortedIssues) {
      const type = String(issue.type || "unknown").toLowerCase();
      counts.set(type, (counts.get(type) || 0) + 1);
    }

    const ordered = TYPE_DISPLAY_ORDER.map((type) => {
      const value = counts.get(type);
      if (!value) {
        return null;
      }

      return `${type}: ${value}`;
    }).filter(Boolean);

    return ordered.length ? ordered.join(" | ") : "none";
  }, [sortedIssues]);

  const topIssueTitles = useMemo(() => {
    const counts = new Map<string, number>();
    for (const issue of sortedIssues) {
      const title = issue.title || "Unknown Issue";
      counts.set(title, (counts.get(title) || 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([title, count]) => ({ title, count }))
      .sort(
        (left, right) =>
          right.count - left.count || left.title.localeCompare(right.title),
      )
      .slice(0, 5);
  }, [sortedIssues]);

  const qualityScore = useMemo(() => {
    if (!analysis) {
      return 1;
    }

    if (!sortedIssues.length) {
      return 10;
    }

    const language = getLanguageFromAnalysis(analysis);
    const penaltyByTitle = getPenaltyByTitle(language);
    return calculateScoreFromIssues(sortedIssues, penaltyByTitle);
  }, [analysis, sortedIssues]);

  const scoreBar = useMemo(() => buildScoreBar(qualityScore), [qualityScore]);

  const syntaxLanguage = useMemo(() => {
    if (!analysis) {
      return "plaintext";
    }

    const normalizedFileType = String(analysis.fileType || "").toLowerCase();
    if (normalizedFileType === "js" || normalizedFileType === "javascript") {
      return "javascript";
    }

    if (normalizedFileType === "py" || normalizedFileType === "python") {
      return "python";
    }

    if (normalizedFileType === "cs" || normalizedFileType === "csharp") {
      return "csharp";
    }

    const extension = analysis.fileName.split(".").pop()?.toLowerCase();

    if (extension === "js") {
      return "javascript";
    }

    if (extension === "py") {
      return "python";
    }

    if (extension === "cs") {
      return "csharp";
    }

    return "plaintext";
  }, [analysis]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6 md:p-10">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
          <Skeleton className="h-14 w-40" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-6 md:p-10">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/student-analysis")}
          >
            Back
          </Button>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-destructive">{error}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="min-h-screen bg-background p-6 md:p-10">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/student-analysis")}
          >
            Back
          </Button>
          <Card>
            <CardHeader>
              <CardTitle>Analysis not found</CardTitle>
              <CardDescription>
                The selected analysis could not be located.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/student-analysis")}
          >
            Back
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Student Analysis Detail</CardTitle>
            <CardDescription>
              Full source code and analysis output for the selected file.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm md:grid-cols-2">
            <p>
              <span className="text-muted-foreground">Student:</span>{" "}
              {studentName || "Unknown Student"}
            </p>
            <p>
              <span className="text-muted-foreground">File:</span>{" "}
              {analysis.fileName}
            </p>
            <p>
              <span className="text-muted-foreground">File type:</span>{" "}
              {analysis.fileType}
            </p>
            <p>
              <span className="text-muted-foreground">Analysis date:</span>{" "}
              {formatDateTime(analysis.createdAt)}
            </p>
            <p>
              <span className="text-muted-foreground">Quality score:</span>{" "}
              {qualityScore}/10 {scoreBar}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Analysis Summary</CardTitle>
            <CardDescription>
              Derived from ArcHone issue output style.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Quality score:</span>{" "}
              {qualityScore}/10 {scoreBar}
            </p>
            <p>
              <span className="text-muted-foreground">Total issues:</span>{" "}
              {sortedIssues.length}
            </p>
            <p>
              <span className="text-muted-foreground">Severity breakdown:</span>{" "}
              {severityBreakdown}
            </p>
            <div>
              <p className="text-muted-foreground">Top issue titles:</p>
              {topIssueTitles.length ? (
                <ul className="list-disc pl-5">
                  {topIssueTitles.map((item) => (
                    <li key={item.title}>
                      {item.title} ({item.count})
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No issues found.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Source Code</CardTitle>
            <CardDescription>Code captured at analysis time.</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-105 rounded-none border bg-muted/30">
              <SyntaxHighlighter
                language={syntaxLanguage}
                style={atomOneDark}
                customStyle={{
                  margin: 0,
                  minWidth: "100%",
                  background: "transparent",
                  padding: "1rem",
                  fontSize: "0.75rem",
                }}
                showLineNumbers
                wrapLongLines={false}
              >
                {analysis.code || "No code snapshot available."}
              </SyntaxHighlighter>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Detailed Findings</CardTitle>
            <CardDescription>
              Ordered by severity then location, following CLI-style issue
              prioritization.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {sortedIssues.length ? (
              sortedIssues.map((issue, index) => (
                <article
                  key={issue.id || `${issue.title}-${index}`}
                  className="rounded-none border p-4 text-sm"
                >
                  <p className="font-medium">
                    {index + 1}. [
                    {String(issue.type || "unknown").toUpperCase()}]{" "}
                    {issue.title || "Bad Practice"}
                  </p>
                  {typeof issue.line === "number" ? (
                    <p className="text-xs text-muted-foreground">
                      Location: line {issue.line}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Location: unknown
                    </p>
                  )}
                  {issue.functionName ? (
                    <p className="text-xs text-muted-foreground">
                      Function: {issue.functionName}()
                    </p>
                  ) : null}
                  {issue.functionLines ? (
                    <p className="text-xs text-muted-foreground">
                      Lines: {issue.functionLines}
                    </p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    Violated principle: {getViolatedPrinciple(issue)}
                  </p>
                  <p className="mt-2 text-xs">
                    Advice:{" "}
                    {issue.suggestion ||
                      issue.advice ||
                      "Review this finding and apply the appropriate refactor."}
                  </p>
                </article>
              ))
            ) : (
              <p className="rounded-none border border-dashed p-4 text-sm text-muted-foreground">
                No issues found in this analysis.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

async function findClassroomNameForStudent(
  classrooms: Classroom[],
  userId: string,
) {
  for (const classroom of classrooms) {
    const students = await getClassroomStudents(classroom.$id);
    const hasStudent = students.some((student) => student.$id === userId);
    if (hasStudent) {
      return classroom.name;
    }
  }

  return "";
}

function formatDateTime(value: string) {
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(timestamp);
}

function getViolatedPrinciple(issue: AnalysisIssue) {
  if (issue.principle) {
    return issue.principle;
  }

  return ISSUE_PRINCIPLE_BY_TITLE[issue.title || ""] || "Law of Demeter";
}

function getLanguageFromAnalysis(analysis: AnalysisDetail) {
  const normalizedFileType = String(analysis.fileType || "").toLowerCase();

  if (normalizedFileType === "js" || normalizedFileType === "javascript") {
    return "javascript";
  }

  if (normalizedFileType === "py" || normalizedFileType === "python") {
    return "python";
  }

  if (normalizedFileType === "cs" || normalizedFileType === "csharp") {
    return "csharp";
  }

  const extension = analysis.fileName.split(".").pop()?.toLowerCase();

  if (extension === "js") {
    return "javascript";
  }

  if (extension === "py") {
    return "python";
  }

  if (extension === "cs") {
    return "csharp";
  }

  return "unknown";
}

function getPenaltyByTitle(language: string) {
  const table: Record<string, number> = {};

  for (const issue of BASE_ISSUE_PENALTIES) {
    table[issue.title] = issue.penalty;
  }

  for (const issue of LANGUAGE_ISSUE_PENALTIES[language] || []) {
    table[issue.title] = issue.penalty;
  }

  return table;
}

function getIssuePenalty(
  issue: AnalysisIssue,
  penaltyByTitle: Record<string, number>,
) {
  if (issue.title && penaltyByTitle[issue.title] != null) {
    return penaltyByTitle[issue.title];
  }

  const normalizedType = String(issue.type || "").toLowerCase();
  if (DEFAULT_PENALTY_BY_TYPE[normalizedType] != null) {
    return DEFAULT_PENALTY_BY_TYPE[normalizedType];
  }

  return DEFAULT_FALLBACK_PENALTY;
}

function calculateScoreFromIssues(
  issues: AnalysisIssue[],
  penaltyByTitle: Record<string, number>,
) {
  const countsByTitle = new Map<string, number>();
  const resolvedPenaltyByTitle = new Map<string, number>();

  for (const issue of issues) {
    const title = issue.title || "Other";
    countsByTitle.set(title, (countsByTitle.get(title) || 0) + 1);

    if (!resolvedPenaltyByTitle.has(title)) {
      resolvedPenaltyByTitle.set(title, getIssuePenalty(issue, penaltyByTitle));
    }
  }

  let totalPenalty = 0;
  for (const [title, count] of countsByTitle.entries()) {
    const basePenalty =
      resolvedPenaltyByTitle.get(title) || DEFAULT_FALLBACK_PENALTY;
    totalPenalty += basePenalty * (1 + Math.log2(count));
  }

  const score = Math.max(1, 10 - totalPenalty);
  return Math.floor(score);
}

function buildScoreBar(score: number) {
  const filled = Math.max(0, Math.min(10, Math.floor(score)));
  return `[${"#".repeat(filled)}${"-".repeat(10 - filled)}]`;
}

export default StudentAnalysisShow;
