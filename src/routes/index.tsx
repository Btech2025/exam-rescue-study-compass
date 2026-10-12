import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, CalendarClock, Flame, GraduationCap, Info, LifeBuoy } from "lucide-react";
import { useEffect, useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { toast } from "sonner";
import { Badge, Button, EmptyState, Panel, PanelTitle, PriorityBadge, Progress, Ring } from "@/components/app/ui";
import { TaskRow } from "@/components/app/TaskRow";
import { fmtMin, rankedTopics, readiness, todayISO, upcomingExams, weeklyMinutes, parseISO } from "@/lib/engine";
import { actions, useAppState } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Overview — Exam Rescue" },
      { name: "description", content: "Your exam countdown, today's study plan, readiness score and priority topics." },
      { property: "og:title", content: "Overview — Exam Rescue" },
      { property: "og:description", content: "Mission control for rescuing your exam preparation." },
    ],
  }),
  component: Overview,
});

function Countdown({ date }: { date: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(i); }, []);
  const target = parseISO(date).getTime() + 9 * 3600000;
  const diff = Math.max(0, target - now);
  const parts = [
    [Math.floor(diff / 86400000), "days"],
    [Math.floor((diff / 3600000) % 24), "hrs"],
    [Math.floor((diff / 60000) % 60), "min"],
    [Math.floor((diff / 1000) % 60), "sec"],
  ] as const;
  return (
    <div className="flex gap-2 sm:gap-3">
      {parts.map(([v, l]) => (
        <div key={l} className="min-w-[60px] rounded-xl border bg-surface/70 px-3 py-2 text-center">
          <div className="font-mono text-2xl font-bold sm:text-3xl">{String(v).padStart(2, "0")}</div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{l}</div>
        </div>
      ))}
    </div>
  );
}

