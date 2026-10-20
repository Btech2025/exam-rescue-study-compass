import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpenCheck,
  CalendarClock,
  FileSearch,
  Flame,
  GraduationCap,
  Info,
  LayoutDashboard,
  LifeBuoy,
  ListChecks,
  Sparkles,
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
  Stat,
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
          className="min-w-[60px] rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center backdrop-blur transition hover:bg-white/10"
        >
          <div className="font-mono text-2xl font-bold text-white sm:text-3xl">
            {String(v).padStart(2, "0")}
          </div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-white/60">
            {l}
          </div>
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

const QUICK_ACTIONS = [
  {
    icon: Upload,
    label: "Upload material",
    sub: "Syllabus PDF or notes",
    to: "/syllabus" as const,
  },
  {
    icon: BookOpenCheck,
    label: "Analyze syllabus",
    sub: "Extract topics & units",
    to: "/syllabus" as const,
  },
  {
    icon: FileSearch,
    label: "Research PYQs",
    sub: "Review past papers",
    to: "/pyq" as const,
  },
  {
    icon: ListChecks,
    label: "Plan revision",
    sub: "Day-by-day schedule",
    to: "/planner" as const,
  },
] as const;

function LandingHero() {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-hero px-6 py-16 sm:px-10 sm:py-20 lg:py-24">
      {/* Decorative animated orbs */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[oklch(0.70_0.15_285)] opacity-20 blur-3xl animate-float" />
      <div className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-primary opacity-15 blur-3xl animate-float [animation-delay:1.5s]" />
      <div className="pointer-events-none absolute right-10 top-10 h-24 w-24 rounded-full border border-white/10 animate-orbit [animation-duration:30s]" />
      <div className="relative mx-auto max-w-3xl text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-semibold text-white/80 backdrop-blur">
          <Sparkles className="h-3.5 w-3.5 text-[oklch(0.70_0.15_285)]" />
          Rule-based exam prep, not AI guesswork
        </div>
        <h1 className="font-display text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
          Your exam is closer.
          <br />
          <span className="gradient-text">Your next step is clearer.</span>
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
          <div
            key={title}
            className="panel animate-card group p-6 transition hover:shadow-md"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition group-hover:scale-110 group-hover:bg-primary/15">
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
  const todaysDone = todays.filter((t) => t.done).length;
  const todaysTotal = todays.length;

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
      {/* Mission control hero */}
      <Panel className="bg-hero animate-card relative overflow-hidden p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium text-white/60">
              {greet}
              {s.settings.name ? `, ${s.settings.name}` : ""}. Next up:
            </p>
            <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">{next.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-white/70">
              <Badge tone="violet" className="border-white/20 bg-white/10 text-white">
                {next.subject}
              </Badge>
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
                  <Siren className="h-5 w-5" /> Start Rescue Mode
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

      {/* Stats row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Today's target"
          icon={<Target className="h-4 w-4" />}
          value={
            <span>
              {fmtMin(doneMin)}{" "}
              <span className="text-base text-muted-foreground">/ {fmtMin(target)}</span>
            </span>
          }
          hint={
            target ? `${todaysTotal - todaysDone} task(s) remaining` : "Nothing scheduled today"
          }
        />
        <Stat
          label="Preparation"
          icon={<GraduationCap className="h-4 w-4" />}
          value={`${Math.round(r.coverage * 100)}%`}
          hint={`${r.topicCount} topics weighted by importance`}
        />
        <Stat
          label="Tasks done"
          icon={<ListChecks className="h-4 w-4" />}
          value={`${todaysDone}/${todaysTotal}`}
          hint={target ? `${Math.round((doneMin / target) * 100)}% of today` : "No tasks today"}
        />
        <Stat
          label="Readiness"
          icon={<Flame className="h-4 w-4" />}
          value={`${r.score}`}
          hint={r.hasQuiz ? "Includes quiz accuracy" : "Take a quiz to refine"}
        />
      </div>

      {/* Progress + Readiness ring */}
      <div className="grid gap-5 md:grid-cols-3">
        <Panel className="md:col-span-2">
          <PanelTitle
            action={
              <Link to="/planner" className="text-xs text-primary hover:underline">
                Full planner
              </Link>
            }
          >
            Today's study mission
          </PanelTitle>
          {todays.length ? (
            <>
              <div className="mb-4">
                <Progress value={target ? (doneMin / target) * 100 : 0} tone="signal" />
              </div>
              <div className="space-y-2">
                {todays.map((t) => (
                  <TaskRow key={t.id} task={t} sub={examName(t.examId)} />
                ))}
              </div>
            </>
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
          <div className="flex flex-col items-center gap-3">
            <Ring value={r.score} size={120} label="readiness" />
            <div className="text-center text-xs text-muted-foreground">
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

      {/* Priority topics + Quick actions */}
      <div className="grid gap-5 lg:grid-cols-5">
        <Panel className="lg:col-span-3">
          <PanelTitle
            action={
              <Link to="/topics" className="text-xs text-primary hover:underline">
                All topics
              </Link>
            }
          >
            Study next — priority topics
          </PanelTitle>
          <div className="space-y-3">
            {top.map(({ topic, exam, info, minutes }, i) => (
              <div
                key={topic.id}
                className="flex items-start gap-3 rounded-xl border bg-surface p-3 transition hover:border-primary/40 hover:shadow-sm"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-[oklch(0.70_0.15_285)] font-mono text-sm font-bold text-primary-foreground">
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
              <p className="py-6 text-center text-sm text-muted-foreground">
                Every topic is revised. Great work!
              </p>
            )}
          </div>
        </Panel>
        <Panel className="lg:col-span-2">
          <PanelTitle>Quick actions</PanelTitle>
          <div className="grid grid-cols-2 gap-3">
            {QUICK_ACTIONS.map(({ icon: Icon, label, sub, to }) => (
              <Link
                key={label}
                to={to}
                className="group flex flex-col gap-2 rounded-xl border bg-card p-3 transition hover:border-primary/40 hover:shadow-sm"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary transition group-hover:scale-110 group-hover:bg-primary/15">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">{label}</div>
                  <div className="text-[11px] text-muted-foreground">{sub}</div>
                </div>
              </Link>
            ))}
          </div>
        </Panel>
      </div>

      {/* Weekly consistency chart */}
      <Panel>
        <PanelTitle
          action={
            <span className="flex items-center gap-1 text-xs font-semibold text-signal">
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
