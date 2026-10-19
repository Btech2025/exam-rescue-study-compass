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
        const completing = !task.done;
        actions.toggleTask(task.id);
        if (completing) toast.success("Task completed", { description: task.title });
      }}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left transition-all duration-200 hover:border-primary/40 hover:shadow-sm",
        task.done && "border-signal/20 bg-signal/[0.03] opacity-70",
      )}
    >
      <span
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 transition-all duration-200",
          task.done
            ? "border-signal bg-signal text-signal-foreground scale-100"
            : "border-input hover:border-primary",
        )}
      >
        {task.done && <Check className="animate-check h-4 w-4" strokeWidth={3} />}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block truncate text-sm font-medium text-foreground transition",
            task.done && "line-through text-muted-foreground",
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
