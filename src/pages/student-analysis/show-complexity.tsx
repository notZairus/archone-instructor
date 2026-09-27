import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import { Maximize2, MessageSquareText, Minimize2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  getAnalysisById,
  getClassroomStudents,
  getInstructorFeedback,
  getUserById,
} from "@/lib/db";
import { useClassroomContext } from "@/contexts/classroomContext";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  atomOneDark,
  atomOneLight,
} from "react-syntax-highlighter/dist/esm/styles/hljs";
import { useThemeContext } from "@/contexts/use-theme-context";
import { Separator } from "@/components/ui/separator";
import type {
  Complexity,
  ComplexityFunction,
  Feedback,
  Issue,
  Classroom,
} from "@/types/global";
import {
  ISSUE_PRINCIPLE_BY_TITLE,
  COMPLEXITY_CLASSES,
} from "@/constants/configs";
import { useAuthContext } from "@/contexts/authContext";
import { sendFeedback } from "@/lib/db";

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
  const { authUser } = useAuthContext();

  const [analysis, setAnalysis] = useState<Complexity | null>(null);
  const [studentName, setStudentName] = useState(state.studentName || "");
  const [studentEmail, setStudentEmail] = useState(state.studentEmail || "");
  const [classroomName, setClassroomName] = useState(state.classroomName || "");
  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const [selectedFunction, setSelectedFunction] =
    useState<ComplexityFunction | null>(null);
  const [selectedLineEnd, setSelectedLineEnd] = useState<number | null>(null);
  const [isFeedbackDialogOpen, setIsFeedbackDialogOpen] = useState(false);
  const [isFeedbackListOpen, setIsFeedbackListOpen] = useState(false);
  const [analysisFeedback, setAnalysisFeedback] = useState<Feedback[]>([]);
  const [expandedFeedbackIds, setExpandedFeedbackIds] = useState<Set<string>>(
    new Set(),
  );
  const [isFeedbackListLoading, setIsFeedbackListLoading] = useState(false);
  const [feedbackListError, setFeedbackListError] = useState<string | null>(
    null,
  );
  const [isFunctionDialogOpen, setIsFunctionDialogOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const codeLines = useMemo(
    () => analysis?.code.split(/\r?\n/) || [],
    [analysis?.code],
  );

  const analyzedFunctions = useMemo(
    () =>
      [...(analysis?.complexitySummary?.functions || [])].sort(
        (left, right) => left.line - right.line,
      ),
    [analysis?.complexitySummary?.functions],
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
        const detail = (await getAnalysisById(analysisId)) as Complexity | null;

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
      } catch (err) {
        setError("Could not load this analysis right now.");
        console.log(err);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchAnalysis();
  }, [analysisId, classrooms, classroomName, studentEmail, studentName]);

  useEffect(() => {
    if (!analysisId || !analysis?.fileName || !authUser?.$id) {
      return;
    }

    const fetchAnalysisFeedback = async () => {
      setIsFeedbackListLoading(true);
      setFeedbackListError(null);

      try {
        const rows = await getInstructorFeedback({
          instructorId: authUser.$id,
          fileName: analysis.fileName,
        });
        setAnalysisFeedback(
          filterFeedbackByCurrentCode(
            rows as unknown as Feedback[],
            analysis.code,
          ),
        );
      } catch {
        setFeedbackListError("Could not load feedback for this file.");
      } finally {
        setIsFeedbackListLoading(false);
      }
    };

    void fetchAnalysisFeedback();
  }, [analysis?.code, analysis?.fileName, analysisId, authUser?.$id]);

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

  const handleFeedbackSubmit = async () => {
    if (!feedbackText.trim()) {
      return;
    }

    if (!selectedSnippet) {
      return;
    }

    try {
      await sendFeedback({
        analysisId: analysis?.id || "",
        fileName: analysis?.fileName || "",
        instructorId: authUser?.$id || "",
        studentId: analysis?.userId || "",
        message: feedbackText.trim(),
        highlightedCode: selectedSnippet,
      });
    } catch {
      toast.error("Failed to send feedback.");
      return;
    }

    if (authUser?.$id && analysis?.fileName) {
      try {
        const rows = await getInstructorFeedback({
          instructorId: authUser.$id,
          fileName: analysis.fileName,
        });
        setAnalysisFeedback(
          filterFeedbackByCurrentCode(
            rows as unknown as Feedback[],
            analysis.code,
          ),
        );
      } catch {
        // The feedback was sent; the list can refresh on the next open.
      }
    }

    toast.success("Feedback sent successfully.");
    setIsFeedbackDialogOpen(false);
  };

  const handleFunctionSelect = (func: ComplexityFunction) => {
    setSelectedFunction(func);

    setIsFunctionDialogOpen(true);
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
            onClick={() => navigate("/analyses")}
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
            onClick={() => navigate("/analyses")}
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

  const slowestTimeComplexity = getSlowestTimeComplexity(analysis);
  const slowestSpaceComplexity = getSlowestSpaceComplexity(analysis);

  return (
    <>
      <Dialog open={isFeedbackListOpen} onOpenChange={setIsFeedbackListOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Feedback for this file</DialogTitle>
            <DialogDescription>
              Feedback you have given on this file.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] px-4">
            {isFeedbackListLoading ? (
              <div className="space-y-3 pb-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : feedbackListError ? (
              <p className="pb-4 text-sm text-destructive">
                {feedbackListError}
              </p>
            ) : analysisFeedback.length === 0 ? (
              <p className="pb-4 text-sm text-muted-foreground">
                You have not given feedback on this file yet.
              </p>
            ) : (
              <div className="space-y-3 pb-4">
                {analysisFeedback.map((feedback) => (
                  <div
                    key={feedback.$id}
                    className="rounded-lg border bg-card p-3"
                  >
                    <p className="whitespace-pre-wrap text-sm">
                      {feedback.message}
                    </p>
                    <div className="relative mt-3 w-full">
                      <pre
                        className={`${
                          expandedFeedbackIds.has(feedback.$id)
                            ? "max-h-96"
                            : "max-h-32"
                        } w-full overflow-auto rounded-md bg-muted/60 p-3 pr-12 text-xs text-muted-foreground`}
                      >
                        {feedback.highlightedCode}
                      </pre>
                      <button
                        type="button"
                        title={
                          expandedFeedbackIds.has(feedback.$id)
                            ? "Collapse highlighted code"
                            : "Show full highlighted code"
                        }
                        aria-label={
                          expandedFeedbackIds.has(feedback.$id)
                            ? "Collapse highlighted code"
                            : "Show full highlighted code"
                        }
                        onClick={() =>
                          setExpandedFeedbackIds((current) => {
                            const next = new Set(current);
                            if (next.has(feedback.$id)) {
                              next.delete(feedback.$id);
                            } else {
                              next.add(feedback.$id);
                            }
                            return next;
                          })
                        }
                        className="absolute right-2 top-2 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                      >
                        {expandedFeedbackIds.has(feedback.$id) ? (
                          <Minimize2 className="size-4" />
                        ) : (
                          <Maximize2 className="size-4" />
                        )}
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {formatDateTime(feedback.$createdAt || "")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

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
            <div>
              <p className="text-muted-foreground text-xs mb-2">Message: </p>
              <Textarea
                className="h-24 resize-none"
                value={feedbackText}
                onChange={(event) => setFeedbackText(event.target.value)}
                placeholder="Type your feedback here"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsFeedbackDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleFeedbackSubmit}>Send Feedback</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog for showing a function */}
      {selectedFunction && (
        <Dialog
          open={isFunctionDialogOpen}
          onOpenChange={setIsFunctionDialogOpen}
        >
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
                      {selectedFunction?.code || "No code selected."}
                    </SyntaxHighlighter>
                  </div>
                </ScrollArea>
              </div>
            </div>
            <div className="px-4 mt-2">
              <DialogTitle className="mb-2">
                {selectedFunction?.name || "Function"}
              </DialogTitle>
              <DialogDescription>
                Found on line: {selectedFunction?.line}
              </DialogDescription>
              <Separator className="my-4" />
              <div>
                <p className="text-sm text-muted-foreground">
                  Time Complexity:{" "}
                </p>
                <p>{selectedFunction?.time?.estimate}</p>
              </div>
              <Separator className="my-4" />
              <div>
                <p className="text-sm text-muted-foreground">
                  Space Complexity:{" "}
                </p>
                <p>{selectedFunction?.space?.estimate}</p>
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
              onClick={() => navigate("/analyses")}
            >
              Back
            </Button>
            <Button type="button" onClick={() => setIsFeedbackListOpen(true)}>
              <MessageSquareText />
              Feedbacks ({analysisFeedback.length})
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-3 items-start">
            <Card>
              <CardHeader>
                <CardTitle>Analysis Detail</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-2 border bg-card rounded-lg">
                  <p className="text-xs text-muted-foreground">
                    Student Name:{" "}
                  </p>
                  <p>{studentName}</p>
                </div>
                <div className="mt-4 grid gap-2 text-sm md:grid-cols-2 items-start">
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
                      Analysis Mode:{" "}
                    </p>
                    <p>{analysis.mode.toUpperCase()}</p>
                  </div>
                  <div className="p-2 border bg-card rounded-lg">
                    <p className="text-xs text-muted-foreground">
                      Analysis date:{" "}
                    </p>
                    <p>{formatDateTime(analysis.createdAt)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Complexity Summary</CardTitle>
              </CardHeader>
              <Separator />
              <CardContent>
                <div className="flex-1">
                  <p className="text-muted-foreground">Time Complexity:</p>
                  <div className="w-full mt-4 flex items-center justify-between gap-8">
                    <div className="w-1/6 aspect-square rounded-full bg-accent flex items-center justify-center">
                      <p className="text-center text-lg font-bold text-foreground">
                        {slowestTimeComplexity?.notation}
                      </p>
                    </div>
                    <div className="flex-1">
                      <p className="text-lg">
                        {slowestTimeComplexity?.name} Complexity
                      </p>
                    </div>
                  </div>
                </div>
                <Separator className="my-2" />
                <div className="flex-1">
                  <p className="text-muted-foreground">Space Complexity:</p>
                  <div className="w-full mt-4 flex items-center justify-between gap-8">
                    <div className="w-1/6 aspect-square rounded-full bg-accent flex items-center justify-center">
                      <p className="text-center text-lg font-bold text-foreground">
                        {slowestSpaceComplexity?.notation}
                      </p>
                    </div>
                    <div className="flex-1">
                      <p className="text-lg">
                        {slowestSpaceComplexity?.name} Complexity
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Analyzed Functions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <ScrollArea className="h-55 pr-3">
                  <div className="space-y-3">
                    {analyzedFunctions.length ? (
                      analyzedFunctions.map((func, index) => (
                        <FunctionComplexityCard
                          key={`${func.name}-${func.line}-${index}`}
                          func={func}
                          onSelect={() => handleFunctionSelect(func)}
                        />
                      ))
                    ) : (
                      <p className="rounded-none border border-dashed p-4 text-sm text-muted-foreground">
                        No functions found in this analysis.
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
                        selectedLine !== null &&
                        lineNumber >= selectedLine &&
                        lineNumber <= (selectedLineEnd ?? selectedLine)
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

function FunctionComplexityCard({
  func,
  onSelect,
}: {
  func: ComplexityFunction;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className="w-full rounded-lg border bg-card p-3 text-left transition-colors hover:bg-accent"
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 truncate text-sm font-medium" title={func.name}>
          {func.name}
        </p>
        <span className="shrink-0 text-xs text-muted-foreground">
          Line {func.line}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <ComplexityMetric label="Time" value={func.time?.class} />
        <ComplexityMetric label="Space" value={func.space?.class} />
      </div>
    </button>
  );
}

function ComplexityMetric({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-md border bg-background px-2 py-1.5">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-xs font-medium">{value || "Not available"}</p>
    </div>
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

function filterFeedbackByCurrentCode(
  feedback: Feedback[],
  analysisCode: string,
) {
  return feedback.filter(
    (item) =>
      Boolean(item.highlightedCode) &&
      analysisCode.includes(item.highlightedCode),
  );
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

function getTimeComplexityClasses(analysis: Complexity) {
  return (
    analysis?.complexitySummary?.functions?.map((func) => func.time?.class) ||
    []
  ).filter((cls) => cls !== undefined) as string[];
}

function getSpaceComplexityClasses(analysis: Complexity) {
  return (
    analysis?.complexitySummary?.functions?.map((func) => func.space?.class) ||
    []
  ).filter((cls) => cls !== undefined) as string[];
}

function getSlowestTimeComplexity(analysis: Complexity) {
  const timeComplexityClasses = new Set(getTimeComplexityClasses(analysis));
  const arr = new Array(...timeComplexityClasses)
    .sort((a, b) => {
      const classA = COMPLEXITY_CLASSES.find(
        (cls) => cls.name.toLowerCase() === a.toLowerCase(),
      ) as { name: string; rank: number };
      const classB = COMPLEXITY_CLASSES.find(
        (cls) => cls.name.toLowerCase() === b.toLowerCase(),
      ) as { name: string; rank: number };

      return classA?.rank - classB?.rank;
    })
    .pop();

  return (
    COMPLEXITY_CLASSES.find(
      (cls) => cls.name.toLowerCase() === arr?.toLowerCase(),
    ) || null
  );
}

function getSlowestSpaceComplexity(analysis: Complexity) {
  const spaceComplexityClasses = new Set(getSpaceComplexityClasses(analysis));
  const arr = new Array(...spaceComplexityClasses)
    .sort((a, b) => {
      const classA = COMPLEXITY_CLASSES.find(
        (cls) => cls.name.toLowerCase() === a.toLowerCase(),
      ) as { name: string; rank: number };
      const classB = COMPLEXITY_CLASSES.find(
        (cls) => cls.name.toLowerCase() === b.toLowerCase(),
      ) as { name: string; rank: number };

      return classA?.rank - classB?.rank;
    })
    .pop();

  return (
    COMPLEXITY_CLASSES.find(
      (cls) => cls.name.toLowerCase() === arr?.toLowerCase(),
    ) || null
  );
}
