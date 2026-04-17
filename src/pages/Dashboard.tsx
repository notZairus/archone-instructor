import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useClassroomContext } from "@/contexts/classroomContext";
import { getClassroomStudents } from "@/lib/db";

const Dashboard = () => {
  const [waitingStudents, setWaitingStudents] = useState(0);
  const [acceptedStudents, setAcceptedStudents] = useState(0);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);
  const { classrooms } = useClassroomContext();

  useEffect(() => {
    const fetchDashboardStats = async () => {
      if (!classrooms.length) {
        setWaitingStudents(0);
        setAcceptedStudents(0);
        setStatsError(null);
        setIsLoadingStats(false);
        return;
      }

      setIsLoadingStats(true);
      setStatsError(null);

      try {
        const studentsByClassroom = await Promise.all(
          classrooms.map((classroom) => getClassroomStudents(classroom.$id)),
        );

        const mergedStudents = studentsByClassroom.flat();
        const uniqueStudents = new Map<string, Student>();

        for (const student of mergedStudents) {
          const existing = uniqueStudents.get(student.$id);
          if (!existing) {
            uniqueStudents.set(student.$id, student);
            continue;
          }

          uniqueStudents.set(student.$id, {
            ...existing,
            accepted: existing.accepted || student.accepted,
          });
        }

        const uniqueStudentList = Array.from(uniqueStudents.values());
        const waitingStudentCount = mergedStudents.filter(
          (student) => !student.accepted,
        ).length;

        setAcceptedStudents(
          uniqueStudentList.filter((student) => student.accepted).length,
        );
        setWaitingStudents(waitingStudentCount);
      } catch {
        setStatsError("Could not load classroom statistics right now.");
      } finally {
        setIsLoadingStats(false);
      }
    };

    void fetchDashboardStats();
  }, [classrooms]);

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-end">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Instructor Dashboard
            </h1>
            <p className="text-sm text-muted-foreground">
              Real-time overview of your classrooms and students.
            </p>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Classrooms Created</CardDescription>
              <CardTitle className="text-3xl">{classrooms.length}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Total classrooms under your account
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Accepted Students</CardDescription>
              <CardTitle className="text-3xl">
                {isLoadingStats ? "..." : acceptedStudents}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Accepted students across all classrooms
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Pending Classroom Acceptance</CardDescription>
              <CardTitle className="text-3xl">
                {isLoadingStats ? "..." : waitingStudents}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Students waiting for acceptance across all classrooms
              </p>
            </CardContent>
          </Card>
        </section>

        {statsError ? (
          <p className="text-sm text-destructive">{statsError}</p>
        ) : null}
      </div>
    </div>
  );
};

export default Dashboard;
