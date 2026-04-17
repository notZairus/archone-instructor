import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Link } from "react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { saveClassroom } from "@/lib/db";
import { createClassroomCode } from "@/lib/helpers";
import { useAuthContext } from "@/contexts/authContext";
import { useClassroomContext } from "@/contexts/classroomContext";

type ClassroomForm = {
  name: string;
  description: string;
};

const emptyForm: ClassroomForm = {
  name: "",
  description: "",
};

const Classrooms = () => {
  const [form, setForm] = useState<ClassroomForm>(emptyForm);
  const [query, setQuery] = useState("");
  const { classrooms, setClassrooms } = useClassroomContext();
  const { authUser } = useAuthContext();

  const filteredClassrooms = useMemo(() => {
    if (!query.trim()) return classrooms;

    const normalizedQuery = query.toLowerCase();
    return classrooms.filter(
      (classroom) =>
        classroom.name.toLowerCase().includes(normalizedQuery) ||
        classroom.description.toLowerCase().includes(normalizedQuery) ||
        classroom.code.toLowerCase().includes(normalizedQuery),
    );
  }, [classrooms, query]);

  const handleCreateClassroom = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const name = form.name.trim();
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

    const description = form.description.trim();
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

    // save to database
    const newClassroom = (await saveClassroom(
      authUser.$id,
      name,
      description,
      createClassroomCode(name),
    )) as unknown as Classroom;

    setClassrooms((current) => [...current, newClassroom]);

    setForm(emptyForm);

    toast.success("Classroom created", {
      description: `Students can now join with code.`,
    });
  };

  const handleFormValueChange = (
    key: keyof ClassroomForm,
    value: ClassroomForm[keyof ClassroomForm],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleCopyJoinCode = async (joinCode: string) => {
    try {
      await navigator.clipboard.writeText(joinCode);
      toast.success("Join code copied", {
        description: `Share ${joinCode} with your students.`,
      });
    } catch {
      toast.error("Could not copy join code");
    }
  };

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Classrooms
            </h1>
            <p className="text-sm text-muted-foreground">
              Create classes, share join codes, and track enrollment at a
              glance.
            </p>
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Create Classroom</CardTitle>
              <CardDescription>Set up a classroom</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateClassroom} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="classroom-name">Classroom Name</Label>
                  <Input
                    id="classroom-name"
                    value={form.name}
                    onChange={(event) =>
                      handleFormValueChange("name", event.target.value)
                    }
                    placeholder="e.g. Intro to Programming"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="classroom-description">
                    Classroom Description
                  </Label>
                  <Textarea
                    id="classroom-description"
                    value={form.description}
                    onChange={(event) =>
                      handleFormValueChange("description", event.target.value)
                    }
                    placeholder="e.g. Intro to coding fundamentals for first-year students"
                  />
                </div>

                <Button type="submit" className="w-full">
                  Create Classroom
                </Button>
              </form>

              <Separator className="my-4" />

              <p className="text-xs text-muted-foreground">
                After creating a classroom, share the generated classroom code
                so students can join.
              </p>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Your Classrooms</CardTitle>
              <CardDescription>
                Search by name, description, or classroom code.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search classrooms..."
              />

              <div className="space-y-2">
                {filteredClassrooms.length === 0 ? (
                  <p className="rounded-none border border-dashed p-4 text-sm text-muted-foreground">
                    No classrooms match your search.
                  </p>
                ) : (
                  filteredClassrooms.map((classroom) => (
                    <article className="border p-4" key={classroom.$id}>
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-1">
                          <Link
                            to={`/classrooms/${classroom.$id}`}
                            className="hover:underline"
                          >
                            <h3 className="font-medium">{classroom.name}</h3>
                            <p className="text-xs text-muted-foreground">
                              {classroom.description}
                            </p>
                          </Link>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCopyJoinCode(classroom.code)}
                          >
                            Copy Join Code
                          </Button>
                        </div>
                      </div>

                      <Separator className="my-3" />

                      <div className="grid gap-2 sm:grid-cols-2  text-xs">
                        <p>
                          Join Code:{" "}
                          <span className="font-medium">{classroom.code}</span>
                        </p>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
};

export default Classrooms;
