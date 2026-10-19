import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarClock,
  FileSearch,
  Flame,
  GraduationCap,
  Info,
  LayoutDashboard,
  LifeBuoy,
  ListChecks,
  Siren,
  Target,
  Upload,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { toast } from "sonner";
import {
  Badge,
  Button,
  EmptyState,
  Panel,
  PanelTitle,
  PriorityBadge,
  Progress,
  Ring,
} from "@/components/app/ui";
import { TaskRow } from "@/components/app/TaskRow";
import {
  fmtMin,
  rankedTopics,
  readiness,
  todayISO,
  upcomingExams,
  weeklyMinutes,
  parseISO,
} from "@/lib/engine";
import { actions, useAppState } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Exam Rescue — AI Exam Preparation Copilot" },
      {
        name: "description",
        content:
          "Your exam is closer. Your next step is clearer. Drop your study material and we'll help you figure out what to study first.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Overview,
});

function Countdown({ date }: { date: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);
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
        <div
          key={l}
          className="min-w-[60px] rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center backdrop-blur"
        >
          <div className="font-mono text-2xl font-bold sm:text-3xl text-white">
            {String(v).padStart(2, "0")}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-white/60">{l}</div>
        </div>
      ))}
    </div>
  );
}

const STEPS = [
  {
    icon: Upload,
    title: "Upload",
    text: "Drop your syllabus PDF or paste notes. We extract units and topics — no university or course setup required to start.",
  },
  {
    icon: FileSearch,
    title: "Prioritize",
    text: "Exam Rescue ranks topics by importance, difficulty, your progress and exam proximity. You see exactly why each topic matters.",
  },
  {
    icon: ListChecks,
    title: "Prepare",
    text: "Get a realistic day-by-day plan that fits your available hours. Check off tasks, track readiness, and focus on what counts.",
  },
] as const;

function LandingHero() {
  const nav = useNavigate();
  return (
    <section className="relative overflow-hidden rounded-2xl bg-hero px-6 py-16 sm:px-10 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-3xl text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-semibold text-white/80 backdrop-blur">
          <Siren className="h-3.5 w-3.5 text-[oklch(0.75_0.2_155)]" />
          Rule-based exam prep, not AI guesswork
        </div>
        <h1 className="font-display text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
          Your exam is closer.
          <br />
          Your next step is clearer.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base text-white/70 sm:text-lg">
          Drop your study material. We'll help you figure out what to study first.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link to="/syllabus">
            <Button variant="signal" size="lg" className="h-14 px-8 text-base">
              <Siren className="h-5 w-5" /> Start My Rescue Plan
            </Button>
          </Link>
          <Link to="/rescue">
            <Button
              size="lg"
              variant="outline"
              className="h-14 border-white/20 bg-white/5 text-white hover:bg-white/10 hover:border-white/30"
            >
              <LifeBuoy className="h-5 w-5" /> Open Rescue Mode
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section className="space-y-6">
      <div className="text-center">
        <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
          How it works
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Three steps from overwhelmed to on track.
        </p>
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        {STEPS.map(({ icon: Icon, title, text }, i) => (
          <div key={title} className="panel group p-6 transition hover:shadow-md">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-primary/15">
              <Icon className="h-6 w-6" />
            </div>
            <div className="mb-2 flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-primary">STEP {i + 1}</span>
            </div>
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{text}</p>
          </div>
        ))}
      </div>
      <div className="flex justify-center">
        <Link to="/syllabus">
          <Button variant="signal" size="lg" className="h-12 px-7">
            Get started — it's free <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </section>
  );
}

