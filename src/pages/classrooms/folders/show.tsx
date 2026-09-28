import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileCode2,
  FolderOpen,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useClassroomContext } from "@/contexts/classroomContext";
import {
  getClassroomStudents,
  getFoldersByClassroomId,
  getUserAnalyses,
} from "@/lib/db";
import type { Analysis, ClassroomFolder, Student } from "@/types/global";
import { cleanFileName } from "@/lib/helpers";
import {
  buildStudentAnalytics,
  StudentStatsView,
  type AnalysisRecord,
  type StudentAnalytics,
} from "@/pages/classrooms/show";

type StudentFolderAnalysis = Student & {
  analyses: Analysis[];
};

type StudentFolderData = StudentFolderAnalysis & {
  allAnalyses: Analysis[];
};

type FolderAnalysisRow = {
  student: Student;
  analysis: Analysis;
};

const PAGE_SIZE = 10;

const FolderShow = () => {
  const { classroomId, folderId } = useParams();
  const navigate = useNavigate();
  const { classrooms } = useClassroomContext();
  const classroom = classrooms.find((item) => item.$id === classroomId);
  const [folder, setFolder] = useState<ClassroomFolder | null>(null);
  const [students, setStudents] = useState<StudentFolderAnalysis[]>([]);
  const [folderAnalytics, setFolderAnalytics] =
    useState<StudentAnalytics | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!classroomId || !folderId) return;

    const loadFolderAnalyses = async () => {
      setIsLoading(true);
      setError(null);
      setCurrentPage(1);

      try {
        const folderRow = (await getFoldersByClassroomId(classroomId)).find(
          (row) => row.$id === folderId,
        );

        if (!folderRow) {
          setError("Could not find this folder.");
          return;
        }

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
                (cleanFileName(analysis?.fileName as string) || "").startsWith(
                  selectedFolder.targetFileNamePrefix,
                ),
              );

              return {
                ...student,
                allAnalyses,
                analyses: getLatestAnalysisPerFile(allAnalyses),
              };
            }),
        );

        setFolderAnalytics(
          buildStudentAnalytics(
            studentsWithMatches.flatMap(
              (student) => student.allAnalyses,
            ) as unknown as AnalysisRecord[],
          ),
        );

        setStudents(
          studentsWithMatches.filter((student) => student.analyses.length > 0),
        );
      } catch {
        setError("Could not load this folder right now.");
      } finally {
        setIsLoading(false);
      }
    };

    void loadFolderAnalyses();
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

  const analysisRows: FolderAnalysisRow[] = students.flatMap((student) =>
    student.analyses.map((analysis) => ({ student, analysis })),
  );
  const totalPages = Math.max(1, Math.ceil(analysisRows.length / PAGE_SIZE));
  const pageStart = (Math.min(currentPage, totalPages) - 1) * PAGE_SIZE;
  const visibleRows = analysisRows.slice(pageStart, pageStart + PAGE_SIZE);
  const visibleAnalysesByStudent = new Map<string, Analysis[]>();

  visibleRows.forEach(({ student, analysis }) => {
    const analyses = visibleAnalysesByStudent.get(student.$id) || [];
    visibleAnalysesByStudent.set(student.$id, [...analyses, analysis]);
  });

  const paginatedStudents = students
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

        {folderAnalytics && (
          <Card>
            <CardHeader className="border-b bg-muted/20 pb-5">
              <CardTitle>Folder Analytics</CardTitle>
              <CardDescription>
                Aggregate analytics from every matching analysis in this folder,
                including analyses hidden from the list below.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <StudentStatsView stats={folderAnalytics} />
            </CardContent>
          </Card>
        )}

        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-muted/20 pb-5">
            <CardTitle className="flex items-center gap-2">
              <FileCode2 className="size-5 text-primary" />
              Matching Student Analyses
            </CardTitle>
            <CardDescription>
              Files starting with{" "}
              <span className="font-medium text-foreground">
                {folder?.targetFileNamePrefix || "..."}
              </span>{" "}
              appear here.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
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

export default FolderShow;
