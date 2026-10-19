import { Check } from "lucide-react";
import { toast } from "sonner";
import { PriorityBadge } from "./ui";
import { fmtMin } from "@/lib/engine";
import { actions } from "@/lib/store";
import type { Task } from "@/lib/types";
import { cn } from "@/lib/utils";

export function TaskRow({ task, sub }: { task: Task; sub?: string | undefined }) {
  return (
    <button
      onClick={() => {
        actions.toggleTask(task.id);
        if (!task.done) toast.success("Task completed", { description: task.title });
      }}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg border bg-card p-3 text-left transition hover:border-primary/40 hover:shadow-sm",
        task.done && "opacity-60",
      )}
    >
      <span
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition",
          task.done ? "border-signal bg-signal text-signal-foreground" : "border-input",
        )}
      >
        {task.done && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block truncate text-sm font-medium text-foreground",
            task.done && "line-through",
          )}
        >
          {task.title}
        </span>
        {sub && <span className="block text-xs text-muted-foreground">{sub}</span>}
      </span>
      <span className="hidden sm:block">
        <PriorityBadge level={task.priority} />
      </span>
      <span className="font-mono text-xs text-muted-foreground">{fmtMin(task.minutes)}</span>
    </button>
  );
}