function Overview() {
  const s = useAppState();
  const nav = useNavigate();
  const today = todayISO();
  const [showCalc, setShowCalc] = useState(false);
  const next = upcomingExams(s.exams, today)[0];

  // No exams yet → show the landing page
  if (!next) {
    return (
      <div className="space-y-12">
        <LandingHero />
        <HowItWorks />
        <Panel className="border-primary/20 bg-primary/[0.03]">
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">Want to try with sample data?</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Load demo exams and a pre-built study plan to explore everything before adding your
                own.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                actions.resetSample();
                toast.success("Sample data loaded — explore the dashboard!");
                nav({ to: "/" });
              }}
            >
              Load sample data
            </Button>
          </div>
        </Panel>
      </div>
    );
  }

  // Has exams → show dashboard overview (preserved functionality)
  const r = readiness(s, today)!;
  const todays = (s.plan?.tasks ?? []).filter((t) => t.date === today);
  const target = todays.reduce((a, t) => a + t.minutes, 0);
  const doneMin = todays.filter((t) => t.done).reduce((a, t) => a + t.minutes, 0);
  const missed =
    (s.plan?.tasks ?? []).filter((t) => !t.done && t.date < today).length +
    (s.plan?.unscheduled.length ?? 0);
  const top = rankedTopics(s.exams, today)
    .filter((x) => x.topic.status !== "Revised")
    .slice(0, 3);
  const week = weeklyMinutes(s, today);
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const examName = (id: string) => s.exams.find((e) => e.id === id)?.subject ?? "";

  const rescue = () => {
    const res = actions.recover();
    toast.success(
      `Rescue plan ready: ${res.moved} task${res.moved === 1 ? "" : "s"} rescheduled.`,
      {
        description: res.overflow
          ? `${res.overflow} task(s) don't fit your available hours — check the planner.`
          : "Everything fits your available hours.",
      },
    );
    nav({ to: "/planner" });
  };

  return (
    <div className="space-y-5">
      <Panel className="bg-hero relative overflow-hidden p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm text-white/60">
              {greet}
              {s.settings.name ? `, ${s.settings.name}` : ""}. Next up:
            </p>
            <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">{next.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-white/70">
              <Badge tone="violet">{next.subject}</Badge>
              <span className="flex items-center gap-1">
                <CalendarClock className="h-4 w-4" />
                {parseISO(next.date).toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/rescue">
                <Button variant="signal" size="lg" className="h-14 px-7 text-base">
                  <Siren className="h-5 w-5" /> Rescue Mode: what do I study now?
                </Button>
              </Link>
              <Button
                variant="outline"
                size="lg"
                className="h-14 border-white/20 bg-white/5 text-white hover:bg-white/10 hover:border-white/30"
                onClick={rescue}
              >
                <LifeBuoy className="h-5 w-5" /> Recover missed
                {missed > 0 && (
                  <span className="rounded-md bg-white/15 px-1.5 text-xs">{missed}</span>
                )}
              </Button>
            </div>
          </div>
          <Countdown date={next.date} />
        </div>
      </Panel>

      <div className="grid gap-5 md:grid-cols-3">
        <Panel>
          <PanelTitle>Today's target</PanelTitle>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-3xl font-bold text-foreground">{fmtMin(doneMin)}</span>
            <span className="text-sm text-muted-foreground">of {fmtMin(target)}</span>
          </div>
          <div className="mt-3">
            <Progress value={target ? (doneMin / target) * 100 : 0} tone="signal" />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {target
              ? `${todays.filter((t) => !t.done).length} task(s) remaining today`
              : "Nothing scheduled today — generate a plan."}
          </p>
        </Panel>
        <Panel>
          <PanelTitle>Overall preparation</PanelTitle>
          <div className="font-mono text-3xl font-bold text-foreground">
            {Math.round(r.coverage * 100)}%
          </div>
          <div className="mt-3">
            <Progress value={r.coverage * 100} />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Syllabus covered across {r.topicCount} topics, weighted by importance.
          </p>
        </Panel>
        <Panel>
          <PanelTitle
            action={
              <button
                onClick={() => setShowCalc((v) => !v)}
                className="text-muted-foreground transition hover:text-foreground"
                aria-label="How readiness is calculated"
              >
                <Info className="h-4 w-4" />
              </button>
            }
          >
            Readiness score
          </PanelTitle>
          <div className="flex items-center gap-4">
            <Ring value={r.score} size={96} />
            <div className="text-xs text-muted-foreground">
              {showCalc ? (
                <p>
                  {r.hasQuiz
                    ? "45% coverage + 20% revision + 20% quiz accuracy + 15% task completion."
                    : "55% coverage + 25% revision + 20% task completion. Take a quiz to include practice."}
                </p>
              ) : (
                <p>
                  An estimate from your tracked progress — not a guarantee.{" "}
                  <Link to="/readiness" className="text-primary hover:underline">
                    See report
                  </Link>
                </p>
              )}
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        <Panel className="lg:col-span-3">
          <PanelTitle
            action={
              <Link to="/planner" className="text-xs text-primary hover:underline">
                Full planner
              </Link>
            }
          >
            Today's study plan
          </PanelTitle>
          {todays.length ? (
            <div className="space-y-2">
              {todays.map((t) => (
                <TaskRow key={t.id} task={t} sub={examName(t.examId)} />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              No tasks for today.{" "}
              <button
                className="text-primary hover:underline"
                onClick={() => {
                  actions.regenerate();
                  toast.success("Study plan generated");
                }}
              >
                Generate a plan
              </button>
            </div>
          )}
        </Panel>
        <Panel className="lg:col-span-2">
          <PanelTitle
            action={
              <Link to="/topics" className="text-xs text-primary hover:underline">
                All topics
              </Link>
            }
          >
            Study next
          </PanelTitle>
          <div className="space-y-3">
            {top.map(({ topic, exam, info, minutes }, i) => (
              <div
                key={topic.id}
                className="flex items-start gap-3 rounded-lg bg-surface p-3 transition hover:bg-accent"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/15 font-mono text-xs font-bold text-primary">
                  {i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-foreground">{topic.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {exam.subject} · ~{fmtMin(minutes)}
                  </div>
                  <div className="mt-1.5">
                    <PriorityBadge level={info.level} />
                  </div>
                </div>
              </div>
            ))}
            {!top.length && (
              <p className="text-sm text-muted-foreground">Every topic is revised. Great work!</p>
            )}
          </div>
        </Panel>
      </div>

      <Panel>
        <PanelTitle
          action={
            <span className="flex items-center gap-1 text-xs text-signal">
              <Flame className="h-3.5 w-3.5" />
              {week.filter((d) => d.minutes > 0).length}/7 active days
            </span>
          }
        >
          Weekly consistency
        </PanelTitle>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={week}>
              <XAxis
                dataKey="day"
                stroke="var(--muted-foreground)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                cursor={{ fill: "var(--surface)" }}
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "var(--popover-foreground)",
                }}
                formatter={(v: number) => [fmtMin(v), "Studied"]}
              />
              <Bar dataKey="minutes" fill="var(--primary)" radius={[6, 6, 2, 2]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>
    </div>
  );
}
