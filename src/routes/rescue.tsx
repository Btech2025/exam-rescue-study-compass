import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, Brain, CheckCircle2, Coffee, Flame, LifeBuoy, Siren, Target, Timer } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge, Button, EmptyState, Panel, PanelTitle, PriorityBadge, StatusBadge, inputCls } from "@/components/app/ui";
import { fmtDay, fmtMin, todayISO } from "@/lib/engine";
import { rescueAnalysis, rescueExams, type SessionKind } from "@/lib/rescue";
import { actions, useAppState } from "@/lib/store";
import type { Status } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/rescue")({
  validateSearch: (search: Record<string, unknown>): { exam?: string } => ({ exam: typeof search.exam === 'string' ? search.exam : undefined }),
  head: () => ({
    meta: [
      { title: "Rescue Mode — Exam Rescue" },
      { name: "description", content: "What should I study right now? Your top 3 topics and an emergency plan that fits your hours." },
      { property: "og:title", content: "Rescue Mode — Exam Rescue" },
      { property: "og:description", content: "An emergency study plan built from your real progress and quiz results." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Rescue,
});

const kindStyle: Record<SessionKind, { icon: typeof Brain; cls: string; label: string }> = {
  focus: { icon: Brain, cls: "border-primary/40 bg-primary/10 text-primary", label: "Focus" },
  break: { icon: Coffee, cls: "border-border bg-muted/40 text-muted-foreground", label: "Break" },
  practice: { icon: Target, cls: "border-signal/40 bg-signal/10 text-signal", label: "Practice" },
};

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const i = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(i); }, []);
  return now;
}

