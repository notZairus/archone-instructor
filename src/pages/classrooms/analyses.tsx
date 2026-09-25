import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useClassroomContext } from "@/contexts/classroomContext";
import { getClassroomStudents, getUserAnalyses } from "@/lib/db";
import type { Analysis, Student } from "@/types/global";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ClipboardList,
  Clock3,
  FileCode2,
  Search,
  Users,
} from "lucide-react";

type ClassroomStudent = Student & {
  analyses: Analysis[];
};

const ClassroomAnalyses = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { classrooms } = useClassroomContext();
  const classroom = classrooms.find((item) => item.$id === id);
  const [students, setStudents] = useState<ClassroomStudent[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    null,
  );
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchClassroomAnalyses = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const classroomStudents = await getClassroomStudents(id);
        const acceptedStudents = classroomStudents.filter(
          (student) => student.accepted,
        );
        const studentsWithAnalyses = await Promise.all(
          acceptedStudents.map(async (student) => ({
            ...student,
            analyses: (await getUserAnalyses(student.$id)) as Analysis[],
          })),
        );

        setStudents(studentsWithAnalyses);
      } catch {
        setError("Could not load classroom analyses right now.");
      } finally {
        setIsLoading(false);
      }
    };

    void fetchClassroomAnalyses();
  }, [id]);

  const selectedStudent = students.find(
    (student) => student.$id === selectedStudentId,
  );

  const allFiles = useMemo(() => {
    if (!selectedStudent) return [];

    const grouped = new Map<string, Analysis[]>();
    selectedStudent.analyses.forEach((analysis) => {
      const existing = grouped.get(analysis.fileName) || [];
      grouped.set(analysis.fileName, [...existing, analysis]);
    });

    return Array.from(grouped.entries());
  }, [selectedStudent]);

  const files = allFiles.filter(([fileName]) =>
    fileName.toLowerCase().includes(query.toLowerCase().trim()),
  );

  const selectedFileAnalyses = selectedFileName
    ? allFiles.find(([fileName]) => fileName === selectedFileName)?.[1] || []
    : [];

  const filteredStudents = students.filter((student) => {
    const normalizedQuery = query.toLowerCase().trim();
    if (!normalizedQuery) return true;

    return (
      student.name.toLowerCase().includes(normalizedQuery) ||
      student.email.toLowerCase().includes(normalizedQuery)
    );
  });

  const selectStudent = (studentId: string) => {
    setSelectedStudentId(studentId);
    setSelectedFileName(null);
    setQuery("");
  };

  const selectFile = (fileName: string) => {
    setSelectedFileName(fileName);
    setQuery("");
  };

  const openAnalysis = (analysis: Analysis) => {
    const destination =
      analysis.mode === "complexity"
        ? `/complexities/${analysis.id}`
        : `/analyses/${analysis.id}`;

    navigate(destination, {
      state: {
        studentName: selectedStudent?.name,
        studentEmail: selectedStudent?.email,
        classroomName: classroom?.name,
      },
    });
  };

  if (!classroom) {
    return (
      <div className="min-h-screen bg-background p-6 md:p-10">
        <Card className="mx-auto w-full max-w-5xl">
          <CardHeader>
            <CardTitle>Classroom not found</CardTitle>
            <CardDescription>
              We could not find the classroom you are trying to view.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-3 border-b pb-6 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <ClipboardList className="size-4" />
              <span>Classroom workspace</span>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
              {classroom.name} Analyses
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              Analysis records from students in this classroom.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to={`/classes/${classroom.$id}`}>
              <ArrowLeft />
              Back to Classroom
            </Link>
          </Button>
        </header>

        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-muted/20 pb-5">
            <CardTitle className="flex items-center gap-2">
              <Search className="size-5 text-primary" />
              Classroom Analysis Records
            </CardTitle>
            <CardDescription>
              Select an accepted student, then choose a file to view its
              analysis records.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="bg-background"
                placeholder={
                  selectedStudent
                    ? "Search file name..."
                    : "Search student name or email..."
                }
              />
            </div>

            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : selectedFileName ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3 border-b pb-3">
                  <div>
                    <p className="flex items-center gap-2 font-medium">
                      <FileCode2 className="size-5 text-primary" />
                      {selectedFileName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedStudent?.name}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setSelectedFileName(null)}
                  >
                    <ArrowLeft />
                    Back to Files
                  </Button>
                </div>

                {selectedFileAnalyses.map((analysis) => (
                  <button
                    key={analysis.id}
                    type="button"
                    className="group flex w-full items-center gap-4 rounded-lg border bg-card/60 p-4 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-accent hover:shadow-sm"
                    onClick={() => openAnalysis(analysis)}
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
                        Mode
                      </p>
                      <p className="capitalize">{analysis.mode}</p>
                    </div>
                    <ArrowRight className="size-5 text-muted-foreground transition-transform duration-300 group-hover:translate-x-1 group-hover:text-primary" />
                  </button>
                ))}
              </div>
            ) : selectedStudent ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3 border-b pb-3">
                  <div>
                    <p className="flex items-center gap-2 font-medium">
                      <Users className="size-5 text-primary" />
                      {selectedStudent.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedStudent.email}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setSelectedStudentId(null)}
                  >
                    <ArrowLeft />
                    Back to Students
                  </Button>
                </div>

                {files.length ? (
                  files.map(([fileName, analyses]) => (
                    <button
                      key={fileName}
                      type="button"
                      className="group flex w-full items-center justify-between rounded-lg border p-4 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-accent hover:shadow-sm"
                      onClick={() => selectFile(fileName)}
                    >
                      <span className="flex items-center gap-3 font-medium">
                        <FileCode2 className="size-5 text-primary" />
                        {fileName}
                      </span>
                      <span className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="secondary" className="font-normal">
                          {analyses.length}{" "}
                          {analyses.length === 1 ? "analysis" : "analyses"}
                        </Badge>
                        <ArrowRight className="size-5 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-primary" />
                      </span>
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No analysis files found for this student.
                  </p>
                )}
              </div>
            ) : filteredStudents.length ? (
              <div className="space-y-3">
                {filteredStudents.map((student) => (
                  <button
                    key={student.$id}
                    type="button"
                    className="group flex w-full items-center justify-between rounded-lg border p-4 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-accent hover:shadow-sm"
                    onClick={() => selectStudent(student.$id)}
                  >
                    <div className="flex items-start gap-3">
                      <Users className="mt-0.5 size-5 text-primary" />
                      <div>
                        <p className="font-medium">{student.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {student.email}
                        </p>
                      </div>
                    </div>
                    <span className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Badge variant="secondary" className="font-normal">
                        {student.analyses.length} analyses
                      </Badge>
                      <ArrowRight className="size-5 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-primary" />
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No accepted students or analyses found.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default ClassroomAnalyses;
