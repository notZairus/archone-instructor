import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import {
  Search,
  MessageSquareText,
  ArrowRight,
  CalendarDays,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthContext } from "@/contexts/authContext";
import { getAnalysisById, getInstructorFeedback, getUserById } from "@/lib/db";
import type { Feedback } from "@/types/global";

type FeedbackListItem = Feedback & {
  studentName: string;
  studentEmail: string;
  mode: string;
};

const formatDate = (date: string | undefined) => {
  if (!date) return "Unknown date";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
};

const FeedbackPage = () => {
  const { authUser } = useAuthContext();
  const [feedback, setFeedback] = useState<FeedbackListItem[]>([]);
  const [query, setQuery] = useState("");
  const [expandedCodeIds, setExpandedCodeIds] = useState<Set<string>>(
    new Set(),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authUser?.$id) return;

    const loadFeedback = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const rows = (await getInstructorFeedback(
          authUser.$id,
        )) as unknown as Feedback[];
        const feedbackItems = await Promise.all(
          rows.map(async (item) => {
            const [student, analysis] = await Promise.all([
              getUserById(item.studentId),
              getAnalysisById(item.analysisId),
            ]);

            return {
              ...item,
              studentName: String(student.name || "Unknown student"),
              studentEmail: String(student.email || ""),
              mode: String(analysis?.mode || "analysis"),
            };
          }),
        );

        setFeedback(feedbackItems);
      } catch {
        setError("Could not load your feedback right now.");
      } finally {
        setIsLoading(false);
      }
    };

    void loadFeedback();
  }, [authUser?.$id]);

  const filteredFeedback = useMemo(() => {
    const normalizedQuery = query.toLowerCase().trim();
    if (!normalizedQuery) return feedback;

    return feedback.filter((item) =>
      [item.message, item.fileName, item.studentName, item.studentEmail]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [feedback, query]);

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-3 border-b pb-6">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <MessageSquareText className="size-4" />
            <span>Instructor workspace</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Feedback
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Review every feedback note you have sent to students.
          </p>
        </header>

        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-muted/20 pb-5">
            <CardTitle className="flex items-center gap-2">
              <Search className="size-5 text-primary" />
              Feedback history
            </CardTitle>
            <CardDescription>
              Search by student, file name, or feedback message.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search feedback..."
              className="bg-background"
            />

            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : filteredFeedback.length === 0 ? (
              <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                {query
                  ? "No feedback matches your search."
                  : "You have not sent any feedback yet."}
              </p>
            ) : (
              <div className="space-y-3">
                {filteredFeedback.map((item) => {
                  const destination =
                    item.mode === "complexity"
                      ? `/complexities/${item.analysisId}`
                      : `/analyses/${item.analysisId}`;
                  const isCodeExpanded = expandedCodeIds.has(item.$id);

                  return (
                    <div
                      key={item.$id}
                      className="rounded-lg border bg-card/60 p-4 transition-colors hover:border-primary/40 hover:bg-accent/50"
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary">
                              {item.studentName}
                            </Badge>
                            <Badge variant="outline" className="capitalize">
                              {item.mode}
                            </Badge>
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <CalendarDays className="size-3.5" />
                              {formatDate(item.$createdAt)}
                            </span>
                          </div>
                          <p className="font-medium">{item.fileName}</p>
                          <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                            {item.message}
                          </p>
                          <div className="relative w-full">
                            <pre
                              className={`${
                                isCodeExpanded ? "max-h-96" : "max-h-24"
                              } w-full overflow-auto rounded-md bg-muted/60 p-3 pr-12 text-xs text-muted-foreground`}
                            >
                              {item.highlightedCode}
                            </pre>
                            <button
                              type="button"
                              title={
                                isCodeExpanded
                                  ? "Collapse highlighted code"
                                  : "Expand highlighted code"
                              }
                              aria-label={
                                isCodeExpanded
                                  ? "Collapse highlighted code"
                                  : "Expand highlighted code"
                              }
                              onClick={() =>
                                setExpandedCodeIds((current) => {
                                  const next = new Set(current);
                                  if (next.has(item.$id)) {
                                    next.delete(item.$id);
                                  } else {
                                    next.add(item.$id);
                                  }
                                  return next;
                                })
                              }
                              className="absolute right-2 top-2 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                            >
                              {isCodeExpanded ? (
                                <Minimize2 className="size-4" />
                              ) : (
                                <Maximize2 className="size-4" />
                              )}
                            </button>
                          </div>
                        </div>
                        <Link
                          to={destination}
                          className="inline-flex shrink-0 items-center gap-2 text-sm font-medium text-primary hover:underline"
                        >
                          View analysis
                          <ArrowRight className="size-4" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FeedbackPage;
