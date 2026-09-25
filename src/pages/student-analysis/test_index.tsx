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
import { Badge } from "@/components/ui/badge";
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
import {
  ArrowDownNarrowWide,
  ArrowLeft,
  ArrowUpWideNarrow,
  ArrowRight,
  CalendarDays,
  ClipboardList,
  FileCode2,
  Clock3,
  Search,
  Users,
} from "lucide-react";

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
  const [alphabeticalOrder, setAlphabeticalOrder] = useState<"asc" | "desc">(
    "asc",
  );

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
  const fileEntries: [string, Analysis[]][] = selected.student
    ? Object.entries(sortedByFileName as Record<string, Analysis[]>)
    : [];

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

  const studentsToMap =
    students.length > 0 &&
    !selected.student &&
    (alphabeticalOrder === "asc"
      ? applyPagination(
          filterStudents(students, query),
          currentPage,
          pageSize,
        ).sort((a, b) => a.name.localeCompare(b.name))
      : students.length > 0 &&
        !selected.student &&
        applyPagination(filterStudents(students, query), currentPage, pageSize)
          .sort((a, b) => a.name.localeCompare(b.name))
          .reverse());

  const filesToMap =
    selected.student &&
    !selected.fileAnalyses &&
    (alphabeticalOrder === "asc"
      ? applyPagination(
          filterAnalyses(fileEntries, query) as [string, Analysis[]][],
          currentPage,
          pageSize,
        ).sort(([a], [b]) => a.localeCompare(b))
      : applyPagination(
          filterAnalyses(fileEntries, query) as [string, Analysis[]][],
          currentPage,
          pageSize,
        )
          .sort(([a], [b]) => a.localeCompare(b))
          .reverse());

  const analysesToMap =
    selected.student &&
    selected.fileAnalyses &&
    (alphabeticalOrder === "asc"
      ? applyPagination(selected.fileAnalyses, currentPage, pageSize).sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        )
      : applyPagination(selected.fileAnalyses, currentPage, pageSize)
          .sort(
            (a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
          )
          .reverse());

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-3 border-b pb-6">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <ClipboardList className="size-4" />
            <span>Instructor workspace</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Student Analysis
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Analysis records from students who are members of your classrooms.
          </p>
        </header>

        <Card className="overflow-hidden">
          <CardHeader className="gap-3 border-b bg-muted/20 pb-5">
            <CardTitle className="flex items-center gap-2">
              <Search className="size-5 text-primary" />
              Find analysis records
            </CardTitle>
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
                  className="w-full bg-background"
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
                    className="w-full bg-background"
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

            <div className="flex flex-wrap items-center justify-between gap-2">
              {!selected.student && (
                <Badge variant="secondary" className="font-normal">
                  {students.length} students
                </Badge>
              )}
              {selected.student && !selected.fileAnalyses && (
                <Badge variant="secondary" className="font-normal">
                  {fileEntries.length} files
                </Badge>
              )}
              {selected.student && selected.fileAnalyses && (
                <Badge variant="secondary" className="font-normal">
                  {selected.fileAnalyses.length} analyses
                </Badge>
              )}
              <p className="text-xs text-muted-foreground">
                Page {currentPage} of {totalPages}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-4 border-b md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="size-5 text-primary" />
                Analysis Records
              </CardTitle>
              <CardDescription>
                Newest analysis records are shown first.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                title={
                  alphabeticalOrder === "asc"
                    ? "Sort descending"
                    : "Sort ascending"
                }
                aria-label={
                  alphabeticalOrder === "asc"
                    ? "Sort descending"
                    : "Sort ascending"
                }
                onClick={() => {
                  setAlphabeticalOrder(
                    alphabeticalOrder === "asc" ? "desc" : "asc",
                  );
                }}
              >
                {alphabeticalOrder === "asc" ? (
                  <ArrowDownNarrowWide />
                ) : (
                  <ArrowUpWideNarrow />
                )}
              </Button>
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
                <ArrowLeft />
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

            {studentsToMap &&
              studentsToMap.map((student) => (
                <>
                  <div
                    key={student.$id}
                    className="flex gap-4 rounded-lg border p-4 transition-colors duration-300 hover:bg-accent"
                    onClick={() => handleSelectStudent(student)}
                  >
                    <Users className="mt-1 size-5 text-primary" />
                    <div className="flex-1 space-y-1">
                      <p className="font-medium">{student.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {student.email}
                      </p>
                    </div>

                    <Separator orientation="vertical" />

                    <div className="hidden flex-1 space-y-1 md:block">
                      <p className="text-sm text-muted-foreground">
                        Student from:
                      </p>
                      <p>{student.classrooms.join(" & ")}</p>
                    </div>

                    <Separator orientation="vertical" />

                    <div className="flex items-center gap-2 md:block">
                      <p className="text-sm text-muted-foreground">Count:</p>
                      <Badge variant="secondary" className="font-normal">
                        {student.analyses.length}
                      </Badge>
                    </div>
                  </div>
                </>
              ))}

            {filesToMap &&
              filesToMap.map(([fileName, analyses]: any) => (
                <>
                  <div
                    onClick={() => {
                      handleSelectFile(analyses);
                    }}
                    className="flex gap-4 rounded-lg border p-4 transition-colors duration-300 hover:bg-accent"
                  >
                    <FileCode2 className="mt-1 size-5 text-primary" />
                    <div className="flex-1 space-y-1">
                      <p className="font-medium">{fileName}</p>
                    </div>

                    <Separator orientation="vertical" />

                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="font-normal">
                        {analyses.length} analyses
                      </Badge>
                    </div>
                  </div>
                </>
              ))}

            {analysesToMap &&
              analysesToMap.filter((analysis) => analysis.mode === "general")
                .length > 0 && (
                <p className="text-sm text-muted-foreground">General Mode</p>
              )}

            {analysesToMap &&
              analysesToMap
                .filter((analysis) => analysis.mode === "general")
                .map((analysis) => (
                  <>
                    <div
                      key={analysis.$id}
                      className="group flex cursor-pointer items-center gap-4 rounded-lg border bg-card/60 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-accent hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() =>
                        navigate(`/analyses/${analysis.id}`, {
                          state: {
                            studentName: selected.student?.name,
                            studentEmail: selected.student?.email,
                            classroomName:
                              selected.student?.classrooms.join(" & "),
                          },
                        })
                      }
                    >
                      <div className="flex-1 space-y-1">
                        <p className="flex items-center gap-2 text-sm text-muted-foreground">
                          <CalendarDays className="size-4 text-primary" />
                          Analyzed on
                        </p>
                        <p className="font-medium">
                          {formatDate(analysis.createdAt)}
                        </p>
                      </div>
                      <Separator orientation="vertical" />

                      <div className="flex-1 space-y-1">
                        <p className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock3 className="size-4 text-primary" />
                          Analyzed at
                        </p>
                        <p className="font-medium">
                          {formatTime(analysis.createdAt)}
                        </p>
                      </div>
                      <ArrowRight className="size-5 text-muted-foreground transition-transform duration-300 group-hover:translate-x-1 group-hover:text-primary" />
                    </div>
                  </>
                ))}

            {analysesToMap &&
              analysesToMap.filter((analysis) => analysis.mode === "oop")
                .length > 0 && (
                <p className="text-sm text-muted-foreground mt-4">OOP Mode</p>
              )}

            {analysesToMap &&
              analysesToMap
                .filter((analysis) => analysis.mode === "oop")
                .map((analysis) => (
                  <>
                    <div
                      key={analysis.$id}
                      className="group flex cursor-pointer items-center gap-4 rounded-lg border bg-card/60 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-accent hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() =>
                        navigate(`/analyses/${analysis.id}`, {
                          state: {
                            studentName: selected.student?.name,
                            studentEmail: selected.student?.email,
                            classroomName:
                              selected.student?.classrooms.join(" & "),
                          },
                        })
                      }
                    >
                      <div className="flex-1 space-y-1">
                        <p className="flex items-center gap-2 text-sm text-muted-foreground">
                          <CalendarDays className="size-4 text-primary" />
                          Analyzed on
                        </p>
                        <p className="font-medium">
                          {formatDate(analysis.createdAt)}
                        </p>
                      </div>
                      <Separator orientation="vertical" />

                      <div className="flex-1 space-y-1">
                        <p className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock3 className="size-4 text-primary" />
                          Analyzed at
                        </p>
                        <p className="font-medium">
                          {formatTime(analysis.createdAt)}
                        </p>
                      </div>
                      <ArrowRight className="size-5 text-muted-foreground transition-transform duration-300 group-hover:translate-x-1 group-hover:text-primary" />
                    </div>
                  </>
                ))}

            {analysesToMap &&
              analysesToMap.filter((analysis) => analysis.mode === "complexity")
                .length > 0 && (
                <p className="text-sm text-muted-foreground mt-4">
                  Complexity Mode
                </p>
              )}

            {analysesToMap &&
              analysesToMap
                .filter((analysis) => analysis.mode === "complexity")
                .map((analysis) => (
                  <>
                    <div
                      key={analysis.$id}
                      className="group flex cursor-pointer items-center gap-4 rounded-lg border bg-card/60 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-accent hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() =>
                        navigate(`/complexities/${analysis.id}`, {
                          state: {
                            studentName: selected.student?.name,
                            studentEmail: selected.student?.email,
                            classroomName:
                              selected.student?.classrooms.join(" & "),
                          },
                        })
                      }
                    >
                      <div className="flex-1 space-y-1">
                        <p className="flex items-center gap-2 text-sm text-muted-foreground">
                          <CalendarDays className="size-4 text-primary" />
                          Analyzed on
                        </p>
                        <p className="font-medium">
                          {formatDate(analysis.createdAt)}
                        </p>
                      </div>
                      <Separator orientation="vertical" />

                      <div className="flex-1 space-y-1">
                        <p className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock3 className="size-4 text-primary" />
                          Analyzed at
                        </p>
                        <p className="font-medium">
                          {formatTime(analysis.createdAt)}
                        </p>
                      </div>
                      <ArrowRight className="size-5 text-muted-foreground transition-transform duration-300 group-hover:translate-x-1 group-hover:text-primary" />
                    </div>
                  </>
                ))}
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
