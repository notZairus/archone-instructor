import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useClassroomContext } from "@/contexts/classroomContext";
import { getClassroomStudents, getUserAnalyses } from "@/lib/db";
import { Separator } from "@/components/ui/separator";
import { DEFAULT_PAGE_SIZE, FILE_TYPES } from "@/constants/configs";

type StudentMembership = {
  classroomId: string;
  classroomName: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  membershipStatus: "accepted" | "pending";
};

type StudentAnalysisRecord = {
  id: string;
  fileName: string;
  fileType: string;
  createdAt: string;
  updatedAt?: string;
};

type StudentAnalysisRow = {
  rowId: string;
  studentName: string;
  studentEmail: string;
  classroomId: string;
  classroomName: string;
  membershipStatus: "accepted" | "pending";
  analysisId: string;
  fileName: string;
  fileType: string;
  analysisCreatedAt: string;
};

const StudentAnalysis = () => {
  const navigate = useNavigate();
  const { classrooms } = useClassroomContext();
  const [rows, setRows] = useState<StudentAnalysisRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchStudentAnalyses = useCallback(async () => {
    if (!classrooms.length) {
      setRows([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const studentsByClassroom = await Promise.all(
        classrooms.map(async (classroom) => {
          const students = await getClassroomStudents(classroom.$id);

          return students.map((student) => ({
            classroomId: classroom.$id,
            classroomName: classroom.name,
            studentId: student.$id,
            studentName: student.name,
            studentEmail: student.email,
            membershipStatus: student.accepted ? "accepted" : "pending",
          })) as StudentMembership[];
        }),
      );

      const memberships = studentsByClassroom.flat();
      const uniqueStudentIds = Array.from(
        new Set(memberships.map((membership) => membership.studentId)),
      );

      const analysesByStudent = await Promise.all(
        uniqueStudentIds.map(async (studentId) => {
          const analyses = (await getUserAnalyses(
            studentId,
          )) as StudentAnalysisRecord[];

          return {
            studentId,
            analyses,
          };
        }),
      );

      const analysisMap = new Map<string, StudentAnalysisRecord[]>();
      for (const item of analysesByStudent) {
        analysisMap.set(
          item.studentId,
          getLatestAnalysisPerFile(item.analyses || []),
        );
      }

      const flattenedRows: StudentAnalysisRow[] = [];
      for (const membership of memberships) {
        const analyses = analysisMap.get(membership.studentId) || [];

        for (const analysis of analyses) {
          flattenedRows.push({
            rowId: `${membership.classroomId}:${membership.studentId}:${analysis.id}`,
            studentName: membership.studentName,
            studentEmail: membership.studentEmail,
            classroomId: membership.classroomId,
            classroomName: membership.classroomName,
            membershipStatus: membership.membershipStatus,
            analysisId: analysis.id,
            fileName: analysis.fileName,
            fileType: analysis.fileType,
            analysisCreatedAt: analysis.createdAt,
          });
        }
      }

      flattenedRows.sort((a, b) => {
        const left = new Date(a.analysisCreatedAt).getTime();
        const right = new Date(b.analysisCreatedAt).getTime();

        return right - left;
      });

      setRows(flattenedRows);
      setCurrentPage(1);
    } catch {
      setError("Could not load student analyses right now.");
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  }, [classrooms]);

  useEffect(() => {
    void fetchStudentAnalyses();
  }, [fetchStudentAnalyses]);

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return rows;
    }

    return rows.filter((row) => {
      return (
        row.studentName.toLowerCase().includes(normalizedQuery) ||
        row.studentEmail.toLowerCase().includes(normalizedQuery) ||
        row.classroomName.toLowerCase().includes(normalizedQuery) ||
        row.fileName.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [query, rows]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [currentPage, filteredRows, pageSize]);

  const hasRows = filteredRows.length > 0;

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            Student Analysis
          </h1>
          <p className="text-sm text-muted-foreground">
            Analysis records from students who are members of your classrooms.
          </p>
        </header>

        <Card>
          <CardHeader className="gap-3">
            <CardTitle>Filters and Pagination</CardTitle>
            <CardDescription>
              Search by student, classroom, email, or file name.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-[1fr_180px]">
              <div className="space-y-2">
                <Label htmlFor="analysis-search">Search</Label>
                <Input
                  id="analysis-search"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-accent border"
                  placeholder="Search student, email, classroom, or file..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="analysis-page-size">Rows per page</Label>
                <Select
                  value={String(pageSize)}
                  onValueChange={(value) => {
                    setPageSize(Number(value));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger
                    id="analysis-page-size"
                    className="w-full bg-accent border"
                  >
                    <SelectValue placeholder="Rows per page" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <p>Total results: {filteredRows.length}</p>
              <p>
                Page {currentPage} of {totalPages}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Analysis Records</CardTitle>
            <CardDescription>
              Newest analysis records are shown first.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : error ? (
              <div className="space-y-3 rounded-none border p-4">
                <p className="text-sm text-destructive">{error}</p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void fetchStudentAnalyses()}
                >
                  Retry
                </Button>
              </div>
            ) : hasRows ? (
              paginatedRows.map((row) => {
                console.log(row);

                return (
                  <article
                    key={row.rowId}
                    role="button"
                    tabIndex={0}
                    onClick={() =>
                      navigate(`/student-analysis/${row.analysisId}`, {
                        state: {
                          studentName: row.studentName,
                          studentEmail: row.studentEmail,
                          classroomName: row.classroomName,
                          classroomId: row.classroomId,
                        },
                      })
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        navigate(`/student-analysis/${row.analysisId}`, {
                          state: {
                            studentName: row.studentName,
                            studentEmail: row.studentEmail,
                            classroomName: row.classroomName,
                            classroomId: row.classroomId,
                          },
                        });
                      }
                    }}
                    className="flex flex-col sm:flex-row flex-wrap cursor-pointer gap-8  border hover:bg-accent transition-colors duration-300 rounded-lg p-4 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring "
                  >
                    <div className="min-w-0 space-y-1 flex-1">
                      <p className="font-medium wrap-break-word text-lg">
                        {row.studentName}
                      </p>
                      <p className="text-md text-muted-foreground break-all ">
                        {row.studentEmail}
                      </p>

                      <Separator className="my-2" />

                      <p className="text-xs text-muted-foreground wrap-break-word">
                        Student of:{" "}
                        <span className="font-semibold">
                          {row.classroomName}
                        </span>
                      </p>
                    </div>

                    <Separator
                      orientation="vertical"
                      className="hidden sm:block"
                    />

                    <Separator className="block sm:hidden" />

                    <div className="min-w-0 space-y-1 text-xs text-muted-foreground flex-1">
                      <div className="text-[1.05rem] flex sm:items-center w-full flex-col sm:flex-row">
                        <span className="w-32">File Name:</span>
                        <span className="text-foreground break-all">
                          {row.fileName.replace("\\", "/").split("/").pop()}
                        </span>
                      </div>
                      <div className="text-[1.05rem] flex sm:items-center w-full flex-col sm:flex-row">
                        <span className="w-32">File Type:</span>
                        <span className="text-foreground wrap-break-word">
                          {FILE_TYPES[
                            row.fileType as keyof typeof FILE_TYPES
                          ] || row.fileType}{" "}
                          ({row.fileType})
                        </span>
                      </div>
                      <div className="text-[1.05rem] flex sm:items-center w-full flex-col sm:flex-row">
                        <span className="w-32">Analyzed: </span>
                        <span className="text-foreground">
                          {formatDateTime(row.analysisCreatedAt)}
                        </span>
                      </div>
                    </div>
                  </article>
                );
              })
            ) : (
              <p className="rounded-none p-4 text-sm text-muted-foreground">
                {query.trim()
                  ? "No analysis records matched your search."
                  : "No analysis records found for your classroom members yet."}
              </p>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setCurrentPage((current) => Math.max(1, current - 1))
            }
            disabled={currentPage <= 1 || !hasRows}
          >
            Previous
          </Button>

          <p className="text-xs text-muted-foreground">
            Page {currentPage} of {totalPages}
          </p>

          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setCurrentPage((current) => Math.min(totalPages, current + 1))
            }
            disabled={currentPage >= totalPages || !hasRows}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
};

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

function getLatestAnalysisPerFile(records: StudentAnalysisRecord[]) {
  const latestByFile = new Map<string, StudentAnalysisRecord>();

  for (const record of records) {
    const fileKey = `${record.fileName}::${record.fileType}`;
    const existing = latestByFile.get(fileKey);

    if (!existing) {
      latestByFile.set(fileKey, record);
      continue;
    }

    const existingTimestamp =
      new Date(existing.updatedAt || existing.createdAt).getTime() || 0;
    const currentTimestamp =
      new Date(record.updatedAt || record.createdAt).getTime() || 0;

    if (currentTimestamp >= existingTimestamp) {
      latestByFile.set(fileKey, record);
    }
  }

  return Array.from(latestByFile.values());
}

export default StudentAnalysis;
