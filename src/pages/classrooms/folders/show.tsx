import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Copy,
  FileCode2,
  Folder,
  FolderOpen,
  History,
  ShieldAlert,
  Users,
} from "lucide-react";
import { compareTwoStrings } from "string-similarity";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useClassroomContext } from "@/contexts/classroomContext";
import {
  getClassroomStudents,
  getFoldersByClassroomId,
  getUserAnalyses,
} from "@/lib/db";
import type { Analysis, ClassroomFolder, Student } from "@/types/global";
import { cleanFileName, normalizeAnalysisForSimilarity } from "@/lib/helpers";
import {
  buildStudentAnalytics,
  StudentStatsView,
  type AnalysisRecord,
  type StudentAnalytics,
} from "@/pages/classrooms/show";

type StudentFolderAnalysis = Student & {
  analyses: Analysis[];
  allAnalyses: Analysis[];
};

type StudentFolderData = StudentFolderAnalysis & {
  allAnalyses: Analysis[];
  latestAnalysis: Analysis | null;
};

type FolderAnalysisRow = {
  student: Student;
  analysis: Analysis;
};

type SimilarityMatch = {
  firstStudent: Student;
  secondStudent: Student;
  firstAnalysis: Analysis;
  secondAnalysis: Analysis;
  score: number;
};

type SimilarityGroup = {
  students: Student[];
  matches: SimilarityMatch[];
};

const PAGE_SIZE = 10;
const SIMILARITY_THRESHOLD = 0.85;