function Overview() {
  const s = useAppState();
  const nav = useNavigate();
  const today = todayISO();
  const [showCalc, setShowCalc] = useState(false);
  const next = upcomingExams(s.exams, today)[0];

  if (!next) {
    return (
      <EmptyState icon={<GraduationCap className="h-7 w-7" />} title="No upcoming exams yet"
        text="Add your first exam and its syllabus topics. Exam Rescue will rank what to study and build a day-by-day plan."
        action={<Link to="/exams" search={{ new: true }}><Button>Add your first exam <ArrowRight className="h-4 w-4" /></Button></Link>} />
    );
  }

  const r = readiness(s, today)!;
  const todays = (s.plan?.tasks ?? []).filter((t) => t.date === today);
  const target = todays.reduce((a, t) => a + t.minutes, 0);
  const doneMin = todays.filter((t) => t.done).reduce((a, t) => a + t.minutes, 0);
  const missed = (s.plan?.tasks ?? []).filter((t) => !t.done && t.date < today).length + (s.plan?.unscheduled.length ?? 0);
  const top = rankedTopics(s.exams, today).filter((x) => x.topic.status !== "Revised").slice(0, 3);
  const week = weeklyMinutes(s, today);
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const examName = (id: string) => s.exams.find((e) => e.id === id)?.subject ?? "";

  const rescue = () => {
    const res = actions.recover();
    toast.success(`Rescue plan ready: ${res.moved} task${res.moved === 1 ? "" : "s"} rescheduled.`, {
      description: res.overflow ? `${res.overflow} task(s) don't fit your available hours — check the planner.` : "Everything fits your available hours.",
    });
    nav({ to: "/planner" });
  };

  return (
    <div className="space-y-5">
      <Panel className="bg-hero relative overflow-hidden p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{greet}{s.settings.name ? `, ${s.settings.name}` : ""}. Next up:</p>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{next.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge tone="violet">{next.subject}</Badge>
              <span className="flex items-center gap-1"><CalendarClock className="h-4 w-4" />{parseISO(next.date).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</span>
            </div>
            <Button variant="signal" size="lg" className="mt-6" onClick={rescue}>
              <LifeBuoy className="h-5 w-5" /> Rescue My Preparation
              {missed > 0 && <span className="rounded-md bg-signal-foreground/15 px-1.5 text-xs">{missed} missed</span>}
            </Button>
          </div>
          <Countdown date={next.date} />
        </div>
      </Panel>

      <div className="grid gap-5 md:grid-cols-3">
        <Panel>
          <PanelTitle>Today's target</PanelTitle>
          <div className="flex items-baseline gap-2"><span className="font-mono text-3xl font-bold">{fmtMin(doneMin)}</span><span className="text-sm text-muted-foreground">of {fmtMin(target)}</span></div>
          <div className="mt-3"><Progress value={target ? (doneMin / target) * 100 : 0} tone="signal" /></div>
          <p className="mt-3 text-xs text-muted-foreground">{target ? `${todays.filter((t) => !t.done).length} task(s) remaining today` : "Nothing scheduled today — generate a plan."}</p>
        </Panel>
        <Panel>
          <PanelTitle>Overall preparation</PanelTitle>
          <div className="font-mono text-3xl font-bold">{Math.round(r.coverage * 100)}%</div>
          <div className="mt-3"><Progress value={r.coverage * 100} /></div>
          <p className="mt-3 text-xs text-muted-foreground">Syllabus covered across {r.topicCount} topics, weighted by importance.</p>
        </Panel>
        <Panel>
          <PanelTitle action={<button onClick={() => setShowCalc((v) => !v)} className="text-muted-foreground hover:text-foreground" aria-label="How readiness is calculated"><Info className="h-4 w-4" /></button>}>Readiness score</PanelTitle>
          <div className="flex items-center gap-4">
            <Ring value={r.score} size={96} />
            <div className="text-xs text-muted-foreground">
              {showCalc ? (
                <p>{r.hasQuiz ? "45% coverage + 20% revision + 20% quiz accuracy + 15% task completion." : "55% coverage + 25% revision + 20% task completion. Take a quiz to include practice."}</p>
              ) : (
                <p>An estimate from your tracked progress — not a guarantee. <Link to="/readiness" className="text-primary hover:underline">See report</Link></p>
              )}
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        <Panel className="lg:col-span-3">
          <PanelTitle action={<Link to="/planner" className="text-xs text-primary hover:underline">Full planner</Link>}>Today's study plan</PanelTitle>
          {todays.length ? (
            <div className="space-y-2">{todays.map((t) => <TaskRow key={t.id} task={t} sub={examName(t.examId)} />)}</div>
          ) : (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              No tasks for today. <button className="text-primary hover:underline" onClick={() => { actions.regenerate(); toast.success("Study plan generated"); }}>Generate a plan</button>
            </div>
          )}
        </Panel>
        <Panel className="lg:col-span-2">
          <PanelTitle action={<Link to="/topics" className="text-xs text-primary hover:underline">All topics</Link>}>Study next</PanelTitle>
          <div className="space-y-3">
            {top.map(({ topic, exam, info, minutes }, i) => (
              <div key={topic.id} className="flex items-start gap-3 rounded-lg bg-surface/60 p-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/20 font-mono text-xs font-bold text-primary">{i + 1}</div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{topic.name}</div>
                  <div className="text-xs text-muted-foreground">{exam.subject} · ~{fmtMin(minutes)}</div>
                  <div className="mt-1.5"><PriorityBadge level={info.level} /></div>
                </div>
              </div>
            ))}
            {!top.length && <p className="text-sm text-muted-foreground">Every topic is revised. Great work!</p>}
          </div>
        </Panel>
      </div>

      <Panel>
        <PanelTitle action={<span className="flex items-center gap-1 text-xs text-signal"><Flame className="h-3.5 w-3.5" />{week.filter((d) => d.minutes > 0).length}/7 active days</span>}>Weekly consistency</PanelTitle>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={week}>
              <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip cursor={{ fill: "var(--surface)" }} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [fmtMin(v), "Studied"]} />
              <Bar dataKey="minutes" fill="var(--primary)" radius={[6, 6, 2, 2]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>
    </div>
  );
}
