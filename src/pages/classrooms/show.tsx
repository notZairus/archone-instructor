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
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useEffect, useState } from "react";
import { acceptClassroomStudent, getClassroomStudents } from "@/lib/db";
import { toast } from "sonner";

const ClassroomShow = () => {
  const { id } = useParams();
  const { classrooms } = useClassroomContext();
  const [students, setStudents] = useState<Student[]>([]);

  const classroom = classrooms.find((c) => c.$id === id);

  useEffect(() => {
    const fetchStudents = async () => {
      if (!id) return;
      const result = await getClassroomStudents(id);
      setStudents(result);
    };

    fetchStudents();
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

                  <Sheet>
                    <SheetTrigger asChild>
                      <Button size="sm">Show Stats</Button>
                    </SheetTrigger>
                    <SheetContent side="bottom">
                      <SheetHeader>
                        <SheetTitle>{student.name}</SheetTitle>
                        <SheetDescription>
                          Stats summary for this student.
                        </SheetDescription>
                      </SheetHeader>

                      <div className="space-y-3 p-4 text-sm">
                        <div className="grid grid-cols-2 gap-3">
                          <Card size="sm">
                            <CardContent className="space-y-1 p-3">
                              <p className="text-xs text-muted-foreground">
                                Label
                              </p>
                              <p className="text-xl font-medium">Value</p>
                            </CardContent>
                          </Card>

                          <Card size="sm">
                            <CardContent className="space-y-1 p-3">
                              <p className="text-xs text-muted-foreground">
                                Label
                              </p>
                              <p className="text-xl font-medium">Value</p>
                            </CardContent>
                          </Card>
                        </div>

                        <Separator />

                        <div className="space-y-2">
                          <p className="flex items-center justify-between">
                            <span className="text-muted-foreground">Label</span>
                            <span className="font-medium">Value</span>
                          </p>
                          <p className="flex items-center justify-between">
                            <span className="text-muted-foreground">Label</span>
                            <span className="font-medium">Value</span>
                          </p>
                          <p className="flex items-center justify-between">
                            <span className="text-muted-foreground">Label</span>
                            <span className="font-medium">Value</span>
                          </p>
                          <p className="flex items-center justify-between">
                            <span className="text-muted-foreground">Label</span>
                            <span className="font-medium">Value</span>
                          </p>
                          <p className="flex items-center justify-between">
                            <span className="text-muted-foreground">Label</span>
                            <span className="font-medium">Value</span>
                          </p>
                          <p className="flex items-center justify-between">
                            <span className="text-muted-foreground">Label</span>
                            <span className="font-medium">Value</span>
                          </p>
                        </div>
                      </div>
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

export default ClassroomShow;
