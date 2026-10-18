import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, Brain, CheckCircle2, ChevronDown, ChevronUp, Coffee, Flame, LifeBuoy, ListChecks, Siren, Target, Timer } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge, Button, EmptyState, Panel, PanelTitle, PriorityBadge, StatusBadge, inputCls } from "@/components/app/ui";
import { TaskRow } from "@/components/app/TaskRow";
import { fmtDay, fmtMin, todayISO } from "@/lib/engine";
import { rescueAnalysis, rescueExams, type RescueTopic, type SessionKind } from "@/lib/rescue";
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
  focus: { icon: Brain, cls: "border-primary/30 bg-primary/5 text-primary", label: "Focus" },
  break: { icon: Coffee, cls: "border-border bg-muted/40 text-muted-foreground", label: "Break" },
  practice: { icon: Target, cls: "border-signal/30 bg-signal/5 text-signal", label: "Practice" },
};

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const i = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(i); }, []);
  return now;
}

function TopicCard({ t, rank, isTop, setStatus }: { t: RescueTopic; rank: number; isTop: boolean; setStatus: (id: string, name: string, st: Status) => void }) {
  return (
    <Panel className={cn("relative flex flex-col animate-in fade-in slide-in-from-bottom-2 transition hover:shadow-md", isTop && "border-primary/40 shadow-sm")}>
      <div className="flex items-start justify-between gap-2">
        <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl font-mono text-lg font-bold", isTop ? "bg-primary text-primary-foreground shadow-sm" : "bg-primary/10 text-primary")}>{rank}</span>
        <div className="text-right"><div className="font-mono text-xl font-bold text-foreground">{t.value}</div><div className="text-[10px] uppercase text-muted-foreground">value score</div></div>
      </div>
      <h3 className="mt-3 text-lg font-semibold text-foreground">{t.topic.name}</h3>
      <div className="mt-1 flex flex-wrap gap-1.5"><StatusBadge status={t.topic.status} /><Badge>{t.topic.difficulty}</Badge><Badge tone="violet"><Timer className="mr-1 h-3 w-3" />{fmtMin(t.minutes)}</Badge></div>
      <p className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Why this topic</p>
      <ul className="mt-1.5 flex-1 space-y-1 text-sm text-muted-foreground">{t.reasons.map((x) => <li key={x} className="flex gap-2"><Flame className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" /><span>{x}</span></li>)}</ul>
      <p className="mt-3 font-mono text-[11px] text-muted-foreground">priority {t.base} {t.quizBonus >= 0 ? "+" : "−"} quiz {Math.abs(t.quizBonus)} = {t.value}</p>
      <div className="mt-3 flex gap-2">
        {t.topic.status === "Not Started" && <Button size="sm" variant="outline" onClick={() => setStatus(t.topic.id, t.topic.name, "Learning")}>Mark learning</Button>}
        <Button size="sm" variant={isTop ? "signal" : "outline"} onClick={() => setStatus(t.topic.id, t.topic.name, "Revised")}>Mark revised</Button>
      </div>
    </Panel>
  );
}

function CollapsibleSection({ title, icon: Icon, children, count, defaultOpen = true, accent }: { title: string; icon: typeof Brain; children: React.ReactNode; count?: number; defaultOpen?: boolean; accent?: string }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Panel>
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between gap-2 text-left">
        <div className="flex items-center gap-2">
          <Icon className={cn("h-5 w-5", accent ?? "text-primary")} />
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          {count !== undefined && <Badge tone="muted">{count}</Badge>}
        </div>
        {open ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
      </button>
      {open && <div className="mt-4">{children}</div>}
    </Panel>
  );
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
  const [scheduleOpen, setScheduleOpen] = useState(true);

  if (!r) {
    return <EmptyState icon={<LifeBuoy className="h-7 w-7" />} title="No exam to rescue" text="Rescue Mode needs an upcoming exam with at least one topic." action={<Link to="/exams" search={{ new: true }}><Button>Add exam</Button></Link>} />;
  }

  const hrs = Math.floor(r.msLeft / 3600000);
  const d = Math.floor(hrs / 24);
  const minutes = Math.floor(r.msLeft / 60000) % 60;
  const fits = r.neededMin <= r.availableMin;
  const setStatus = (id: string, name: string, st: Status) => { actions.setTopicStatus(id, st); toast.success(`${name} marked ${st}`, { description: "Rescue plan recalculated." }); };

  // Group topics: "Study This First" = top 3, "Next" = rest of ranked minus dropped, "If Time Allows" = dropped
  const studyFirst = r.top3;
  const nextTopics = r.ranked.slice(3).filter((t) => !r.dropped.includes(t));
  const ifTimeAllows = r.dropped;

  // Editable schedule: use planner tasks for this exam
  const examTasks = (s.plan?.tasks ?? []).filter((t) => t.examId === r.exam.id && t.date >= todayISO());

  return (
    <div className="space-y-5">
      <Panel className="bg-hero relative overflow-hidden p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[oklch(0.75_0.2_155)]"><Siren className="h-4 w-4 animate-pulse" />Rescue mode active</div>
            <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">What should I study <span className="text-[oklch(0.75_0.2_155)]">right now?</span></h1>
            <p className="mt-2 max-w-xl text-sm text-white/70">Ranked from your saved topics, preparation status and quiz results. Rule-based scoring — no AI model involved.</p>
            {exams.length > 1 && (
              <select aria-label="Exam" className={`${inputCls} mt-4 max-w-xs bg-white/10 border-white/20 text-white`} value={r.exam.id} onChange={(e) => setExamId(e.target.value)}>
                {exams.map((e) => <option key={e.id} value={e.id} className="text-foreground">{e.name} · {e.subject}</option>)}
              </select>
            )}
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
             <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur"><div className="font-mono text-2xl font-bold text-white">{d > 0 ? `${d}d ` : ""}{hrs % 24}h {minutes}m</div><div className="text-[10px] uppercase tracking-wider text-white/60">until exam · 9am</div></div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur"><div className="font-mono text-2xl font-bold text-[oklch(0.75_0.2_155)]">{fmtMin(r.availableMin)}</div><div className="text-[10px] uppercase tracking-wider text-white/60">study time left</div></div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur"><div className={cn("font-mono text-2xl font-bold text-white", !fits && "text-warning")}>{fmtMin(r.neededMin)}</div><div className="text-[10px] uppercase tracking-wider text-white/60">needed</div></div>
          </div>
        </div>
      </Panel>

      {scanning ? (
        <div className="grid gap-4 md:grid-cols-3">{[0, 1, 2].map((k) => <div key={k} className="panel h-56 animate-pulse" />)}</div>
      ) : r.top3.length === 0 ? (
        <Panel className="text-center"><CheckCircle2 className="mx-auto h-8 w-8 text-signal" /><p className="mt-2 font-semibold text-foreground">Every topic for {r.exam.subject} is revised and quiz-solid.</p><p className="text-sm text-muted-foreground">Take a mixed practice quiz to stay sharp.</p><Link to="/practice"><Button className="mt-4" variant="signal">Practice now</Button></Link></Panel>
      ) : (
        <>
          {/* Study This First */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Siren className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold text-foreground">Study This First</h2>
              <Badge tone="violet">{studyFirst.length}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">The highest-value topics right now. Start here.</p>
            <div className="grid gap-4 md:grid-cols-3">
              {studyFirst.map((t, i) => <TopicCard key={t.topic.id} t={t} rank={i + 1} isTop={i === 0} setStatus={setStatus} />)}
            </div>
          </section>

          {/* Next */}
          {nextTopics.length > 0 && (
            <CollapsibleSection title="Next" icon={ListChecks} count={nextTopics.length} defaultOpen={true}>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {nextTopics.map((t, i) => <TopicCard key={t.topic.id} t={t} rank={i + 4} isTop={false} setStatus={setStatus} />)}
              </div>
            </CollapsibleSection>
          )}

          {/* If Time Allows */}
          {ifTimeAllows.length > 0 && (
            <CollapsibleSection title="If Time Allows" icon={Timer} count={ifTimeAllows.length} defaultOpen={false} accent="text-muted-foreground">
              <p className="mb-4 text-sm text-muted-foreground">These topics may not fit your available hours. Focus on them only after completing the higher-priority topics.</p>
              <div className="space-y-2">
                {ifTimeAllows.map((t, i) => (
                  <div key={t.topic.id} className="flex items-center gap-3 rounded-lg border bg-surface p-3 text-sm">
                    <span className="w-5 font-mono text-muted-foreground">{r.ranked.indexOf(t) + 1}</span>
                    <span className="flex-1 truncate text-foreground">{t.topic.name}</span>
                    <Badge tone="amber">skipped</Badge>
                    <PriorityBadge level={t.value >= 22 ? "High" : t.value >= 14 ? "Medium" : "Low"} />
                    <span className="w-8 text-right font-mono text-muted-foreground">{t.value}</span>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}
        </>
      )}

      {!scanning && !fits && (
        <div className="flex gap-3 rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm">
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

      {/* Editable revision schedule */}
      {!scanning && examTasks.length > 0 && (
        <Panel>
          <button onClick={() => setScheduleOpen((v) => !v)} className="mb-4 flex w-full items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Your revision schedule</h2>
              <Badge tone="muted">{examTasks.length} tasks</Badge>
            </div>
            {scheduleOpen ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
          </button>
          {scheduleOpen && (
            <>
              <p className="mb-4 text-sm text-muted-foreground">Check off tasks as you complete them. Your progress updates in real time across the app.</p>
              <div className="space-y-3">
                {Array.from(new Set(examTasks.map((t) => t.date))).sort().map((date) => {
                  const dayTasks = examTasks.filter((t) => t.date === date);
                  return (
                    <div key={date} className="rounded-xl border bg-surface p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <h4 className="font-semibold text-foreground">{date === todayISO() ? "Today" : fmtDay(date)}</h4>
                        <span className="font-mono text-xs text-muted-foreground">{dayTasks.filter((t) => t.done).length}/{dayTasks.length} done</span>
                      </div>
                      <div className="space-y-2">{dayTasks.map((t) => <TaskRow key={t.id} task={t} sub={r.exam.subject} />)}</div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </Panel>
      )}

      {/* Emergency session plan (from rescue engine) */}
      {!scanning && r.days.length > 0 && (
        <Panel>
          <PanelTitle action={<Badge tone="lime">{r.covered.length}/{r.ranked.length} topics fully covered</Badge>}>Emergency session plan</PanelTitle>
          <div className="grid gap-4 lg:grid-cols-2">
            {r.days.map((day) => (
              <div key={day.date} className="rounded-xl border bg-surface p-4">
                <div className="mb-3 flex items-center justify-between"><h4 className="font-semibold text-foreground">{day.date === todayISO() ? "Today" : fmtDay(day.date)}</h4><span className="font-mono text-xs text-muted-foreground">{fmtMin(day.used)} / {fmtMin(day.budget)}</span></div>
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

      <div className="flex flex-wrap gap-2"><Link to="/practice"><Button variant="outline"><Target className="h-4 w-4" />Quiz my weak topics</Button></Link><Link to="/planner"><Button variant="ghost">Open full planner</Button></Link></div>
    </div>
  );
}
