import { Link, useParams } from "react-router";
import { useClassroomContext } from "@/contexts/classroomContext";
import { ClassEditDialog } from "@/components/ClassEditDialog";
import { DeleteClassDialog } from "@/components/DeleteClassDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  acceptClassroomStudent,
  declineClassroomStudent,
  getClassroomStudents,
  getUserAnalyses,
  getUserAnalysesWithoutComplexity,
} from "@/lib/db";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import {
  ADVICE_BY_ISSUE_TITLE,
  VIDEO_LINK_BY_ISSUE_TITLE,
} from "../../constants/configs";

import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Pie,
  PieChart,
} from "recharts";
import type { Classroom, Student } from "@/types/global";
import {
  AlertTriangle,
  BarChart3,
  FileText,
  RefreshCw,
  Folders,
  MoreHorizontal,
  Users,
} from "lucide-react";

const ClassroomShow = () => {
  const { id } = useParams();
  const { classrooms, setClassrooms } = useClassroomContext();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [classStats, setClassStats] = useState<StudentAnalytics | null>(null);
  const [classStatsLoading, setClassStatsLoading] = useState(false);
  const [classStatsError, setClassStatsError] = useState<string | null>(null);
  const [studentStats, setStudentStats] = useState<
    Record<string, StudentAnalytics | null>
  >({});
  const [studentStatsLoading, setStudentStatsLoading] = useState<
    Record<string, boolean>
  >({});
  const [studentStatsError, setStudentStatsError] = useState<
    Record<string, string | null>
  >({});
  const [needsAttention, setNeedsAttention] = useState<StudentRiskEntry[]>([]);
  const [needsAttentionLoading, setNeedsAttentionLoading] = useState(false);
  const [needsAttentionError, setNeedsAttentionError] = useState<string | null>(
    null,
  );
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);

  const classroom = classrooms.find((c) => c.$id === id);

  const fetchStudents = useCallback(async () => {
    if (!id) return [] as Student[];
    const result = await getClassroomStudents(id);
    setStudents(result);
    return result;
  }, [id]);

  useEffect(() => {
    void fetchStudents();

    const pollInterval = setInterval(() => {
      void fetchStudents();
    }, 10000);

    return () => {
      clearInterval(pollInterval);
    };
  }, [fetchStudents]);

  const acceptedStudents = useMemo(
    () => students.filter((student) => student.accepted),
    [students],
  );

  const pendingStudents = useMemo(
    () => students.filter((student) => !student.accepted),
    [students],
  );

  const acceptedStudentIdsKey = useMemo(
    () =>
      acceptedStudents
        .map((student) => student.$id)
        .sort()
        .join("|"),
    [acceptedStudents],
  );

  const acceptedStudentsById = useMemo(
    () => new Map(acceptedStudents.map((student) => [student.$id, student])),
    [acceptedStudents],
  );

  const refreshClassStatsByIds = useCallback(
    async (acceptedStudentIds: string[]) => {
      if (!acceptedStudentIds.length) {
        setClassStats(null);
        setClassStatsError(null);
        setClassStatsLoading(false);
        return;
      }

      setClassStatsLoading(true);
      setClassStatsError(null);

      try {
        const analysesByStudent = await Promise.all(
          acceptedStudentIds.map(
            async (studentId) =>
              await getUserAnalysesWithoutComplexity(studentId),
          ),
        );

        const combinedAnalyses = analysesByStudent.flat() as AnalysisRecord[];
        const analytics = buildStudentAnalytics(combinedAnalyses);

        setClassStats(analytics);
      } catch {
        setClassStatsError("Could not load class stats right now.");
        throw new Error("class-stats-refresh-failed");
      } finally {
        setClassStatsLoading(false);
      }
    },
    [],
  );

  const fetchClassStats = useCallback(async () => {
    const acceptedStudentIds = acceptedStudentIdsKey
      ? acceptedStudentIdsKey.split("|")
      : [];

    await refreshClassStatsByIds(acceptedStudentIds);
  }, [acceptedStudentIdsKey, refreshClassStatsByIds]);

  useEffect(() => {
    void fetchClassStats();
  }, [fetchClassStats]);

  const refreshNeedsAttentionByIds = useCallback(
    async (acceptedStudentIds: string[]) => {
      if (!acceptedStudentIds.length) {
        setNeedsAttention([]);
        setNeedsAttentionError(null);
        setNeedsAttentionLoading(false);
        return;
      }

      setNeedsAttentionLoading(true);
      setNeedsAttentionError(null);

      try {
        const riskyStudents = await Promise.all(
          acceptedStudentIds.map(async (studentId) => {
            const analyses = await getUserAnalyses(studentId);
            const analytics = buildStudentAnalytics(
              analyses as AnalysisRecord[],
            );
            const { riskScore, reasons } = computeStudentRisk(analytics);

            return {
              studentId,
              riskScore,
              reasons,
            } satisfies StudentRiskEntry;
          }),
        );

        const sortedTopRisk = riskyStudents
          .sort(
            (a, b) =>
              b.riskScore - a.riskScore ||
              a.studentId.localeCompare(b.studentId),
          )
          .slice(0, 5);

        setNeedsAttention(sortedTopRisk);
      } catch {
        setNeedsAttentionError("Could not evaluate risk levels right now.");
        setNeedsAttention([]);
      } finally {
        setNeedsAttentionLoading(false);
      }
    },
    [],
  );

  const fetchNeedsAttention = useCallback(async () => {
    const acceptedStudentIds = acceptedStudentIdsKey
      ? acceptedStudentIdsKey.split("|")
      : [];

    await refreshNeedsAttentionByIds(acceptedStudentIds);
  }, [acceptedStudentIdsKey, refreshNeedsAttentionByIds]);

  useEffect(() => {
    void fetchNeedsAttention();
  }, [fetchNeedsAttention]);

  const handleRefreshClassStats = async () => {
    if (!id) return;

    setIsRefreshingAll(true);

    try {
      const latestStudents = await fetchStudents();
      const acceptedStudentIds = latestStudents
        .filter((student) => student.accepted)
        .map((student) => student.$id);

      await Promise.all([
        refreshClassStatsByIds(acceptedStudentIds),
        refreshNeedsAttentionByIds(acceptedStudentIds),
      ]);

      toast.success("Classroom data refreshed");
    } catch {
      toast.error("Could not refresh classroom data");
    } finally {
      setIsRefreshingAll(false);
    }
  };

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

  const handleDeclineStudent = async (studentId: string) => {
    if (!id) return;

    try {
      await declineClassroomStudent(id, studentId);

      setStudents((current) =>
        current.filter((student) => student.$id !== studentId),
      );

      toast.success("Student declined");
    } catch {
      toast.error("Could not decline student");
    }
  };

  const handleStatsSheetOpen = async (student: Student, open: boolean) => {
    if (!open) return;

    if (studentStatsLoading[student.$id]) {
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

  const renderStudentStatsTrigger = (student: Student) => {
    return (
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
          className="h-[90vh] overflow-hidden"
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <SheetHeader className="border-b pr-14">
            <SheetTitle>{student.name}</SheetTitle>
            <SheetDescription>Stats summary for this student.</SheetDescription>
          </SheetHeader>

          <ScrollArea className="h-[calc(90vh-80px)]">
            <div className="space-y-4 px-24 py-4">
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
                <StudentStatsView stats={studentStats[student.$id]} />
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
    );
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

  const chartConfig: any = {
    percentage: {
      label: "Percentage",
    },
  };

  const chartData: any[] = [];
  const displayedTopIssues = classStats
    ? aggregateOtherIssues(classStats.topIssueTitles)
    : [];

  displayedTopIssues.forEach((issue, index) => {
    chartConfig[issue.title as string] = {
      label: issue.title,
      color: `var(--chart-${index + 1})`,
    };

    chartData.push({
      issue: issue.title,
      percentage: issue.percent,
      fill: `var(--chart-${index + 1})`,
    });
  });

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-5 border-b pb-6 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <BarChart3 className="size-4" />
              <span>Classroom Overview</span>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
              {classroom.name}
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              {classroom.description}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="lg">
              <Link to={`/classes/${classroom.$id}/folders`}>
                <Folders />
                Show Folders
              </Link>
            </Button>
            <Button asChild size="lg">
              <Link to={`/classes/${classroom.$id}/analyses`}>
                <FileText />
                Show Analyses
              </Link>
            </Button>
            <div className="pl-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    size="icon-lg"
                    variant="outline"
                    aria-label="Classroom actions"
                  >
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onSelect={() => {
                      setIsEditDialogOpen(true);
                    }}
                  >
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => setIsDeleteDialogOpen(true)}
                  >
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <ClassEditDialog
          classroom={classroom}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onSaved={(updatedClassroom: Classroom) => {
            setClassrooms((current) =>
              current.map((currentClassroom) =>
                currentClassroom.$id === updatedClassroom.$id
                  ? updatedClassroom
                  : currentClassroom,
              ),
            );
          }}
        />
        <DeleteClassDialog
          classroom={classroom}
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          onDeleted={(classroomId) => {
            setClassrooms((current) =>
              current.filter(
                (currentClassroom) => currentClassroom.$id !== classroomId,
              ),
            );
          }}
        />

        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-muted/20 pb-5">
            <CardTitle className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                <BarChart3 className="size-5 text-primary" />
                Class Performance Overview
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={
                  classStatsLoading || needsAttentionLoading || isRefreshingAll
                }
                onClick={() => void handleRefreshClassStats()}
              >
                <RefreshCw className={isRefreshingAll ? "animate-spin" : ""} />
                {isRefreshingAll ? "Refreshing..." : "Refresh"}
              </Button>
            </CardTitle>
            <CardDescription>
              Combined stats from all accepted students in this classroom.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {classStatsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : classStatsError ? (
              <p className="text-sm text-destructive">{classStatsError}</p>
            ) : classStats ? (
              <>
                <Card className="border-dashed">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="size-5 text-amber-500" />
                      Frequently Encountered Issues
                    </CardTitle>
                    <CardDescription>
                      Most common issue patterns across all accepted students of
                      this classroom.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="md:col-span-2">
                      <CardContent className="max-h-80">
                        <ChartContainer
                          config={chartConfig satisfies ChartConfig}
                          className="mx-auto aspect-square h-full"
                        >
                          <PieChart>
                            <ChartTooltip
                              cursor={false}
                              content={<ChartTooltipContent hideLabel />}
                            />
                            <Pie
                              data={chartData}
                              dataKey="percentage"
                              nameKey="issue"
                            />
                            <ChartLegend
                              content={<ChartLegendContent nameKey="issue" />}
                              className=" flex-wrap gap-2 hidden md:flex"
                            />
                          </PieChart>
                        </ChartContainer>
                      </CardContent>
                    </Card>
                    <Card className="md:col-span-1 border-none">
                      <CardContent className=" border-0">
                        {displayedTopIssues.length ? (
                          <div className="space-y-2">
                            {displayedTopIssues.map((issue, index) => (
                              <div
                                key={issue.title}
                                className="flex items-start justify-between gap-4"
                              >
                                <span>
                                  <span className="block">
                                    {index + 1}. {issue.title}
                                  </span>
                                  {issue.description && (
                                    <span className="mt-1 block text-sm text-muted-foreground">
                                      {issue.description}
                                    </span>
                                  )}
                                </span>
                                <span className="font-medium">
                                  {issue.percent.toFixed(2)}%
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            No recurring issue patterns yet.
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </CardContent>
                </Card>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                No accepted students with analyses yet.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-amber-500" />
              Needs Attention
            </CardTitle>
            <CardDescription>
              Top 5 accepted students with the highest risk score.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {needsAttentionLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : needsAttentionError ? (
              <p className="text-sm text-destructive">{needsAttentionError}</p>
            ) : needsAttention.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No accepted students to evaluate.
              </p>
            ) : (
              needsAttention.map((entry) =>
                (() => {
                  const student = acceptedStudentsById.get(entry.studentId);
                  if (!student) {
                    return null;
                  }

                  return (
                    <article
                      key={student.$id}
                      className="rounded-lg border border-primary/50 bg-primary/5 p-4 transition-colors duration-300 hover:bg-accent"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="space-y-1">
                          <h3 className="font-medium">{student.name}</h3>
                          <p className="text-xs text-muted-foreground">
                            Risk score
                          </p>
                          <Badge
                            variant="outline"
                            className="mt-1 border-amber-500/40 text-amber-700 dark:text-amber-300"
                          >
                            {entry.riskScore}/100
                          </Badge>
                          <p className="text-xs text-muted-foreground">
                            {entry.reasons.join(" • ")}
                          </p>
                        </div>

                        {renderStudentStatsTrigger(student)}
                      </div>
                    </article>
                  );
                })(),
              )
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                <Users className="size-5 text-primary" />
                Student List
              </span>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="font-normal">
                  {acceptedStudents.length} students
                </Badge>

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
                            className="flex items-center text-foreground justify-between border p-3"
                          >
                            <div>
                              <p className="font-medium text-foreground">
                                {student.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {student.email}
                              </p>
                            </div>

                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handleDeclineStudent(student.$id)
                                }
                              >
                                Decline
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleAcceptStudent(student.$id)}
                              >
                                Accept
                              </Button>
                            </div>
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
              <article
                key={student.$id}
                className="rounded-lg border p-4 transition-colors duration-300 hover:bg-accent"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="font-medium">{student.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {student.email}
                    </p>
                  </div>

                  {renderStudentStatsTrigger(student)}
                </div>
              </article>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export type AnalysisRecord = {
  createdAt?: string;
  mode?: "general" | "oop";
  issues?: Array<{
    title?: string;
    type?: string;
    line?: number;
    message?: string;
    why?: string;
    suggestion?: string;
  }>;
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
  description: string;
  count: number;
  percent: number;
};

export type StudentAnalytics = {
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
  recommendations: { name: string; advice: string; videoLink?: string }[];
};

type StudentRiskEntry = {
  studentId: string;
  riskScore: number;
  reasons: string[];
};

export const StudentStatsView = ({
  stats,
}: {
  stats: StudentAnalytics | null;
}) => {
  if (!stats) {
    return (
      <Card>
        <CardContent className="p-4 text-sm text-muted-foreground">
          No analyses available for this student yet.
        </CardContent>
      </Card>
    );
  }

  const topIssueChartData = aggregateOtherIssues(stats.topIssueTitles).map(
    (issue) => ({
      issue:
        issue.title.length > 30
          ? `${issue.title.slice(0, 30)}...`
          : issue.title,
      fullIssue: issue.title,
      percent: issue.percent,
    }),
  );

  const studentTopIssuesChartConfig = {
    percent: {
      label: "Percentage",
      color: "#000000",
    },
  } satisfies ChartConfig;

  return (
    <div className="space-y-4 text-base">
      <div className="grid gap-3 md:grid-cols-2 items-start">
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
                  <div
                    key={issue.title}
                    className="flex items-start justify-between gap-4"
                  >
                    <span>
                      <span className="block font-bold text-[1.02rem]">
                        {index + 1}. {issue.title}
                      </span>
                      {issue.description && (
                        <span className="mt-1 block text-sm text-muted-foreground">
                          {issue.description}
                        </span>
                      )}
                    </span>
                    <span className="font-medium">
                      {issue.percent.toFixed(2)}%
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-base text-muted-foreground">
                No recurring issues found.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recommendations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <ScrollArea className="h-80">
              <div className="space-y-2">
                {stats.recommendations.map((recommendation) => (
                  <div
                    key={recommendation.name}
                    className="border bg-card p-4 rounded-md flex gap-4 "
                  >
                    <p className="w-48 text-[1.05rem]">{recommendation.name}</p>
                    <p className="text-[1.05rem] flex-1">
                      {recommendation.advice}
                    </p>

                    <a
                      className="w-16 text-right text-primary hover:underline cursor-pointer"
                      target="_blank"
                      href={recommendation.videoLink}
                    >
                      Watch
                    </a>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <Separator />

      <div className="grid gap-3 md:grid-cols-2 items-start ">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Top Issues Chart</CardTitle>
            <CardDescription>
              Highest-frequency issue patterns by percentage.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            {topIssueChartData.length ? (
              <ChartContainer config={studentTopIssuesChartConfig}>
                <BarChart
                  data={topIssueChartData}
                  margin={{ top: 8, right: 12, left: 12, bottom: 8 }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="issue" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} width={28} />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(_, __, item) => [
                          `${item.payload.percent.toFixed(2)}%`,
                        ]}
                      />
                    }
                  />
                  <Bar dataKey="percent" fill="#f56565" radius={0} />
                </BarChart>
              </ChartContainer>
            ) : (
              <p className="text-base text-muted-foreground">
                No top issue data available for charting.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export function buildStudentAnalytics(
  analyses: AnalysisRecord[],
): StudentAnalytics | null {
  if (!analyses.length) {
    return null;
  }

  const issueTypeCounts: Record<string, number> = {};
  const issueTitleCounts: Record<string, number> = {};
  const issueDescriptions: Record<string, string> = {};
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
      issueDescriptions[title] =
        issue.message || issue.why || issue.suggestion || "";
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
    issueDescriptions,
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
    recommendations: buildRecommendations(topIssueTitles) as any,
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
  descriptionsMap: Record<string, string> = {},
  limit = Infinity,
): TopIssue[] {
  return Object.entries(countsMap)
    .map(([title, count]) => ({
      title,
      description: descriptionsMap[title] || "",
      count,
      percent: totalCount > 0 ? (count / totalCount) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count || a.title.localeCompare(b.title))
    .slice(0, limit);
}

function aggregateOtherIssues(issues: TopIssue[], limit = 5): TopIssue[] {
  if (issues.length <= limit) {
    return issues;
  }

  const topIssues = issues.slice(0, limit);
  const otherIssues = issues.slice(limit);

  return [
    ...topIssues,
    {
      title: "Other Issues",
      description: "Other recurring issues found in the submissions.",
      count: otherIssues.reduce((sum, issue) => sum + issue.count, 0),
      percent: otherIssues.reduce((sum, issue) => sum + issue.percent, 0),
    },
  ];
}

function buildInsights(trend: TrendSummary) {
  const insights: string[] = [];

  // if (trend.hasEnoughData && trend.direction === "improving") {
  //   insights.push("Fewer issues in recent submissions.");
  // } else if (trend.hasEnoughData && trend.direction === "declining") {
  //   insights.push("Issue density increased in recent submissions.");
  // } else {
  //   insights.push("Need more weekly history to compute a trend.");
  // }

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
  const recommendations = topIssueTitles.map((issue) => ({
    name: issue.title,
    advice:
      ADVICE_BY_ISSUE_TITLE[
        issue.title as keyof typeof ADVICE_BY_ISSUE_TITLE
      ] || "No specific advice available.",
    videoLink:
      VIDEO_LINK_BY_ISSUE_TITLE[
        issue.title as keyof typeof VIDEO_LINK_BY_ISSUE_TITLE
      ] || "No video link available.",
  }));

  if (!recommendations.length) {
    return ["Keep the current pace and maintain consistency."];
  }

  return recommendations;
}

function computeStudentRisk(analytics: StudentAnalytics | null): {
  riskScore: number;
  reasons: string[];
} {
  let riskScore = 0;
  const reasons: string[] = [];

  if (!analytics) {
    riskScore += 30;
    reasons.push("No analyses yet");

    return {
      riskScore: clamp(riskScore, 0, 100),
      reasons: reasons.slice(0, 2),
    };
  }

  if (analytics.trend.direction === "declining") {
    riskScore += 25;
    reasons.push("Declining trend");
  }

  if (analytics.qualityScore < 60) {
    riskScore += 25;
    reasons.push("Low quality score");
  } else if (analytics.qualityScore < 75) {
    riskScore += 10;
    reasons.push("Moderate quality score");
  }

  const issueDensity =
    analytics.totalIssues / Math.max(1, analytics.estimatedTotalLines);
  if (issueDensity > 0.08) {
    riskScore += 20;
    reasons.push("High issue density");
  } else if (issueDensity > 0.04) {
    riskScore += 10;
    reasons.push("Moderate issue density");
  }

  const finalReasons = reasons.length ? reasons.slice(0, 2) : ["Monitor"];

  return {
    riskScore: clamp(riskScore, 0, 100),
    reasons: finalReasons,
  };
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export default ClassroomShow;
