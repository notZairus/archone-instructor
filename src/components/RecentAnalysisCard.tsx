import { FileCode2, Calendar, Tag, HardDrive } from "lucide-react";
import type { Analysis } from "@/types/global";
import { useNavigate } from "react-router";

const RecentAnalysisCard = ({ data }: { data: Analysis }) => {
  if (!data) return null;
  const naviagte = useNavigate();

  const formatDate = (isoString: string) => {
    if (!isoString) return "N/A";
    return new Date(isoString).toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  return (
    <div
      className="max-w-md w-full bg-card border rounded-lg overflow-hidden hover:shadow-lg hover:cursor-pointer hover:scale-105 transition-all duration-300"
      onClick={() =>
        naviagte(
          data.mode === "complexity"
            ? `/complexities/${data.id}`
            : `/analyses/${data.id}`,
        )
      }
    >
      <div className="bg-accent p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="p-2 rounded-lg text-primary">
            <FileCode2 className="w-5 h-5" />
          </div>
          <span className="font-mono text-sm font-semibold truncate">
            {data.fileName?.split("\\").pop() || "File Details"}
          </span>
        </div>
        <span className="px-2.5 py-1 uppercase font-mono text-lg text-primary rounded-md">
          {data.fileType}
        </span>
      </div>

      <div className="p-4 space-y-3.5 text-sm">
        <div className="flex items-start gap-3">
          <HardDrive className="w-4 h-4 mt-0.5 shrink-0" />
          <div className="overflow-hidden">
            <p className="text-xs font-medium">File Path</p>
            <p className="font-mono text-xs  truncate" title={data.fileName}>
              {data.fileName}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-slate-400 shrink-0" />
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Mode
              </p>
              <p className="font-semibold text-slate-800 dark:text-slate-200 uppercase text-xs">
                {data.mode}
              </p>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
              <Calendar className="w-3.5 h-3.5" /> Analyzed on:
            </span>
            <span className="font-mono text-slate-700 dark:text-slate-300">
              {formatDate(data.createdAt)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecentAnalysisCard;
