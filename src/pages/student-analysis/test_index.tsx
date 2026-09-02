import { useEffect, useState } from "react";
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
import { useClassroomContext } from "@/contexts/classroomContext";
import { getClassroomStudents, getUserAnalyses } from "@/lib/db";
import { DEFAULT_PAGE_SIZE } from "@/constants/configs";
import type { Analysis } from "@/types/global";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router";

interface StudentWithClassroom {
  $id: string;
  email: string;
  name: string;
  classrooms: string[];
  analyses: Analysis[];
}

const StudentAnalysis = () => {
  const navigate = useNavigate();
  const { classrooms } = useClassroomContext();
  const [query, setQuery] = useState("");
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<String | null>(null);
  const [students, setStudents] = useState<StudentWithClassroom[]>([]);
  const [selected, setSelected] = useState<{
    student: null | StudentWithClassroom;
    fileAnalyses: null | Analysis[];
  }>({
    student: null,
    fileAnalyses: null,
  });

  useEffect(() => {
    const fetchStudents = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const allStudents: any[] = [];

        for (const classroom of classrooms) {
          const classroomStudents = await getClassroomStudents(classroom.$id);

          for (const student of classroomStudents) {
            const existing = allStudents.find((s) => s.$id === student.$id);

            if (existing) {
              existing.classrooms.push(classroom.name);
              continue;
            }

            const analyses = await getUserAnalyses(student.$id);

            allStudents.push({
              ...student,
              classrooms: [classroom.name],
              analyses,
            });
          }
        }

        setStudents(allStudents);
        setIsLoading(false);
      } catch (err) {
        setIsLoading(false);
        setError("Error fetching students.");
      }
    };

    fetchStudents();
  }, [classrooms]);

  function handleSelectStudent(student: StudentWithClassroom) {
    const _selected = { ...selected };
    _selected.student = student;

    setCurrentPage(1);
    setSelected(_selected);
  }

  function handleSelectFile(analyses: Analysis[]) {
    const _selected = { ...selected };
    _selected.fileAnalyses = analyses;

    setCurrentPage(1);
    setSelected(_selected);
  }

  const sortedByFileName =
    selected.student && sortAnalysisByFileName(selected.student?.analyses);

  const totalPages = (() => {
    if (selected.student && !selected.fileAnalyses) {
      return Math.ceil(
        Array.from(Object.keys(sortedByFileName)).length / pageSize,
      );
    } else if (selected.student && selected.fileAnalyses) {
      return Math.ceil(selected.fileAnalyses.length / pageSize);
    } else {
      return Math.ceil(students.length / pageSize);
    }
  })();

  const hasRows = (() => {
    if (!selected.student) {
      return students.length > 0;
    } else if (selected.student && !selected.fileAnalyses) {
      return selected.student.analyses.length > 0;
    } else if (selected.student && selected.fileAnalyses) {
      return selected.fileAnalyses.length > 0;
    }
  })();

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
              {!selected.student && <p>Total results: {students.length}</p>}
              {selected.student && !selected.fileAnalyses && (
                <p>
                  Total results:{" "}
                  {Array.from(Object.entries(sortedByFileName)).length}
                </p>
              )}
              {selected.student && selected.fileAnalyses && (
                <p>Total results: {selected.fileAnalyses.length}</p>
              )}
              <p>
                Page {currentPage} of {totalPages}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex justify-between">
            <div>
              <CardTitle>Analysis Records</CardTitle>
              <CardDescription>
                Newest analysis records are shown first.
              </CardDescription>
            </div>
            <div>
              <Button
                variant={"outline"}
                onClick={() => {
                  setCurrentPage(1);
                  setSelected({
                    student: selected.fileAnalyses ? selected.student : null,
                    fileAnalyses: null,
                  });
                }}
                disabled={!selected.student && !selected.fileAnalyses}
              >
                Back
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading && (
              <div className="flex items-center justify-center">
                <p className="text-sm text-muted-foreground">Loading...</p>
              </div>
            )}

            {error && (
              <div className="flex items-center justify-center">
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            )}

            {students.length === 0 && !isLoading && !error && (
              <div className="flex items-center justify-center">
                <p className="text-sm text-muted-foreground">
                  No results found.
                </p>
              </div>
            )}

            {students.length > 0 &&
              !selected.student &&
              applyPagination(
                filterStudents(students, query),
                currentPage,
                pageSize,
              ).map((student) => (
                <>
                  <div
                    key={student.$id}
                    className="p-4 border hover:bg-accent transition-colors duration-300 rounded-lg flex gap-4"
                    onClick={() => {
                      console.log(student);
                      handleSelectStudent(student);
                    }}
                  >
                    <div className="flex-1">
                      <p>{student.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {student.email}
                      </p>
                    </div>

                    <Separator orientation="vertical" />

                    <div className="flex-1 ">
                      <p className="text-sm text-muted-foreground">
                        Student from:
                      </p>
                      <p>{student.classrooms.join(" & ")}</p>
                    </div>

                    <Separator orientation="vertical" />

                    <div className="flex-1 ">
                      <p className="text-sm text-muted-foreground">Count:</p>
                      <p>{student.analyses.length} Analysis</p>
                    </div>
                  </div>
                </>
              ))}

            {selected.student &&
              !selected.fileAnalyses &&
              applyPagination(
                filterAnalyses(
                  Array.from(Object.entries(sortedByFileName)),
                  query,
                ),
                currentPage,
                pageSize,
              ).map(([fileName, analyses]: any) => (
                <>
                  <div
                    onClick={() => {
                      console.log(analyses);
                      handleSelectFile(analyses);
                    }}
                    className="p-4 border hover:bg-accent transition-colors duration-300 rounded-lg flex gap-4"
                  >
                    <div className="flex-1">
                      <p>{fileName}</p>
                    </div>

                    <Separator orientation="vertical" />

                    <div className="flex-1">
                      <p>{analyses.length} analyses</p>
                    </div>
                  </div>
                </>
              ))}

            {selected.student &&
              selected.fileAnalyses &&
              applyPagination(selected.fileAnalyses, currentPage, pageSize).map(
                (analysis) => (
                  <>
                    <div
                      key={analysis.$id}
                      className="p-4 border hover:bg-accent transition-colors duration-300 rounded-lg flex gap-4"
                      onClick={() =>
                        navigate(`/student-analysis/${analysis.id}`, {
                          state: {
                            studentName: selected.student?.name,
                            studentEmail: selected.student?.email,
                            classroomName:
                              selected.student?.classrooms.join(" & "),
                          },
                        })
                      }
                    >
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">
                          Analyzed on:
                        </p>
                        <p className="text-[1.05rem]">
                          {formatDate(analysis.createdAt)}
                        </p>
                      </div>
                      <Separator orientation="vertical" />

                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">
                          Analyzed at:
                        </p>
                        <p className="text-[1.05rem]">
                          {formatTime(analysis.createdAt)}
                        </p>
                      </div>
                    </div>
                  </>
                ),
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
            {/* Page {currentPage} of {totalPages} */}
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

function formatDate(value: string) {
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(timestamp);
}

function formatTime(value: string) {
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(timestamp);
}

function sortAnalysisByFileName(analyses: Analysis[]) {
  const sortedByFileName: any = {};

  analyses.forEach((analysis) => {
    if (!Object.keys(sortedByFileName).includes(analysis.fileName)) {
      sortedByFileName[analysis.fileName] = [analysis];
    } else {
      sortedByFileName[analysis.fileName].push(analysis);
    }
  });

  return sortedByFileName;
}

function applyPagination<T>(items: T[], page: number, perPage: number): T[] {
  const start = (page - 1) * perPage;
  const end = start + perPage;
  return items.slice(start, end);
}

function filterStudents(students: any[], query: string = "") {
  if (!query) {
    return students;
  }

  return students.filter((student) => {
    const normalizedQuery = query.toLowerCase().trim();
    const studentNameMatch = student.name
      .toLowerCase()
      .includes(normalizedQuery);
    const studentEmailMatch = student.email
      .toLowerCase()
      .includes(normalizedQuery);
    const classroomMatch = student.classrooms.some((classroom: any) =>
      classroom.toLowerCase().includes(normalizedQuery),
    );
    const fileNameMatch = student.analyses.some((analysis: any) =>
      analysis.fileName.toLowerCase().includes(normalizedQuery),
    );
    return (
      studentNameMatch || studentEmailMatch || classroomMatch || fileNameMatch
    );
  });
}

function filterAnalyses(analyses: any, query: string = "") {
  if (!query) {
    return analyses;
  }

  return analyses.filter(([fileName]: string[]) =>
    fileName.toLowerCase().includes(query.toLowerCase().trim()),
  );
}

export default StudentAnalysis;