function Rescue() {
  const s = useAppState();
  const now = useNow();
  const search = Route.useSearch();
  const [examId, setExamId] = useState<string | undefined>(search.exam);
  const [scanning, setScanning] = useState(true);
  useEffect(() => { setScanning(true); const t = setTimeout(() => setScanning(false), 700); return () => clearTimeout(t); }, [examId]);
  const exams = rescueExams(s, now);
  const r = useMemo(() => rescueAnalysis(s, examId, now), [s, examId, now]);

  if (!r) {
    return <EmptyState icon={<LifeBuoy className="h-7 w-7" />} title="No exam to rescue" text="Rescue Mode needs an upcoming exam with at least one topic." action={<Link to="/exams" search={{ new: true }}><Button>Add exam</Button></Link>} />;
  }

  const hrs = Math.floor(r.msLeft / 3600000);
  const d = Math.floor(hrs / 24);
  const minutes = Math.floor(r.msLeft / 60000) % 60;
  const fits = r.neededMin <= r.availableMin;
  const setStatus = (id: string, name: string, st: Status) => { actions.setTopicStatus(id, st); toast.success(`${name} marked ${st}`, { description: "Rescue plan recalculated." }); };

  return (
    <div className="space-y-5">
      <Panel className="bg-hero relative overflow-hidden border-signal/30 p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-signal"><Siren className="h-4 w-4 animate-pulse" />Rescue mode active</div>
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">What should I study <span className="text-signal">right now?</span></h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">Ranked from your saved topics, preparation status and quiz results. Rule-based scoring — no AI model involved.</p>
            {exams.length > 1 && (
              <select aria-label="Exam" className={`${inputCls} mt-4 max-w-xs`} value={r.exam.id} onChange={(e) => setExamId(e.target.value)}>
                {exams.map((e) => <option key={e.id} value={e.id}>{e.name} · {e.subject}</option>)}
              </select>
            )}
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
             <div className="rounded-xl border bg-surface/70 px-4 py-3"><div className="font-mono text-2xl font-bold">{d > 0 ? `${d}d ` : ""}{hrs % 24}h {minutes}m</div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">until exam · 9am</div></div>
            <div className="rounded-xl border bg-surface/70 px-4 py-3"><div className="font-mono text-2xl font-bold text-signal">{fmtMin(r.availableMin)}</div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">study time left</div></div>
            <div className="rounded-xl border bg-surface/70 px-4 py-3"><div className={cn("font-mono text-2xl font-bold", fits ? "" : "text-warning")}>{fmtMin(r.neededMin)}</div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">needed</div></div>
          </div>
        </div>
      </Panel>

      {scanning ? (
        <div className="grid gap-4 md:grid-cols-3">{[0, 1, 2].map((k) => <div key={k} className="panel h-56 animate-pulse" />)}</div>
      ) : r.top3.length === 0 ? (
        <Panel className="text-center"><CheckCircle2 className="mx-auto h-8 w-8 text-signal" /><p className="mt-2 font-semibold">Every topic for {r.exam.subject} is revised and quiz-solid.</p><p className="text-sm text-muted-foreground">Take a mixed practice quiz to stay sharp.</p><Link to="/practice"><Button className="mt-4" variant="signal">Practice now</Button></Link></Panel>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {r.top3.map((t, i) => (
            <Panel key={t.topic.id} className={cn("relative flex flex-col animate-in fade-in slide-in-from-bottom-2", i === 0 && "border-signal/50 glow-signal")}>
              <div className="flex items-start justify-between gap-2">
                <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl font-mono text-lg font-bold", i === 0 ? "bg-signal text-signal-foreground" : "bg-primary/15 text-primary")}>{i + 1}</span>
                <div className="text-right"><div className="font-mono text-xl font-bold">{t.value}</div><div className="text-[10px] uppercase text-muted-foreground">value score</div></div>
              </div>
              <h3 className="mt-3 text-lg font-semibold">{t.topic.name}</h3>
              <div className="mt-1 flex flex-wrap gap-1.5"><StatusBadge status={t.topic.status} /><Badge>{t.topic.difficulty}</Badge><Badge tone="violet"><Timer className="mr-1 h-3 w-3" />{fmtMin(t.minutes)}</Badge></div>
              <p className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Why this topic</p>
              <ul className="mt-1.5 flex-1 space-y-1 text-sm">{t.reasons.map((x) => <li key={x} className="flex gap-2"><Flame className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />{x}</li>)}</ul>
              <p className="mt-3 font-mono text-[11px] text-muted-foreground">priority {t.base} {t.quizBonus >= 0 ? "+" : "−"} quiz {Math.abs(t.quizBonus)} = {t.value}</p>
              <div className="mt-3 flex gap-2">
                {t.topic.status === "Not Started" && <Button size="sm" variant="outline" onClick={() => setStatus(t.topic.id, t.topic.name, "Learning")}>Mark learning</Button>}
                <Button size="sm" variant={i === 0 ? "signal" : "outline"} onClick={() => setStatus(t.topic.id, t.topic.name, "Revised")}>Mark revised</Button>
              </div>
            </Panel>
          ))}
        </div>
      )}

      {!scanning && !fits && (
        <div className="flex gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm">
          <AlertTriangle className="h-5 w-5 shrink-0 text-warning" />
          <div>
            <p className="font-semibold text-warning">Not everything fits — here's the trade-off</p>
            <p className="mt-1 text-muted-foreground">
              You need about {fmtMin(r.neededMin)} but have {fmtMin(r.availableMin)} within your {r.exam.hoursPerDay}h/day limit. The plan covers the highest-value topics first and won't add hours you don't have.
              {r.partial.length > 0 && <> Partly covered: {r.partial.map((p) => p.name).join(", ")}.</>}
              {r.dropped.length > 0 && <> Skipped (lowest value): {r.dropped.map((p) => p.topic.name).join(", ")}.</>}
              {" "}To fit more, raise your daily hours in My Exams.
            </p>
          </div>
        </div>
      )}

      {!scanning && r.days.length > 0 && (
        <Panel>
          <PanelTitle action={<Badge tone="lime">{r.covered.length}/{r.ranked.length} topics fully covered</Badge>}>Emergency study plan</PanelTitle>
          <div className="grid gap-4 lg:grid-cols-2">
            {r.days.map((day) => (
              <div key={day.date} className="rounded-xl border bg-surface/40 p-4">
                <div className="mb-3 flex items-center justify-between"><h4 className="font-semibold">{day.date === todayISO() ? "Today" : fmtDay(day.date)}</h4><span className="font-mono text-xs text-muted-foreground">{fmtMin(day.used)} / {fmtMin(day.budget)}</span></div>
                <ol className="space-y-1.5">
                  {day.sessions.map((x, k) => { const K = kindStyle[x.kind]; return (
                    <li key={k} className={cn("flex items-center gap-3 rounded-lg border px-3 py-2 text-sm", K.cls)}>
                       <K.icon className="h-4 w-4 shrink-0" /><span className="min-w-0 flex-1 break-words text-foreground">{x.title}</span><span className="shrink-0 font-mono text-xs">{x.minutes}m</span>
                    </li>
                  ); })}
                </ol>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">Breaks count toward your daily hours, so no day exceeds your limit. Today's time accounts for tasks you've already completed and stops at 11pm.</p>
        </Panel>
      )}

      {!scanning && r.ranked.length > 3 && (
        <Panel>
          <PanelTitle>Full ranking</PanelTitle>
          <div className="space-y-1.5">{r.ranked.map((t, i) => (
            <div key={t.topic.id} className="flex items-center gap-3 text-sm"><span className="w-5 font-mono text-muted-foreground">{i + 1}</span><span className="flex-1 truncate">{t.topic.name}</span>{r.dropped.includes(t) && <Badge tone="amber">skipped</Badge>}<PriorityBadge level={t.value >= 22 ? "High" : t.value >= 14 ? "Medium" : "Low"} /><span className="w-8 text-right font-mono">{t.value}</span></div>
          ))}</div>
        </Panel>
      )}

      <div className="flex flex-wrap gap-2"><Link to="/practice"><Button variant="outline"><Target className="h-4 w-4" />Quiz my weak topics</Button></Link><Link to="/planner"><Button variant="ghost">Open full planner</Button></Link></div>
    </div>
  );
}
