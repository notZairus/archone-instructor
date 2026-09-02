import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { getAnalysisById, getClassroomStudents, getUserById } from "@/lib/db";
import { useClassroomContext } from "@/contexts/classroomContext";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  atomOneDark,
  atomOneLight,
} from "react-syntax-highlighter/dist/esm/styles/hljs";
import { useThemeContext } from "@/contexts/use-theme-context";
import { Separator } from "@/components/ui/separator";
import type { Analysis, Issue, Classroom } from "@/types/global";
import {
  TYPE_DISPLAY_ORDER,
  ISSUE_PRINCIPLE_BY_TITLE,
  DEFAULT_PENALTY_BY_TYPE,
  DEFAULT_FALLBACK_PENALTY,
} from "@/constants/configs";
import CircularBar from "@/components/CircularBar";

type LocationState = {
  studentName?: string;
  studentEmail?: string;
  classroomName?: string;
  classroomId?: string;
};

const fileTypes = {
  js: "JavaScript",
  py: "Python",
  cs: "C#",
};

export default function StudentAnalysisShow() {
  const { theme } = useThemeContext();
  const { analysisId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state || {}) as LocationState;
  const { classrooms } = useClassroomContext();

  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [studentName, setStudentName] = useState(state.studentName || "");
  const [studentEmail, setStudentEmail] = useState(state.studentEmail || "");
  const [classroomName, setClassroomName] = useState(state.classroomName || "");
  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [selectedLineEnd, setSelectedLineEnd] = useState<number | null>(null);
  const [isFeedbackDialogOpen, setIsFeedbackDialogOpen] = useState(false);
  const [isIssueDialogOpen, setIsIssueDialogOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const codeLines = useMemo(
    () => analysis?.code.split(/\r?\n/) || [],
    [analysis?.code],
  );

  useEffect(() => {
    const fetchAnalysis = async () => {
      if (!analysisId) {
        setError("Missing analysis ID.");
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const detail = (await getAnalysisById(analysisId)) as Analysis | null;

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

  const qualityScore = useMemo(() => {
    if (!analysis) {
      return 1;
    }

    let initialScore = 100;

    if (!sortedIssues.length) {
      return initialScore;
    }

    sortedIssues.forEach((issue) => {
      const type = issue.type;
      const penalty =
        DEFAULT_PENALTY_BY_TYPE[type || "improvement"] ||
        DEFAULT_FALLBACK_PENALTY;
      initialScore -= penalty;
    });

    return Math.max(1, initialScore);
  }, [analysis, sortedIssues]);

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

  const openFeedbackDialog = (startLine: number, endLine = startLine) => {
    setSelectedLine(startLine);
    setSelectedLineEnd(endLine);
    setFeedbackText("");
    setIsFeedbackDialogOpen(true);

    const selectedLines = Array.from(
      { length: endLine - startLine + 1 },
      (_, index) => startLine + index,
    );
    const selectedText = selectedLines
      .map((lineNumber) => `${lineNumber}: ${codeLines[lineNumber - 1] || ""}`)
      .join("\n");

    console.log(
      `[ArcHone] selected lines ${startLine}-${endLine}:\n${selectedText}`,
    );
  };

  const selectedSnippet = useMemo(() => {
    if (selectedLine == null) {
      return "";
    }

    const endLine = selectedLineEnd ?? selectedLine;
    return Array.from(
      { length: endLine - selectedLine + 1 },
      (_, index) => selectedLine + index,
    )
      .map((lineNumber) => `${codeLines[lineNumber - 1] || ""}`)
      .join("\n");
  }, [codeLines, selectedLine, selectedLineEnd]);

  const handleCodeSelectionMouseUp = (event: MouseEvent<HTMLDivElement>) => {
    const selection = window.getSelection();

    if (!selection || selection.isCollapsed) {
      const target = event.target;

      if (!(target instanceof HTMLElement)) {
        return;
      }

      const lineElement = target.closest("[data-line-number]");
      const lineNumber = lineElement?.getAttribute("data-line-number");

      if (!lineNumber) {
        return;
      }

      const parsedLineNumber = Number(lineNumber);
      if (!Number.isFinite(parsedLineNumber)) {
        return;
      }

      openFeedbackDialog(parsedLineNumber);
      return;
    }

    const selectedLines = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>("[data-line-number]"),
    )
      .filter((lineElement) => {
        const range = selection.getRangeAt(0);

        try {
          return range.intersectsNode(lineElement);
        } catch {
          return false;
        }
      })
      .map((lineElement) => Number(lineElement.dataset.lineNumber))
      .filter((lineNumber) => Number.isFinite(lineNumber));

    if (!selectedLines.length) {
      return;
    }

    const startLine = Math.min(...selectedLines);
    const endLine = Math.max(...selectedLines);
    openFeedbackDialog(startLine, endLine);
  };

  const handleFeedbackSubmit = () => {
    console.clear();
    if (!feedbackText.trim()) {
      return;
    }

    console.log("[ArcHone] instructor feedback", {
      analysisId,
      lineStart: selectedLine,
      lineEnd: selectedLineEnd,
      feedback: feedbackText.trim(),
    });

    console.log(selectedSnippet);

    setIsFeedbackDialogOpen(false);
  };

  const handleSelectIssue = (issue: Issue) => {
    console.log(issue);
    setSelectedIssue(issue);
    setIsIssueDialogOpen(true);
  };

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
    <>
      {/* Dialog for giving feedback */}
      <Dialog
        open={isFeedbackDialogOpen}
        onOpenChange={setIsFeedbackDialogOpen}
      >
        <DialogContent className="bg-card border">
          <DialogHeader>
            <DialogTitle>Code feedback</DialogTitle>
            <DialogDescription>
              Leave a note for line {selectedLine}
              {selectedLineEnd && selectedLineEnd !== selectedLine
                ? ` through ${selectedLineEnd}`
                : ""}
              .
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 px-4 pb-2">
            <div
              className={`rounded-lg border border-border p-3 ${theme === "dark" ? "text-white bg-black" : "text-black bg-white"}`}
            >
              <p className="text-xs font-medium ">Selected code</p>
              <ScrollArea className="h-56">
                <pre
                  className={`mt-2 whitespace-pre-wrap wrap-break-word text-xs leading-5`}
                >
                  <SyntaxHighlighter
                    language={syntaxLanguage}
                    style={theme === "dark" ? atomOneDark : atomOneLight}
                    customStyle={{
                      margin: 0,
                      minWidth: "100%",
                      background: "transparent",
                      padding: "1rem",
                      fontSize: "0.75rem",
                    }}
                    wrapLines
                    wrapLongLines={true}
                  >
                    {selectedSnippet || "No code selected."}
                  </SyntaxHighlighter>
                </pre>
              </ScrollArea>
            </div>
            <Input
              autoFocus
              value={feedbackText}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                setFeedbackText(event.target.value)
              }
              placeholder="Type your feedback here"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsFeedbackDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleFeedbackSubmit}>Sennd Feedback</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog for showing an issue */}
      {selectedIssue && (
        <Dialog open={isIssueDialogOpen} onOpenChange={setIsIssueDialogOpen}>
          <DialogContent className="bg-card border py-12">
            <div className="grid gap-3 px-4  pb-2">
              <div
                className={`rounded-lg border border-border p-3 ${theme === "dark" ? "text-white bg-black" : "text-black bg-white"}`}
              >
                <p className="text-xs font-medium">Code</p>
                <ScrollArea className="h-56 overflow-auto">
                  <div
                    className={`mt-2 whitespace-pre-wrap wrap-break-word text-xs leading-5`}
                  >
                    <SyntaxHighlighter
                      language={syntaxLanguage}
                      style={theme === "dark" ? atomOneDark : atomOneLight}
                      customStyle={{
                        margin: 0,
                        minWidth: "100%",
                        background: "transparent",
                        padding: "1rem",
                        fontSize: "0.75rem",
                      }}
                      wrapLines
                      wrapLongLines={true}
                    >
                      {selectedIssue?.code || "No code selected."}
                    </SyntaxHighlighter>
                  </div>
                </ScrollArea>
              </div>
            </div>
            <div className="px-4 mt-2">
              <DialogTitle className="mb-2">{selectedIssue?.title}</DialogTitle>
              <DialogDescription>
                Type:{" "}
                {(selectedIssue?.type || ("" as string))
                  .slice(0, 1)
                  .toUpperCase() +
                  (selectedIssue?.type || ("" as string)).slice(1)}
                <br />
                Found on line {selectedIssue?.line || "No location specified."}
                <br />
                Violated Principle: {getViolatedPrinciple(selectedIssue)}
                <br />
                {selectedIssue?.functionName
                  ? `Function: ${selectedIssue.functionName}()`
                  : ""}
              </DialogDescription>
              <Separator className="my-4" />
              <div>
                <p className="text-sm text-muted-foreground">Message: </p>
                <p>{selectedIssue.message}</p>
              </div>
              <Separator className="my-4" />
              <div>
                <p className="text-sm text-muted-foreground">
                  Why the issue occured:{" "}
                </p>
                <p>{selectedIssue.why}</p>
              </div>
              <Separator className="my-4" />
              <div>
                <p className="text-sm text-muted-foreground">Suggestion: </p>
                <p>{selectedIssue.suggestion}</p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

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

          <div className="grid gap-6 md:grid-cols-3 items-start">
            <Card>
              <CardHeader>
                <CardTitle>Analysis Detail</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm md:grid-cols-2 items-start">
                <div className="p-2 border bg-card rounded-lg">
                  <p className="text-xs text-muted-foreground">
                    Student Name:{" "}
                  </p>
                  <p>{studentName}</p>
                </div>
                <div className="p-2 border bg-card rounded-lg">
                  <p className="text-xs text-muted-foreground">File: </p>
                  <p className="wrap-break-word">
                    {analysis.fileName.replace("\\", "/").split("/").pop()}
                  </p>
                </div>
                <div className="p-2 border bg-card rounded-lg">
                  <p className="text-xs text-muted-foreground">File type: </p>
                  <p>
                    {fileTypes[analysis.fileType as keyof typeof fileTypes]} (
                    {analysis.fileType})
                  </p>
                </div>
                <div className="p-2 border bg-card rounded-lg">
                  <p className="text-xs text-muted-foreground">
                    Analysis date:{" "}
                  </p>
                  <p>{formatDateTime(analysis.createdAt)}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Analysis Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <div className="w-1/3">
                    <CircularBar score={qualityScore} />
                  </div>
                  <div className="flex-1 flex items-center">
                    {qualityScore >= 75 && (
                      <div>
                        <p className="text-lg font-medium text-green-600">
                          Good Quality
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Your code is of mostly good, but there are some issues
                          to improve.
                        </p>
                      </div>
                    )}
                    {qualityScore < 75 && qualityScore >= 50 && (
                      <div>
                        <p className="text-lg font-medium text-yellow-600">
                          Fair Quality
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Your code is of fair quality, but there are several
                          issues that need to be addressed.
                        </p>
                      </div>
                    )}
                    {qualityScore < 50 && (
                      <div>
                        <p className="text-lg font-medium text-red-600">
                          Poor Quality
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Your code is of poor quality and needs significant
                          improvements.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <Separator className="my-4" />

                <div className="w-full flex gap-4 items-center justify-between">
                  <div
                    className={`flex-1 border h-full rounded-lg p-2 bg-red-500/8`}
                  >
                    <p className="text-center font-semibold opacity-60 text-xs">
                      Warnings
                    </p>
                    <p className="text-center text-lg mt-2 font-semibold opacity-80">
                      {
                        sortedIssues.filter((issue) => issue.type === "warning")
                          .length
                      }
                    </p>
                  </div>
                  <div
                    className={`flex-1 border h-full rounded-lg p-2 bg-yellow-500/8`}
                  >
                    <p className="text-center font-semibold opacity-60 text-xs">
                      Improvements
                    </p>
                    <p className="text-center text-lg mt-2 font-semibold opacity-80">
                      {
                        sortedIssues.filter(
                          (issue) => issue.type === "improvement",
                        ).length
                      }
                    </p>
                  </div>
                  <div
                    className={`flex-1 border h-full rounded-lg p-2 bg-blue-500/8`}
                  >
                    <p className="text-center font-semibold opacity-60 text-xs">
                      Infos
                    </p>
                    <p className="text-center text-lg mt-2 font-semibold opacity-80">
                      {
                        sortedIssues.filter((issue) => issue.type === "info")
                          .length
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Detailed Findings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <ScrollArea className="h-64">
                  <div className="space-y-4">
                    {sortedIssues.length ? (
                      sortedIssues.map((issue, index) => (
                        <div
                          key={issue.id || `${issue.title}-${index}`}
                          className="bg-card border rounded-lg p-4 text-sm cursor-pointer hover:bg-accent transition-colors duration-300"
                          onClick={() => handleSelectIssue(issue)}
                        >
                          <p className="font-medium">
                            {index + 1}. {issue.title || "Bad Practice"}
                          </p>
                          {issue.type && (
                            <p className="text-xs text-muted-foreground mb-2">
                              {issue.type.slice(0, 1).toUpperCase() +
                                issue.type.slice(1).toLowerCase()}
                            </p>
                          )}
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
                        </div>
                      ))
                    ) : (
                      <p className="rounded-none border border-dashed p-4 text-sm text-muted-foreground">
                        No issues found in this analysis.
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Source Code</CardTitle>
              <CardDescription>Code captured at analysis time.</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea
                className={`h-105 rounded-none border ${theme === "dark" ? "bg-black" : "bg-white"}`}
              >
                <div onMouseUp={handleCodeSelectionMouseUp}>
                  <SyntaxHighlighter
                    language={syntaxLanguage}
                    style={theme === "dark" ? atomOneDark : atomOneLight}
                    customStyle={{
                      margin: 0,
                      minWidth: "100%",
                      background: "transparent",
                      padding: "1rem",
                      fontSize: "0.75rem",
                    }}
                    showLineNumbers
                    wrapLines
                    wrapLongLines={false}
                    lineProps={(lineNumber: number) => ({
                      "data-line-number": lineNumber,
                      onClick: () => openFeedbackDialog(lineNumber),
                      onMouseUp: () => openFeedbackDialog(lineNumber),
                      style:
                        selectedLine === lineNumber
                          ? {
                              backgroundColor: "rgba(59, 130, 246, 0.22)",
                              borderLeft: "2px solid rgb(59, 130, 246)",
                              cursor: "pointer",
                              display: "block",
                            }
                          : {
                              cursor: "pointer",
                              display: "block",
                            },
                    })}
                  >
                    {analysis.code || "No code snapshot available."}
                  </SyntaxHighlighter>
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

// HELPERS

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

function getViolatedPrinciple(issue: Issue) {
  if (issue.principle) {
    return issue.principle;
  }

  return (
    ISSUE_PRINCIPLE_BY_TITLE[
      issue.title as keyof typeof ISSUE_PRINCIPLE_BY_TITLE
    ] || "N/A"
  );
}
