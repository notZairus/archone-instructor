import { useParams } from "react-router";
import { useClassroomContext } from "@/contexts/classroomContext";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useEffect, useState } from "react";
import {
  acceptClassroomStudent,
  getClassroomStudents,
  getUserAnalyses,
} from "@/lib/db";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";

const ClassroomShow = () => {
  const { id } = useParams();
  const { classrooms } = useClassroomContext();
  const [students, setStudents] = useState<Student[]>([]);
  const [studentStats, setStudentStats] = useState<
    Record<string, StudentAnalytics | null>
  >({});
  const [studentStatsLoading, setStudentStatsLoading] = useState<
    Record<string, boolean>
  >({});
  const [studentStatsError, setStudentStatsError] = useState<
    Record<string, string | null>
  >({});

  const classroom = classrooms.find((c) => c.$id === id);

  useEffect(() => {
    const fetchStudents = async () => {
      if (!id) return;
      const result = await getClassroomStudents(id);
      setStudents(result);
    };

    fetchStudents();

    const pollInterval = setInterval(() => {
      fetchStudents();
    }, 10000);

    return () => {
      clearInterval(pollInterval);
    };
  }, [id]);

  const acceptedStudents = students.filter((s) => s.accepted);
  const pendingStudents = students.filter((s) => !s.accepted);

  const handleAcceptStudent = async (studentId: string) => {
    if (!id) return;

    try {
      await acceptClassroomStudent(id, studentId);

      setStudents((current) =>
        current.map((student) =>
          student.$id === studentId ? { ...student, accepted: true } : student,
        ),
      );

      toast.success("Student accepted");
    } catch {
      toast.error("Could not accept student");
    }
  };

  const handleStatsSheetOpen = async (student: Student, open: boolean) => {
    if (!open) return;

    if (
      studentStats[student.$id] !== undefined ||
      studentStatsLoading[student.$id]
    ) {
      return;
    }

    setStudentStatsLoading((current) => ({ ...current, [student.$id]: true }));
    setStudentStatsError((current) => ({ ...current, [student.$id]: null }));

    try {
      const analyses = await getUserAnalyses(student.$id);
      const analytics = buildStudentAnalytics(analyses as AnalysisRecord[]);

      setStudentStats((current) => ({
        ...current,
        [student.$id]: analytics,
      }));
    } catch {
      setStudentStatsError((current) => ({
        ...current,
        [student.$id]: "Could not load student stats right now.",
      }));
      toast.error(`Could not load stats for ${student.name}`);
    } finally {
      setStudentStatsLoading((current) => ({
        ...current,
        [student.$id]: false,
      }));
    }
  };

  if (!classroom) {
    return (
      <div className="min-h-screen bg-background p-6 md:p-10">
        <div className="mx-auto w-full max-w-5xl">
          <Card>
            <CardHeader>
              <CardTitle>Classroom not found</CardTitle>
              <CardDescription>
                We could not find the classroom you are trying to view.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="grid gap-4 md:grid-cols-[1fr_auto] md:items-start">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              {classroom.name}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {classroom.description}
            </p>
          </div>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <p>Student List</p>
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">
                  {acceptedStudents.length} students
                </p>

                <Sheet>
                  <SheetTrigger asChild>
                    <Button size="sm" variant="outline">
                      Waiting ({pendingStudents.length})
                    </Button>
                  </SheetTrigger>
                  <SheetContent>
                    <SheetHeader>
                      <SheetTitle>Waiting for approval</SheetTitle>
                      <SheetDescription>
                        Students who joined but are not yet accepted.
                      </SheetDescription>
                    </SheetHeader>

                    <div className="space-y-3 p-4">
                      {pendingStudents.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No pending students.
                        </p>
                      ) : (
                        pendingStudents.map((student) => (
                          <article
                            key={student.$id}
                            className="flex items-center justify-between border p-3"
                          >
                            <div>
                              <p className="font-medium">{student.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {student.email}
                              </p>
                            </div>

                            <Button
                              size="sm"
                              onClick={() => handleAcceptStudent(student.$id)}
                            >
                              Accept
                            </Button>
                          </article>
                        ))
                      )}
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </CardTitle>
            <CardDescription>
              Student data. Open each profile to view performance stats.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {acceptedStudents.map((student) => (
              <article key={student.$id} className="border p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="font-medium">{student.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {student.email}
                    </p>
                  </div>

                  <Sheet
                    onOpenChange={(open) => {
                      void handleStatsSheetOpen(student, open);
                    }}
                  >
                    <SheetTrigger asChild>
                      <Button size="sm">Show Stats</Button>
                    </SheetTrigger>
                    <SheetContent
                      side="bottom"
                      className="h-[85vh] overflow-hidden"
                      onOpenAutoFocus={(event) => event.preventDefault()}
                    >
                      <SheetHeader className="border-b pr-14">
                        <SheetTitle>{student.name}</SheetTitle>
                        <SheetDescription>
                          Stats summary for this student.
                        </SheetDescription>
                      </SheetHeader>

                      <ScrollArea className="h-[calc(85vh-80px)]">
                        <div className="space-y-4 p-4 pr-6">
                          {studentStatsLoading[student.$id] ? (
                            <div className="space-y-3">
                              <Skeleton className="h-20 w-full" />
                              <Skeleton className="h-24 w-full" />
                              <Skeleton className="h-28 w-full" />
                            </div>
                          ) : studentStatsError[student.$id] ? (
                            <Card>
                              <CardContent className="p-4 text-sm text-destructive">
                                {studentStatsError[student.$id]}
                              </CardContent>
                            </Card>
                          ) : studentStats[student.$id] ? (
                            <StudentStatsView
                              stats={studentStats[student.$id]}
                            />
                          ) : (
                            <Card>
                              <CardContent className="p-4 text-sm text-muted-foreground">
                                No analyses available for this student yet.
                              </CardContent>
                            </Card>
                          )}
                        </div>
                      </ScrollArea>
                    </SheetContent>
                  </Sheet>
                </div>
              </article>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

type AnalysisRecord = {
  createdAt?: string;
  issues?: Array<{ title?: string; type?: string; line?: number }>;
  functions?: Array<{
    complexity?: number;
    maxNesting?: number;
    lines?: number;
    line?: number;
  }>;
  variables?: Array<{ line?: number }>;
  comments?: Array<{ line?: number }>;
};

type TrendSummary = {
  direction: "improving" | "declining" | "stable";
  percent: number;
  hasEnoughData: boolean;
  recent: Array<{ avgNesting: number }>;
  previous: Array<{ avgNesting: number }>;
};

type TopIssue = {
  title: string;
  count: number;
  percent: number;
};

type StudentAnalytics = {
  qualityScore: number;
  totalAnalyses: number;
  totalIssues: number;
  warnings: number;
  improvements: number;
  infos: number;
  estimatedTotalLines: number;
  trend: TrendSummary;
  topIssueTitles: TopIssue[];
  insights: string[];
  recommendations: string[];
};

const StudentStatsView = ({ stats }: { stats: StudentAnalytics | null }) => {
  if (!stats) {
    return (
      <Card>
        <CardContent className="p-4 text-sm text-muted-foreground">
          No analyses available for this student yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 text-sm">
      <div className="grid gap-3 md:grid-cols-3">
        <Card size="sm">
          <CardContent className="space-y-1 p-3">
            <p className="text-xs text-muted-foreground">Code Quality Score</p>
            <p className="text-xl font-semibold">{stats.qualityScore} / 100</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="space-y-1 p-3">
            <p className="text-xs text-muted-foreground">Files Analyzed</p>
            <p className="text-xl font-semibold">{stats.totalAnalyses}</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="space-y-1 p-3">
            <p className="text-xs text-muted-foreground">Trend</p>
            <p className="text-base font-semibold">
              {formatTrend(stats.trend)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Issues Overview</CardTitle>
          <CardDescription>
            Severity breakdown from all analyzed student files.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="flex items-center justify-between">
            <span className="text-muted-foreground">Total Issues</span>
            <span className="font-medium">{stats.totalIssues}</span>
          </p>
          <p className="flex items-center justify-between">
            <span className="text-muted-foreground">Warnings</span>
            <span className="font-medium">{stats.warnings}</span>
          </p>
          <p className="flex items-center justify-between">
            <span className="text-muted-foreground">Improvements</span>
            <span className="font-medium">{stats.improvements}</span>
          </p>
          <p className="flex items-center justify-between">
            <span className="text-muted-foreground">Info</span>
            <span className="font-medium">{stats.infos}</span>
          </p>
          <p className="flex items-center justify-between">
            <span className="text-muted-foreground">Estimated Lines</span>
            <span className="font-medium">
              {formatNumber(stats.estimatedTotalLines)}
            </span>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top Issues</CardTitle>
          <CardDescription>
            Most frequent issue patterns found in the student submissions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats.topIssueTitles.length ? (
            <div className="space-y-2">
              {stats.topIssueTitles.map((issue, index) => (
                <p
                  key={issue.title}
                  className="flex items-center justify-between"
                >
                  <span>
                    {index + 1}. {issue.title}
                  </span>
                  <span className="font-medium">{issue.percent}%</span>
                </p>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No recurring issues found.
            </p>
          )}
        </CardContent>
      </Card>

      <Separator />

      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Progress Insights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.insights.map((insight) => (
              <p key={insight}>{insight}</p>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recommendations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.recommendations.map((recommendation) => (
              <p key={recommendation}>{recommendation}</p>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

function buildStudentAnalytics(
  analyses: AnalysisRecord[],
): StudentAnalytics | null {
  if (!analyses.length) {
    return null;
  }

  const issueTypeCounts: Record<string, number> = {};
  const issueTitleCounts: Record<string, number> = {};
  const datedAnalyses: Array<{
    createdAt: string;
    issuesCount: number;
    estimatedLines: number;
    avgNesting: number;
  }> = [];

  let totalIssues = 0;
  let estimatedTotalLines = 0;
  let complexityTotal = 0;
  let complexityCount = 0;

  for (const analysis of analyses) {
    const issues = analysis.issues || [];
    const functions = analysis.functions || [];
    const estimatedLines = estimateFileLines(analysis);

    totalIssues += issues.length;
    estimatedTotalLines += estimatedLines;

    for (const issue of issues) {
      const type = issue.type || "unknown";
      const title = issue.title || "Unknown Issue";
      issueTypeCounts[type] = (issueTypeCounts[type] || 0) + 1;
      issueTitleCounts[title] = (issueTitleCounts[title] || 0) + 1;
    }

    for (const fn of functions) {
      complexityTotal += fn.complexity || 0;
      complexityCount += 1;
    }

    datedAnalyses.push({
      createdAt: analysis.createdAt || new Date().toISOString(),
      issuesCount: issues.length,
      estimatedLines,
      avgNesting: average(functions.map((fn) => fn.maxNesting || 0)),
    });
  }

  const warnings = issueTypeCounts.warning || 0;
  const improvements = issueTypeCounts.improvement || 0;
  const infos = issueTypeCounts.info || 0;
  const issueDensity = totalIssues / Math.max(1, estimatedTotalLines);
  const avgComplexity =
    complexityCount > 0 ? complexityTotal / complexityCount : 0;
  const avgNesting = average(
    analyses.flatMap((analysis) =>
      (analysis.functions || []).map((fn) => fn.maxNesting || 0),
    ),
  );

  const trend = computeTrend(datedAnalyses);
  const topIssueTitles = toSortedIssuePercentages(
    issueTitleCounts,
    totalIssues,
    3,
  );

  return {
    qualityScore: computeQualityScore({
      issueDensity,
      avgComplexity,
      avgNesting,
    }),
    totalAnalyses: analyses.length,
    totalIssues,
    warnings,
    improvements,
    infos,
    estimatedTotalLines,
    trend,
    topIssueTitles,
    insights: buildInsights(trend),
    recommendations: buildRecommendations(topIssueTitles),
  };
}

function estimateFileLines(analysis: AnalysisRecord) {
  const comments = analysis.comments || [];
  const issues = analysis.issues || [];
  const variables = analysis.variables || [];
  const functions = analysis.functions || [];

  let maxLine = 0;

  for (const comment of comments) {
    maxLine = Math.max(maxLine, comment.line || 0);
  }

  for (const issue of issues) {
    maxLine = Math.max(maxLine, issue.line || 0);
  }

  for (const variable of variables) {
    maxLine = Math.max(maxLine, variable.line || 0);
  }

  for (const fn of functions) {
    const fnStart = fn.line || 0;
    const fnLength = fn.lines || 0;
    const fnEnd = fnLength > 0 ? fnStart + fnLength - 1 : fnStart;
    maxLine = Math.max(maxLine, fnEnd);
  }

  return maxLine;
}

function computeQualityScore({
  issueDensity,
  avgComplexity,
  avgNesting,
}: {
  issueDensity: number;
  avgComplexity: number;
  avgNesting: number;
}) {
  const densityPenalty = Math.min(60, issueDensity * 350);
  const complexityPenalty = Math.max(0, avgComplexity - 5) * 6;
  const nestingPenalty = Math.max(0, avgNesting - 3) * 8;

  return clamp(
    Math.round(100 - densityPenalty - complexityPenalty - nestingPenalty),
    1,
    100,
  );
}

function computeTrend(
  datedAnalyses: Array<{
    createdAt: string;
    issuesCount: number;
    estimatedLines: number;
    avgNesting: number;
  }>,
): TrendSummary {
  const now = Date.now();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;

  const recent: Array<{
    issuesCount: number;
    estimatedLines: number;
    avgNesting: number;
  }> = [];
  const previous: Array<{
    issuesCount: number;
    estimatedLines: number;
    avgNesting: number;
  }> = [];

  for (const analysis of datedAnalyses) {
    const createdAt = new Date(analysis.createdAt).getTime();
    if (Number.isNaN(createdAt)) continue;

    if (createdAt >= now - sevenDays) {
      recent.push(analysis);
      continue;
    }

    if (createdAt >= now - sevenDays * 2) {
      previous.push(analysis);
    }
  }

  const recentDensity = averageDensity(recent);
  const previousDensity = averageDensity(previous);

  if (!recent.length || !previous.length || previousDensity === 0) {
    return {
      direction: "stable",
      percent: 0,
      hasEnoughData: false,
      recent: recent.map((item) => ({ avgNesting: item.avgNesting })),
      previous: previous.map((item) => ({ avgNesting: item.avgNesting })),
    };
  }

  const improvementPercent = Math.round(
    ((previousDensity - recentDensity) / previousDensity) * 100,
  );

  if (improvementPercent > 0) {
    return {
      direction: "improving",
      percent: improvementPercent,
      hasEnoughData: true,
      recent: recent.map((item) => ({ avgNesting: item.avgNesting })),
      previous: previous.map((item) => ({ avgNesting: item.avgNesting })),
    };
  }

  if (improvementPercent < 0) {
    return {
      direction: "declining",
      percent: Math.abs(improvementPercent),
      hasEnoughData: true,
      recent: recent.map((item) => ({ avgNesting: item.avgNesting })),
      previous: previous.map((item) => ({ avgNesting: item.avgNesting })),
    };
  }

  return {
    direction: "stable",
    percent: 0,
    hasEnoughData: true,
    recent: recent.map((item) => ({ avgNesting: item.avgNesting })),
    previous: previous.map((item) => ({ avgNesting: item.avgNesting })),
  };
}

function averageDensity(
  group: Array<{ issuesCount: number; estimatedLines: number }>,
) {
  if (!group.length) return 0;

  const totalIssues = group.reduce((sum, item) => sum + item.issuesCount, 0);
  const totalLines = group.reduce((sum, item) => sum + item.estimatedLines, 0);

  return totalIssues / Math.max(1, totalLines);
}

function toSortedIssuePercentages(
  countsMap: Record<string, number>,
  totalCount: number,
  limit = Infinity,
): TopIssue[] {
  return Object.entries(countsMap)
    .map(([title, count]) => ({
      title,
      count,
      percent: totalCount > 0 ? Math.round((count / totalCount) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count || a.title.localeCompare(b.title))
    .slice(0, limit);
}

function buildInsights(trend: TrendSummary) {
  const insights: string[] = [];

  if (trend.hasEnoughData && trend.direction === "improving") {
    insights.push("Fewer issues in recent submissions.");
  } else if (trend.hasEnoughData && trend.direction === "declining") {
    insights.push("Issue density increased in recent submissions.");
  } else {
    insights.push("Need more weekly history to compute a trend.");
  }

  const recentNesting = average(trend.recent.map((item) => item.avgNesting));
  const previousNesting = average(
    trend.previous.map((item) => item.avgNesting),
  );

  if (trend.hasEnoughData && recentNesting < previousNesting) {
    insights.push("Nesting depth has slightly improved.");
  } else if (trend.hasEnoughData && recentNesting > previousNesting) {
    insights.push("Nesting depth increased recently.");
  } else {
    insights.push("Nesting depth trend is stable.");
  }

  return insights;
}

function buildRecommendations(topIssueTitles: TopIssue[]) {
  const recommendationsByTitle: Record<string, string> = {
    "Poor Variable Naming": "Use clearer, intention-revealing variable names.",
    "Naming Convention":
      "Apply one naming style consistently across your code.",
    "Use of var": "Replace 'var' with 'const' or 'let'.",
    "Deep Nesting":
      "Refactor nested logic with early returns or helper functions.",
    "Commented-out Code":
      "Remove dead commented code to keep files clean and maintainable.",
    "TODO Comment":
      "Convert TODO comments into tracked tasks and resolve them regularly.",
  };

  const recommendations = topIssueTitles.map(
    (issue) =>
      `${issue.title} (${issue.percent}%): ${
        recommendationsByTitle[issue.title] ||
        "Review this issue pattern and apply the suggested fix consistently."
      }`,
  );

  if (!recommendations.length) {
    return ["Keep the current pace and maintain consistency."];
  }

  return recommendations;
}

function formatTrend(trend: TrendSummary) {
  if (!trend.hasEnoughData) {
    return "Stable (not enough data this week)";
  }

  if (trend.direction === "improving") {
    return `Up Improving (+${trend.percent}% this week)`;
  }

  if (trend.direction === "declining") {
    return `Down Declining (-${trend.percent}% this week)`;
  }

  return "Stable (0% this week)";
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export default ClassroomShow;