const FolderShow = () => {
  const { classroomId, folderId } = useParams();
  const navigate = useNavigate();
  const { classrooms } = useClassroomContext();
  const classroom = classrooms.find((item) => item.$id === classroomId);
  const [folder, setFolder] = useState<ClassroomFolder | null>(null);
  const [students, setStudents] = useState<StudentFolderAnalysis[]>([]);
  const [folderAnalytics, setFolderAnalytics] =
    useState<StudentAnalytics | null>(null);
  const [similarityGroups, setSimilarityGroups] = useState<SimilarityGroup[]>(
    [],
  );
  const [selectedSimilarityGroup, setSelectedSimilarityGroup] =
    useState<SimilarityGroup | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [studentSearch, setStudentSearch] = useState("");
  const [expandedStudentIds, setExpandedStudentIds] = useState<Set<string>>(
    new Set(),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!classroomId || !folderId) return;

    let isMounted = true;
    let isLoadingRequest = false;
    let isInitialLoad = true;

    const loadFolderAnalyses = async () => {
      if (isLoadingRequest) return;

      isLoadingRequest = true;

      if (isInitialLoad) {
        setIsLoading(true);
        setCurrentPage(1);
      }

      try {
        const folderRow = (await getFoldersByClassroomId(classroomId)).find(
          (row) => row.$id === folderId,
        );

        if (!folderRow || !isMounted) return;

        const selectedFolder = {
          id: folderRow.$id,
          name: folderRow.name,
          description: folderRow.description,
          targetFileNamePrefix: folderRow.targetFileNamePrefix,
          updatedAt: folderRow.$updatedAt || folderRow.$createdAt || "",
        } satisfies ClassroomFolder;

        setFolder(selectedFolder);

        const classroomStudents = await getClassroomStudents(classroomId);

        const studentsWithMatches: StudentFolderData[] = await Promise.all(
          classroomStudents
            .filter((student) => student.accepted)
            .map(async (student) => {
              const allAnalyses = (
                (await getUserAnalyses(student.$id)) as Analysis[]
              ).filter((analysis) =>
                (
                  cleanFileName(analysis?.fileName as string)?.toLowerCase() ||
                  ""
                ).startsWith(selectedFolder.targetFileNamePrefix.toLowerCase()),
              );

              return {
                ...student,
                allAnalyses,
                analyses: getLatestAnalysisPerFile(allAnalyses),
                latestAnalysis: getLatestAnalysis(allAnalyses),
              };
            }),
        );

        if (!isMounted) return;

        setFolderAnalytics(
          buildStudentAnalytics(
            studentsWithMatches.flatMap(
              (student) => student.allAnalyses,
            ) as unknown as AnalysisRecord[],
          ),
        );

        setSimilarityGroups(
          findSimilarityGroups(
            studentsWithMatches.filter(
              (student) => student.latestAnalysis !== null,
            ),
          ),
        );

        setStudents(
          studentsWithMatches.filter((student) => student.analyses.length > 0),
        );

        setError(null);
      } catch {
        if (isMounted) {
          setError("Could not load this folder right now.");
        }
      } finally {
        isLoadingRequest = false;
        isInitialLoad = false;

        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadFolderAnalyses();

    const pollingInterval = window.setInterval(() => {
      void loadFolderAnalyses();
    }, 10_000);

    return () => {
      isMounted = false;
      window.clearInterval(pollingInterval);
    };
  }, [classroomId, folderId]);

  const openAnalysis = (analysis: Analysis, student: Student) => {
    navigate(
      analysis.mode === "complexity"
        ? `/complexities/${analysis.id}`
        : `/analyses/${analysis.id}`,
      {
        state: {
          studentName: student.name,
          studentEmail: student.email,
          classroomName: classroom?.name,
        },
      },
    );
  };

  const normalizedStudentSearch = studentSearch.trim().toLowerCase();
  const filteredStudents = normalizedStudentSearch
    ? students.filter((student) =>
        student.name.toLowerCase().includes(normalizedStudentSearch),
      )
    : students;

  const analysisRows: FolderAnalysisRow[] = filteredStudents.flatMap(
    (student) => student.analyses.map((analysis) => ({ student, analysis })),
  );
  const totalPages = Math.max(1, Math.ceil(analysisRows.length / PAGE_SIZE));
  const pageStart = (Math.min(currentPage, totalPages) - 1) * PAGE_SIZE;
  const visibleRows = analysisRows.slice(pageStart, pageStart + PAGE_SIZE);
  const visibleAnalysesByStudent = new Map<string, Analysis[]>();

  visibleRows.forEach(({ student, analysis }) => {
    const analyses = visibleAnalysesByStudent.get(student.$id) || [];
    visibleAnalysesByStudent.set(student.$id, [...analyses, analysis]);
  });

  const paginatedStudents = filteredStudents
    .map((student) => ({
      ...student,
      analyses: visibleAnalysesByStudent.get(student.$id) || [],
    }))
    .filter((student) => student.analyses.length > 0);

  if (!classroom) {
    return (
      <MessageCard
        title="Classroom not found"
        description="We could not find the classroom for this folder."
      />
    );
  }

  if (!isLoading && !folder) {
    return (
      <MessageCard
        title="Folder not found"
        description={
          error || "We could not find the folder you are trying to view."
        }
      />
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-3 border-b pb-6 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <FolderOpen className="size-4" />
              <span>Classroom Folder</span>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
              {folder?.name || "Loading folder..."}
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              {folder?.description || "Student analyses matched by file name."}
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to={`/classrooms/${classroom.$id}/folders`}>
              <ArrowLeft />
              Back to Folders
            </Link>
          </Button>
        </header>

        <Dialog
          open={selectedSimilarityGroup !== null}
          onOpenChange={(open) => {
            if (!open) setSelectedSimilarityGroup(null);
          }}
        >
          <DialogContent className="max-w-5xl">
            <DialogHeader>
              <DialogTitle>Similar analyses</DialogTitle>
              <DialogDescription>
                Review the latest matching analysis from each student in this
                group. Similarity is a review signal, not a final judgment.
              </DialogDescription>
            </DialogHeader>
            <div className="grid max-h-[70vh] gap-4 overflow-y-auto md:grid-cols-2 p-4">
              {selectedSimilarityGroup?.students.map((student) => {
                const analysis = getLatestAnalysis(
                  similarityAnalysesForStudent(
                    selectedSimilarityGroup.matches,
                    student,
                  ),
                );

                return (
                  <div
                    key={student.$id}
                    className="rounded-md border bg-background/70 p-3"
                  >
                    <p className="font-medium">{student.name}</p>
                    <p className="mb-2 text-xs text-muted-foreground">
                      {analysis?.fileName || "Unknown file"}
                    </p>
                    <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-md bg-muted/60 p-3 text-xs leading-5">
                      {analysis?.code || "No code available."}
                    </pre>
                  </div>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>

        {folderAnalytics && (
          <Card>
            <CardHeader className="border-b bg-muted/20 pb-5">
              <CardTitle className="flex items-center gap-2">
                <Folder className="size-5 text-primary" />
                Folder Analytics
              </CardTitle>
              <CardDescription>
                Aggregate analytics from every matching analysis in this folder,
                including analyses hidden from the list below.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StudentStatsView stats={folderAnalytics} />
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="border-b bg-muted/20 pb-5">
            <CardTitle className="flex items-center gap-2">
              <Copy className="size-5 text-primary" />
              Similarity Check
            </CardTitle>
            <CardDescription>
              Compares the latest matching analysis from each student. Scores of
              80% or higher may indicate copied work and should be reviewed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {similarityGroups.length ? (
              similarityGroups.map((group) => {
                const groupKey = getSimilarityGroupKey(group);

                return (
                  <div
                    key={groupKey}
                    role="button"
                    tabIndex={0}
                    aria-label={`View similar analyses for ${group.students
                      .map((student) => student.name)
                      .join(", ")}`}
                    onClick={() => setSelectedSimilarityGroup(group)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedSimilarityGroup(group);
                      }
                    }}
                    className="cursor-pointer rounded-lg border border-amber-500/40 bg-amber-500/5 p-4 outline-none transition-colors hover:bg-amber-500/10 focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-start gap-3">
                        <ShieldAlert className="mt-0.5 size-5 shrink-0 text-amber-600" />
                        <div className="space-y-1">
                          <p className="font-medium">
                            Needs review: {group.students.length} students with
                            similar work
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {group.students
                              .map((student) => student.name)
                              .join(", ")}
                          </p>
                          <div className="space-y-1 pt-1">
                            {group.students.map((student) => {
                              const analysis = getLatestAnalysis(
                                similarityAnalysesForStudent(
                                  group.matches,
                                  student,
                                ),
                              );

                              return (
                                <p
                                  key={student.$id}
                                  className="text-xs text-muted-foreground"
                                >
                                  {student.name}:{" "}
                                  {analysis?.fileName || "Unknown file"}
                                </p>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2 md:flex-col md:items-end">
                        <Badge
                          variant="outline"
                          className="w-fit border-amber-500/50"
                        >
                          Highest{" "}
                          {formatSimilarityScore(
                            getHighestSimilarity(group.matches),
                          )}
                        </Badge>
                        <Badge variant="secondary" className="w-fit">
                          Average{" "}
                          {formatSimilarityScore(
                            getAverageSimilarity(group.matches),
                          )}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {group.matches.length} pair comparisons
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground">
                No strong similarities were detected between the latest student
                analyses.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-muted/20 pb-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileCode2 className="size-5 text-primary" />
                  Matching Student Analyses
                </CardTitle>
                <CardDescription className="mt-2">
                  Files starting with{" "}
                  <span className="font-medium text-foreground">
                    {folder?.targetFileNamePrefix || "..."}
                  </span>{" "}
                  appear here.
                </CardDescription>
              </div>
              <Input
                value={studentSearch}
                placeholder="Search student name..."
                aria-label="Search student name"
                className="md:max-w-xs"
                onChange={(event) => {
                  setStudentSearch(event.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : paginatedStudents.length ? (
              <>
                {paginatedStudents.map((student) => (
                  <div key={student.$id} className="rounded-lg border p-4">
                    {(() => {
                      const latestAnalysisIds = new Set(
                        student.analyses.map((analysis) => analysis.id),
                      );
                      const pastAnalyses = student.allAnalyses
                        .filter(
                          (analysis) => !latestAnalysisIds.has(analysis.id),
                        )
                        .sort(
                          (first, second) =>
                            new Date(
                              second.updatedAt || second.createdAt,
                            ).getTime() -
                            new Date(
                              first.updatedAt || first.createdAt,
                            ).getTime(),
                        );
                      const isExpanded = expandedStudentIds.has(student.$id);

                      return (
                        <>
                          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="font-medium">{student.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {student.email}
                              </p>
                            </div>
                            <Badge variant="secondary">
                              {student.analyses.length}{" "}
                              {student.analyses.length === 1
                                ? "analysis"
                                : "analyses"}
                            </Badge>
                          </div>
                          <div className="space-y-2">
                            {student.analyses.map((analysis) => (
                              <button
                                key={analysis.id}
                                type="button"
                                className="group flex w-full items-center gap-3 rounded-md border bg-card/60 p-3 text-left transition-colors hover:border-primary/40 hover:bg-accent"
                                onClick={() => openAnalysis(analysis, student)}
                              >
                                <FileCode2 className="size-5 shrink-0 text-primary" />
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate font-medium">
                                    {analysis.fileName}
                                  </span>
                                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <CalendarDays className="size-3.5" />
                                    {formatDate(analysis.createdAt)}
                                  </span>
                                </span>
                                <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                              </button>
                            ))}
                          </div>
                          {pastAnalyses.length > 0 && (
                            <>
                              <Button
                                type="button"
                                variant="ghost"
                                className="mt-3 px-0 text-primary hover:bg-transparent hover:text-primary/80"
                                onClick={() =>
                                  setExpandedStudentIds((current) => {
                                    const next = new Set(current);
                                    if (next.has(student.$id)) {
                                      next.delete(student.$id);
                                    } else {
                                      next.add(student.$id);
                                    }
                                    return next;
                                  })
                                }
                              >
                                <History />
                                {isExpanded
                                  ? "Hide past analyses"
                                  : `Show ${pastAnalyses.length} past ${
                                      pastAnalyses.length === 1
                                        ? "analysis"
                                        : "analyses"
                                    }`}
                              </Button>
                              {isExpanded && (
                                <div className="mt-2 space-y-2 border-t pt-3">
                                  {pastAnalyses.map((analysis) => (
                                    <button
                                      key={analysis.id}
                                      type="button"
                                      className="group flex w-full items-center gap-3 rounded-md border bg-muted/30 p-3 text-left transition-colors hover:border-primary/40 hover:bg-accent"
                                      onClick={() =>
                                        openAnalysis(analysis, student)
                                      }
                                    >
                                      <FileCode2 className="size-5 shrink-0 text-muted-foreground" />
                                      <span className="min-w-0 flex-1">
                                        <span className="block truncate font-medium">
                                          {analysis.fileName}
                                        </span>
                                        <span className="flex items-center gap-2 text-sm text-muted-foreground">
                                          <CalendarDays className="size-3.5" />
                                          {formatDate(analysis.createdAt)}
                                        </span>
                                      </span>
                                      <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                                    </button>
                                  ))}
                                </div>
                              )}
                            </>
                          )}
                        </>
                      );
                    })()}
                  </div>
                ))}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between border-t pt-4">
                    <p className="text-sm text-muted-foreground">
                      Page {Math.min(currentPage, totalPages)} of {totalPages}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label="Previous page"
                        disabled={currentPage === 1}
                        onClick={() =>
                          setCurrentPage((page) => Math.max(1, page - 1))
                        }
                      >
                        <ChevronLeft />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label="Next page"
                        disabled={currentPage >= totalPages}
                        onClick={() =>
                          setCurrentPage((page) =>
                            Math.min(totalPages, page + 1),
                          )
                        }
                      >
                        <ChevronRight />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <Users className="size-8 text-muted-foreground" />
                <p className="font-medium">No matching analyses yet</p>
                <p className="text-sm text-muted-foreground">
                  Accepted students with matching file names will appear here.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

function MessageCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <Card className="mx-auto w-full max-w-5xl">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getLatestAnalysisPerFile(analyses: Analysis[]) {
  const latestByFile = new Map<string, Analysis>();

  for (const analysis of analyses) {
    const fileKey = `${analysis.fileName}::${analysis.fileType}`;
    const existing = latestByFile.get(fileKey);

    if (!existing) {
      latestByFile.set(fileKey, analysis);
      continue;
    }

    const existingTimestamp =
      new Date(existing.updatedAt || existing.createdAt).getTime() || 0;
    const currentTimestamp =
      new Date(analysis.updatedAt || analysis.createdAt).getTime() || 0;

    if (currentTimestamp >= existingTimestamp) {
      latestByFile.set(fileKey, analysis);
    }
  }

  return Array.from(latestByFile.values());
}

function getLatestAnalysis(analyses: Analysis[]) {
  return analyses.reduce<Analysis | null>((latest, analysis) => {
    if (!latest) return analysis;

    const latestTimestamp =
      new Date(latest.updatedAt || latest.createdAt).getTime() || 0;
    const analysisTimestamp =
      new Date(analysis.updatedAt || analysis.createdAt).getTime() || 0;

    return analysisTimestamp >= latestTimestamp ? analysis : latest;
  }, null);
}

function findSimilarityGroups(students: StudentFolderData[]) {
  const matches: SimilarityMatch[] = [];

  for (let firstIndex = 0; firstIndex < students.length; firstIndex += 1) {
    const firstStudent = students[firstIndex];
    if (!firstStudent.latestAnalysis) continue;

    for (
      let secondIndex = firstIndex + 1;
      secondIndex < students.length;
      secondIndex += 1
    ) {
      const secondStudent = students[secondIndex];
      if (!secondStudent.latestAnalysis) continue;

      const score = compareTwoStrings(
        normalizeAnalysisForSimilarity(firstStudent.latestAnalysis),
        normalizeAnalysisForSimilarity(secondStudent.latestAnalysis),
      );

      if (score >= SIMILARITY_THRESHOLD) {
        matches.push({
          firstStudent,
          secondStudent,
          firstAnalysis: firstStudent.latestAnalysis,
          secondAnalysis: secondStudent.latestAnalysis,
          score,
        });
      }
    }
  }

  const studentsById = new Map(
    students.map((student) => [student.$id, student]),
  );
  const connectedStudentIds = new Map<string, Set<string>>();

  matches.forEach((match) => {
    const firstConnections =
      connectedStudentIds.get(match.firstStudent.$id) || new Set<string>();
    const secondConnections =
      connectedStudentIds.get(match.secondStudent.$id) || new Set<string>();

    firstConnections.add(match.secondStudent.$id);
    secondConnections.add(match.firstStudent.$id);
    connectedStudentIds.set(match.firstStudent.$id, firstConnections);
    connectedStudentIds.set(match.secondStudent.$id, secondConnections);
  });

  const groups: SimilarityGroup[] = [];
  const visited = new Set<string>();

  for (const studentId of connectedStudentIds.keys()) {
    if (visited.has(studentId)) continue;

    const groupStudentIds: string[] = [];
    const pending = [studentId];

    while (pending.length) {
      const currentId = pending.pop();
      if (!currentId || visited.has(currentId)) continue;

      visited.add(currentId);
      groupStudentIds.push(currentId);

      for (const connectedId of connectedStudentIds.get(currentId) || []) {
        if (!visited.has(connectedId)) pending.push(connectedId);
      }
    }

    const groupMatches = matches.filter(
      (match) =>
        groupStudentIds.includes(match.firstStudent.$id) &&
        groupStudentIds.includes(match.secondStudent.$id),
    );

    groups.push({
      students: groupStudentIds
        .map((id) => studentsById.get(id))
        .filter(Boolean) as Student[],
      matches: groupMatches.sort((first, second) => second.score - first.score),
    });
  }

  return groups.sort(
    (first, second) =>
      getHighestSimilarity(second.matches) -
      getHighestSimilarity(first.matches),
  );
}

function similarityAnalysesForStudent(
  matches: SimilarityMatch[],
  student: Student,
) {
  return matches.flatMap((match) => {
    if (match.firstStudent.$id === student.$id) return [match.firstAnalysis];
    if (match.secondStudent.$id === student.$id) return [match.secondAnalysis];
    return [];
  });
}

function getSimilarityGroupKey(group: SimilarityGroup) {
  return group.students
    .map((student) => student.$id)
    .sort()
    .join(":");
}

function getHighestSimilarity(matches: SimilarityMatch[]) {
  return Math.max(...matches.map((match) => match.score));
}

function getAverageSimilarity(matches: SimilarityMatch[]) {
  return (
    matches.reduce((total, match) => total + match.score, 0) / matches.length
  );
}

function formatSimilarityScore(score: number) {
  return `${Math.round(score * 100)}%`;
}

export default FolderShow;
