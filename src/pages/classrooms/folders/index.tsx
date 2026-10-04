import { useEffect, useState } from "react";
import type { ClassroomFolder } from "@/types/global";
import {
  ArrowLeft,
  CalendarDays,
  ClipboardList,
  FileCode2,
  FolderOpen,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useParams, Link } from "react-router";
import { useClassroomContext } from "@/contexts/classroomContext";
import {
  createFolder,
  deleteFolder,
  getFoldersByClassroomId,
  updateFolder,
} from "@/lib/db";
import FolderDialogContent, {
  type FolderFormValues,
} from "@/components/FolderDialogContent";
import ConfirmDialogContent from "@/components/ConfirmDialogContent";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";

const ClassroomFolders = () => {
  const { id } = useParams();
  const { classrooms } = useClassroomContext();
  const classroom = classrooms.find((item) => item.$id === id);
  const [folders, setFolders] = useState<ClassroomFolder[]>([]);
  const [isLoadingFolders, setIsLoadingFolders] = useState(true);
  const [foldersLoadError, setFoldersLoadError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<ClassroomFolder | null>(
    null,
  );
  const [isSavingFolder, setIsSavingFolder] = useState(false);
  const [folderError, setFolderError] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<ClassroomFolder | null>(
    null,
  );
  const [isDeletingFolder, setIsDeletingFolder] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    const loadFolders = async () => {
      setIsLoadingFolders(true);
      setFoldersLoadError(null);

      try {
        const rows = await getFoldersByClassroomId(classroom?.$id || "");
        setFolders(
          rows.map((folder) => ({
            id: folder.$id,
            name: folder.name,
            description: folder.description,
            targetFileNamePrefix: folder.targetFileNamePrefix,
            updatedAt: folder.$updatedAt || folder.$createdAt || "",
          })),
        );
      } catch {
        setFoldersLoadError("Could not load folders. Please try again.");
      } finally {
        setIsLoadingFolders(false);
      }
    };

    void loadFolders();
  }, []);

  const saveFolder = async (values: FolderFormValues) => {
    setIsSavingFolder(true);
    setFolderError(null);

    try {
      if (selectedFolder) {
        const folder = await updateFolder(selectedFolder.id, values);
        setFolders((currentFolders) =>
          currentFolders.map((currentFolder) =>
            currentFolder.id === folder.$id
              ? {
                  ...currentFolder,
                  name: folder.name,
                  description: folder.description,
                  targetFileNamePrefix: folder.targetFileNamePrefix,
                  updatedAt: folder.$updatedAt || currentFolder.updatedAt,
                }
              : currentFolder,
          ),
        );
      } else {
        const folder = await createFolder({
          ...values,
          classroomId: classroom?.$id || "",
        });

        setFolders((currentFolders) => [
          ...currentFolders,
          {
            id: folder.$id,
            name: folder.name,
            description: folder.description,
            targetFileNamePrefix: folder.targetFileNamePrefix,
            updatedAt: folder.$createdAt,
          },
        ]);
      }
      setIsDialogOpen(false);
    } catch {
      setFolderError(
        selectedFolder
          ? "Could not update the folder. Please try again."
          : "Could not create the folder. Please try again.",
      );
    } finally {
      setIsSavingFolder(false);
    }
  };

  const requestFolderDeletion = (folder: ClassroomFolder) => {
    setFolderToDelete(folder);
    setDeleteError(null);
    setIsDeleteDialogOpen(true);
  };

  const removeFolder = async () => {
    if (!folderToDelete) return;

    setIsDeletingFolder(true);
    setDeleteError(null);
    try {
      await deleteFolder(folderToDelete.id);
      setFolders((currentFolders) =>
        currentFolders.filter(
          (currentFolder) => currentFolder.id !== folderToDelete.id,
        ),
      );
      setIsDeleteDialogOpen(false);
      setFolderToDelete(null);
    } catch {
      setDeleteError("Could not delete the folder. Please try again.");
    } finally {
      setIsDeletingFolder(false);
    }
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
              <span>Classroom Workspace</span>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
              {classroom.name} Folders
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              Folders you created in this classroom to organize student
              analyses.
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
          <CardHeader className="flex flex-col gap-4 border-b bg-muted/20 pb-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="size-5 text-primary" />
                Classroom Folder Records
              </CardTitle>
              <CardDescription className="mt-1">
                Files matching each pattern will be grouped in its folder.
              </CardDescription>
            </div>
            <Dialog
              open={isDialogOpen}
              onOpenChange={(open) => {
                setIsDialogOpen(open);
                if (!open) {
                  setSelectedFolder(null);
                  setFolderError(null);
                }
              }}
            >
              <DialogTrigger asChild>
                <Button
                  onClick={() => {
                    setSelectedFolder(null);
                    setFolderError(null);
                  }}
                >
                  <Plus />
                  Add Folder
                </Button>
              </DialogTrigger>
              <FolderDialogContent
                key={selectedFolder?.id || "new-folder"}
                title="Add classroom folder"
                description={
                  selectedFolder
                    ? "Update this folder's configuration."
                    : "Create a folder to group matching student analysis files."
                }
                submitLabel={selectedFolder ? "Update Folder" : "Create Folder"}
                initialValues={{
                  name: selectedFolder?.name || "",
                  description: selectedFolder?.description || "",
                  targetFileNamePrefix:
                    selectedFolder?.targetFileNamePrefix || "",
                }}
                isSubmitting={isSavingFolder}
                error={folderError}
                onSubmit={saveFolder}
                onCancel={() => setIsDialogOpen(false)}
              />
            </Dialog>
            <Dialog
              open={isDeleteDialogOpen}
              onOpenChange={(open) => {
                setIsDeleteDialogOpen(open);
                if (!open) {
                  setFolderToDelete(null);
                  setDeleteError(null);
                }
              }}
            >
              <ConfirmDialogContent
                title="Delete folder?"
                description={`This will permanently delete ${folderToDelete?.name || "this folder"} and cannot be undone.`}
                confirmLabel="Delete Folder"
                isSubmitting={isDeletingFolder}
                error={deleteError}
                onConfirm={removeFolder}
                onCancel={() => setIsDeleteDialogOpen(false)}
              />
            </Dialog>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoadingFolders ? (
              <p className="text-sm text-muted-foreground">
                Loading folders...
              </p>
            ) : foldersLoadError ? (
              <p className="text-sm text-destructive">{foldersLoadError}</p>
            ) : folders.length ? (
              folders.map((folder) => (
                <div
                  key={folder.id}
                  className="flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <Link
                        to={`/classrooms/${classroom.$id}/folders/${folder.id}`}
                        className="block w-64 max-w-full wrap-break-word font-medium underline-offset-4 hover:text-primary hover:underline"
                      >
                        {folder.name}
                      </Link>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {folder.description}
                    </p>
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileCode2 className="size-4 text-primary" />
                      {folder.targetFileNamePrefix}
                    </p>
                  </div>
                  <p className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
                    <CalendarDays className="size-4 text-primary" />
                    Updated {formatDate(folder.updatedAt)}
                  </p>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Edit ${folder.name}`}
                      title={`Edit ${folder.name}`}
                      onClick={() => {
                        setSelectedFolder(folder);
                        setFolderError(null);
                        setIsDialogOpen(true);
                      }}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      aria-label={`Delete ${folder.name}`}
                      title={`Delete ${folder.name}`}
                      onClick={() => requestFolderDeletion(folder)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No folders have been created yet.
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
  }).format(date);
}

export default ClassroomFolders;
