import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DialogClose,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useClassroomContext } from "@/contexts/classroomContext";
import {
  acceptClassroomStudent,
  declineClassroomStudent,
  getClassroomStudents,
  saveClassroom,
  getUserAnalyses,
} from "@/lib/db";
import { createClassroomCode } from "@/lib/helpers";
import { useAuthContext } from "@/contexts/authContext";
import { toast } from "sonner";
import type { Student, Analysis, Classroom } from "@/types/global";

type PendingStudentViewModel = {
  studentId: string;
  studentName: string;
  studentEmail: string;
};

type PendingClassroomViewModel = {
  classroomId: string;
  classroomName: string;
  pendingStudents: PendingStudentViewModel[];
};

type ClassroomForm = {
  name: string;
  description: string;
};

const emptyClassroomForm: ClassroomForm = {
  name: "",
  description: "",
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [waitingStudents, setWaitingStudents] = useState(0);
  const [acceptedStudents, setAcceptedStudents] = useState(0);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [isCreateClassroomModalOpen, setIsCreateClassroomModalOpen] =
    useState(false);
  const [classroomForm, setClassroomForm] =
    useState<ClassroomForm>(emptyClassroomForm);
  const [isCreatingClassroom, setIsCreatingClassroom] = useState(false);
  const [isPendingModalOpen, setIsPendingModalOpen] = useState(false);
  const [pendingByClassroom, setPendingByClassroom] = useState<
    PendingClassroomViewModel[]
  >([]);
  const [isLoadingPending, setIsLoadingPending] = useState(false);
  const [pendingError, setPendingError] = useState<string | null>(null);
  const [pendingActionLoading, setPendingActionLoading] = useState<
    Record<string, boolean>
  >({});
  const { classrooms, setClassrooms } = useClassroomContext();
  const { authUser } = useAuthContext();
  const [analyses, setAnalyses] = useState<Analysis[]>([]);

  const fetchDashboardStats = useCallback(async () => {
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
      throw new Error("dashboard-stats-load-failed");
    } finally {
      setIsLoadingStats(false);
    }
  }, [classrooms]);

  useEffect(() => {
    async function fetchAnalyses() {
      try {
        const students: Student[] = [];
        const analysesList: Analysis[] = [];

        for (const classroom of classrooms) {
          const classroomStudents = await getClassroomStudents(classroom.$id);
          classroomStudents.forEach((student) => {
            if (!students.some((s) => s.$id === student.$id)) {
              students.push(student);
            }
          });
        }

        for (const student of students) {
          const studentAnalyses: any = await getUserAnalyses(student.$id);
          analysesList.push(...studentAnalyses);
        }

        setAnalyses(analysesList);
      } catch (err) {
        console.error(err);
      }
    }

    fetchAnalyses();
  }, [classrooms]);

  useEffect(() => {
    void fetchDashboardStats();
  }, [fetchDashboardStats]);

  const handleRefreshAnalytics = async () => {
    if (isLoadingStats) {
      return;
    }

    try {
      await fetchDashboardStats();
      toast.success("Dashboard refreshed");
    } catch {
      toast.error("Could not refresh dashboard");
    }
  };

  const handleCreateClassroomOpen = () => {
    setIsCreateClassroomModalOpen(true);
  };

  const handleClassroomFormValueChange = (
    key: keyof ClassroomForm,
    value: ClassroomForm[keyof ClassroomForm],
  ) => {
    setClassroomForm((current) => ({ ...current, [key]: value }));
  };

  const handleCreateClassroom = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (isCreatingClassroom) {
      return;
    }

    const name = classroomForm.name.trim();
    if (!name) {
      toast.error("Classroom name is required");
      return;
    }
    if (name.length < 3) {
      toast.error("Classroom name must be at least 3 characters");
      return;
    }
    if (name.length > 50) {
      toast.error("Classroom name must be at most 50 characters");
      return;
    }

    const description = classroomForm.description.trim();
    if (!description) {
      toast.error("Classroom description is required");
      return;
    }
    if (description.length < 10) {
      toast.error("Classroom description must be at least 10 characters");
      return;
    }
    if (description.length > 200) {
      toast.error("Classroom description must be at most 200 characters");
      return;
    }

    setIsCreatingClassroom(true);

    try {
      const newClassroom = (await saveClassroom(
        authUser.$id,
        name,
        description,
        createClassroomCode(name),
      )) as unknown as Classroom;

      setClassrooms((current) => [...current, newClassroom]);
      setClassroomForm(emptyClassroomForm);
      setIsCreateClassroomModalOpen(false);

      toast.success("Classroom created", {
        description: "Students can now join with code.",
      });
    } catch {
      toast.error("Could not create classroom");
    } finally {
      setIsCreatingClassroom(false);
    }
  };

  const fetchPendingRequests = useCallback(async () => {
    if (!classrooms.length) {
      setPendingByClassroom([]);
      setPendingError(null);
      setIsLoadingPending(false);
      return;
    }

    setIsLoadingPending(true);
    setPendingError(null);

    try {
      const grouped = await Promise.all(
        classrooms.map(async (classroom) => {
          const students = await getClassroomStudents(classroom.$id);
          const pendingStudents = students
            .filter((student) => !student.accepted)
            .map((student) => ({
              studentId: student.$id,
              studentName: student.name,
              studentEmail: student.email,
            }));

          return {
            classroomId: classroom.$id,
            classroomName: classroom.name,
            pendingStudents,
          } satisfies PendingClassroomViewModel;
        }),
      );

      setPendingByClassroom(
        grouped.filter((entry) => entry.pendingStudents.length > 0),
      );
    } catch {
      setPendingError("Could not load pending classroom requests right now.");
    } finally {
      setIsLoadingPending(false);
    }
  }, [classrooms]);

  const handleReviewPendingOpen = () => {
    setIsPendingModalOpen(true);
    void fetchPendingRequests();
  };

  const handleRefreshPendingRequests = async () => {
    if (isLoadingPending) {
      return;
    }

    await fetchPendingRequests();
  };

  const handleOpenClassroom = (classroomId: string) => {
    setIsPendingModalOpen(false);
    navigate(`/classrooms/${classroomId}`);
  };

  const handlePendingDecision = async (
    classroomId: string,
    student: PendingStudentViewModel,
    action: "accept" | "decline",
  ) => {
    const loadingKey = `${classroomId}:${student.studentId}`;

    if (pendingActionLoading[loadingKey]) {
      return;
    }

    setPendingActionLoading((current) => ({ ...current, [loadingKey]: true }));

    try {
      if (action === "accept") {
        await acceptClassroomStudent(classroomId, student.studentId);
      } else {
        await declineClassroomStudent(classroomId, student.studentId);
      }

      setPendingByClassroom((current) =>
        current
          .map((entry) => {
            if (entry.classroomId !== classroomId) {
              return entry;
            }

            return {
              ...entry,
              pendingStudents: entry.pendingStudents.filter(
                (pendingStudent) =>
                  pendingStudent.studentId !== student.studentId,
              ),
            };
          })
          .filter((entry) => entry.pendingStudents.length > 0),
      );

      toast.success(
        action === "accept"
          ? `${student.studentName} accepted`
          : `${student.studentName} declined`,
      );

      await fetchDashboardStats();
    } catch {
      toast.error(
        action === "accept"
          ? `Could not accept ${student.studentName}`
          : `Could not decline ${student.studentName}`,
      );
    } finally {
      setPendingActionLoading((current) => {
        const next = { ...current };
        delete next[loadingKey];
        return next;
      });
    }
  };

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-end">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Instructor Dashboard
            </h1>
            <p className="text-sm text-muted-foreground">
              Overview of your classrooms and students.
            </p>
          </div>
        </header>

        <section
          className="flex flex-wrap items-center gap-2"
          aria-label="Quick actions"
        >
          <Button
            type="button"
            variant="secondary"
            size="lg"
            className="hover:scale-105"
            onClick={handleCreateClassroomOpen}
            aria-label="Create classroom"
          >
            Create Classroom
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="hover:scale-105"
            onClick={handleReviewPendingOpen}
            aria-label="Review pending classroom requests"
          >
            Review Pending
          </Button>
          <Button
            variant="secondary"
            className="hover:scale-105"
            onClick={() => void handleRefreshAnalytics()}
            disabled={isLoadingStats}
            aria-label="Refresh dashboard analytics"
          >
            {isLoadingStats ? "Refreshing..." : "Refresh"}
          </Button>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="">
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

          <Card className="">
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

          <Card className="">
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

        <Dialog
          open={isCreateClassroomModalOpen}
          onOpenChange={setIsCreateClassroomModalOpen}
        >
          <DialogContent className="bg-card border p-0 text-foreground">
            <DialogHeader>
              <DialogTitle>Create Classroom</DialogTitle>
              <DialogDescription>
                Set up a classroom and share the join code with students.
              </DialogDescription>
            </DialogHeader>

            <form
              onSubmit={handleCreateClassroom}
              className="space-y-4 px-4 pb-4"
            >
              <div className="space-y-2">
                <Label htmlFor="dashboard-classroom-name">Classroom Name</Label>
                <Input
                  id="dashboard-classroom-name"
                  value={classroomForm.name}
                  onChange={(event) =>
                    handleClassroomFormValueChange("name", event.target.value)
                  }
                  placeholder="e.g. Intro to Programming"
                  disabled={isCreatingClassroom}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dashboard-classroom-description">
                  Classroom Description
                </Label>
                <Textarea
                  id="dashboard-classroom-description"
                  value={classroomForm.description}
                  onChange={(event) =>
                    handleClassroomFormValueChange(
                      "description",
                      event.target.value,
                    )
                  }
                  placeholder="e.g. Intro to coding fundamentals for first-year students"
                  disabled={isCreatingClassroom}
                />
              </div>

              <DialogFooter className="p-0">
                <Button
                  type="submit"
                  className="reflective-primary rounded-lg"
                  disabled={isCreatingClassroom}
                >
                  {isCreatingClassroom ? "Creating..." : "Create Classroom"}
                </Button>
                <DialogClose asChild>
                  <Button
                    type="button"
                    variant="secondary"
                    className="reflective rounded-lg"
                    disabled={isCreatingClassroom}
                  >
                    Cancel
                  </Button>
                </DialogClose>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isPendingModalOpen} onOpenChange={setIsPendingModalOpen}>
          <DialogContent
            className="max-h-[85vh] p-0 bg-card border"
            aria-label="Pending classroom requests"
          >
            <DialogHeader>
              <DialogTitle>Pending Requests</DialogTitle>
              <DialogDescription>
                Review who is requesting acceptance in each classroom.
              </DialogDescription>
            </DialogHeader>

            <div className="px-4">
              <ScrollArea className="h-[50vh] pr-3 pb-4">
                {isLoadingPending ? (
                  <div className="space-y-3">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                ) : pendingError ? (
                  <Card>
                    <CardContent className="space-y-3 p-4">
                      <p className="text-sm text-destructive">{pendingError}</p>
                      <Button
                        type="button"
                        onClick={() => void handleRefreshPendingRequests()}
                        disabled={isLoadingPending}
                        aria-label="Retry loading pending requests"
                      >
                        Retry
                      </Button>
                    </CardContent>
                  </Card>
                ) : pendingByClassroom.length === 0 ? (
                  <div className="text-center text-muted-foreground mt-20">
                    No pending requests at the moment.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingByClassroom.map((entry) => (
                      <Card key={entry.classroomId}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">
                            {entry.classroomName}
                          </CardTitle>
                          <CardDescription>
                            {entry.pendingStudents.length} pending request
                            {entry.pendingStudents.length > 1 ? "s" : ""}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {entry.pendingStudents.map((student) => (
                            <article
                              key={student.studentId}
                              className="flex flex-wrap items-center justify-between gap-2 border p-3"
                            >
                              <div>
                                <p className="font-medium">
                                  {student.studentName}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {student.studentEmail}
                                </p>
                              </div>

                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    void handlePendingDecision(
                                      entry.classroomId,
                                      student,
                                      "decline",
                                    )
                                  }
                                  disabled={
                                    !!pendingActionLoading[
                                      `${entry.classroomId}:${student.studentId}`
                                    ]
                                  }
                                  aria-label={`Decline ${student.studentName}`}
                                >
                                  Decline
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() =>
                                    void handlePendingDecision(
                                      entry.classroomId,
                                      student,
                                      "accept",
                                    )
                                  }
                                  disabled={
                                    !!pendingActionLoading[
                                      `${entry.classroomId}:${student.studentId}`
                                    ]
                                  }
                                  aria-label={`Accept ${student.studentName}`}
                                >
                                  {pendingActionLoading[
                                    `${entry.classroomId}:${student.studentId}`
                                  ]
                                    ? "Saving..."
                                    : "Accept"}
                                </Button>
                              </div>
                            </article>
                          ))}

                          <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                              handleOpenClassroom(entry.classroomId)
                            }
                            aria-label={`Open classroom ${entry.classroomName}`}
                          >
                            Open Classroom
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>

            <DialogFooter>
              <Button
                type="button"
                className="reflective-primary rounded-lg"
                onClick={() => void handleRefreshPendingRequests()}
                disabled={isLoadingPending}
                aria-label="Refresh pending requests"
              >
                {isLoadingPending ? "Refreshing..." : "Refresh"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Dashboard;
