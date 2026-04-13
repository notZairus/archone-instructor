import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Activity = {
  id: number;
  title: string;
  details: string;
  time: string;
};

const activities: Activity[] = [
  {
    id: 1,
    title: "CS101 - Intro to Algorithms",
    details: "32 students submitted quiz 4",
    time: "10 mins ago",
  },
  {
    id: 2,
    title: "Office Hours",
    details: "3 new booking requests pending",
    time: "28 mins ago",
  },
  {
    id: 3,
    title: "DSA Section B",
    details: "Attendance marked for today",
    time: "1 hour ago",
  },
  {
    id: 4,
    title: "Course Feedback",
    details: "2 students left comments",
    time: "2 hours ago",
  },
];

const Dashboard = () => {
  const [query, setQuery] = useState("");

  const filteredActivities = useMemo(() => {
    if (!query.trim()) return activities;

    const normalized = query.toLowerCase();
    return activities.filter(
      (item) =>
        item.title.toLowerCase().includes(normalized) ||
        item.details.toLowerCase().includes(normalized),
    );
  }, [query]);

  const handleCreateAnnouncement = () => {
    toast.success("Announcement drafted", {
      description: "Your message has been saved as a draft.",
    });
  };

  const handleExport = () => {
    toast("Export started", {
      description: "We are preparing your dashboard report.",
    });
  };

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Instructor Dashboard
            </h1>
            <p className="text-sm text-muted-foreground">
              Quick snapshot of class activity and pending tasks.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport}>
              Export Report
            </Button>
            <Button onClick={handleCreateAnnouncement}>New Announcement</Button>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Students</CardDescription>
              <CardTitle className="text-3xl">128</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">+12 this month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Active Courses</CardDescription>
              <CardTitle className="text-3xl">6</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                2 with upcoming exams
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Pending Reviews</CardDescription>
              <CardTitle className="text-3xl">17</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Assignments to grade today
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Attendance Rate</CardDescription>
              <CardTitle className="text-3xl">94%</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                +3% compared to last week
              </p>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Search and review classroom updates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Search activity..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />

              <div className="space-y-2">
                {filteredActivities.length === 0 ? (
                  <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                    No activity matched your search.
                  </p>
                ) : (
                  filteredActivities.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-md border bg-card p-4 transition-colors hover:bg-accent/30"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-medium">{item.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.details}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {item.time}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Today</CardTitle>
              <CardDescription>Upcoming schedule</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="rounded-md border p-3">
                <p className="font-medium">09:00 AM - CS101</p>
                <p className="text-muted-foreground">Room A12</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="font-medium">01:00 PM - Office Hours</p>
                <p className="text-muted-foreground">Faculty Hall</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="font-medium">03:30 PM - DSA Section B</p>
                <p className="text-muted-foreground">Lab 2</p>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
