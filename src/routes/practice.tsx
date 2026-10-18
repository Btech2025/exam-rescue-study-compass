import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Target, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge, Button, Field, PageHeader, Panel, PanelTitle, Progress, Ring, inputCls } from "@/components/app/ui";
import { todayISO, uid } from "@/lib/engine";
import { QUESTIONS, questionSubjects, type Question } from "@/lib/questions";
import { actions, useAppState } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/practice")({
  head: () => ({
    meta: [
      { title: "Practice Arena — Exam Rescue" },
      { name: "description", content: "Multiple-choice practice with instant feedback and topic-wise results." },
      { property: "og:title", content: "Practice Arena — Exam Rescue" },
      { property: "og:description", content: "Test yourself and see which topics need work." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Practice,
});

function Practice() {
  const s = useAppState();
  const [subject, setSubject] = useState<string>(questionSubjects[0] ?? "");
  const [topic, setTopic] = useState("All");
  const [qs, setQs] = useState<Question[] | null>(null);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [finished, setFinished] = useState(false);
  const topics = Array.from(new Set(QUESTIONS.filter((q) => q.subject === subject).map((q) => q.topic)));
  const missing = s.exams.filter((e) => !questionSubjects.some((x) => x.toLowerCase() === e.subject.toLowerCase())).map((e) => e.subject);

  const start = () => {
    const pool = QUESTIONS.filter((q) => q.subject === subject && (topic === "All" || q.topic === topic)).sort(() => Math.random() - 0.5);
    setQs(pool); setI(0); setPicked(null); setAnswers([]); setFinished(false);
  };
  const next = () => {
    const a = [...answers, picked === qs![i]?.answer];
    setAnswers(a); setPicked(null);
    if (i + 1 < qs!.length) return setI(i + 1);
    const perTopic: Record<string, { correct: number; total: number }> = {};
    qs!.forEach((q, k) => { perTopic[q.topic] = { correct: (perTopic[q.topic]?.correct ?? 0) + (a[k] ? 1 : 0), total: (perTopic[q.topic]?.total ?? 0) + 1 }; });
    actions.saveQuiz({ id: uid(), date: todayISO(), subject, score: a.filter(Boolean).length, total: a.length, perTopic });
    toast.success("Quiz saved — readiness updated");
    setFinished(true);
  };

  if (qs && finished) {
    const score = answers.filter(Boolean).length;
    const per: Record<string, { c: number; t: number }> = {};
    qs.forEach((q, k) => { per[q.topic] = { c: (per[q.topic]?.c ?? 0) + (answers[k] ? 1 : 0), t: (per[q.topic]?.t ?? 0) + 1 }; });
    const weak = Object.entries(per).filter(([, v]) => v.c / v.t < 0.6).map(([k]) => k);
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <PageHeader title="Results" sub={subject} />
        <Panel className="flex flex-col items-center gap-3 bg-hero py-8 text-center">
          <Ring value={Math.round((score / qs.length) * 100)} label="percent" hero />
          <p className="text-lg font-semibold text-white">{score} / {qs.length} correct</p>
        </Panel>
        <Panel>
          <PanelTitle>Topic-wise performance</PanelTitle>
          <div className="space-y-3">{Object.entries(per).map(([k, v]) => (
            <div key={k}><div className="mb-1 flex justify-between text-sm"><span>{k}</span><span className="font-mono text-muted-foreground">{v.c}/{v.t}</span></div><Progress value={(v.c / v.t) * 100} tone={v.c / v.t >= 0.6 ? "signal" : "warning"} /></div>
          ))}</div>
        </Panel>
        <Panel>
          <PanelTitle>Recommended next steps</PanelTitle>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            {weak.length ? weak.map((w) => <li key={w}>• Revisit <span className="text-foreground">{w}</span> — review notes, then retry questions on it.</li>) : <li>• Strong round! Mark these topics as Revised in the planner and move on to the next priority.</li>}
          </ul>
          <div className="mt-4 flex gap-2"><Button onClick={start}>Retry</Button><Link to="/readiness"><Button variant="outline">View readiness</Button></Link></div>
        </Panel>
      </div>
    );
  }

  if (qs) {
    const q = qs[i]!;
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <div className="flex items-center justify-between text-sm text-muted-foreground"><span>Question {i + 1} of {qs.length}</span><Badge tone="violet">{q.topic}</Badge></div>
        <Progress value={(i / qs.length) * 100} />
        <Panel>
          <h2 className="text-lg font-semibold leading-snug">{q.q}</h2>
          <div className="mt-5 space-y-2">
            {q.options.map((o, k) => {
              const state = picked === null ? "" : k === q.answer ? "border-signal bg-signal/10" : k === picked ? "border-destructive bg-destructive/10" : "opacity-50";
              return (
                <button key={k} disabled={picked !== null} onClick={() => setPicked(k)} className={cn("flex w-full items-center gap-3 rounded-lg border bg-card p-3 text-left text-sm transition hover:border-primary/50", state)}>
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-muted font-mono text-xs">{"ABCD"[k]}</span>{o}
                  {picked !== null && k === q.answer && <CheckCircle2 className="ml-auto h-4 w-4 text-signal" />}
                  {picked === k && k !== q.answer && <XCircle className="ml-auto h-4 w-4 text-destructive" />}
                </button>
              );
            })}
          </div>
          {picked !== null && (
            <div className="mt-4 rounded-lg bg-surface p-4 text-sm animate-in fade-in">
              <p className={cn("font-semibold", picked === q.answer ? "text-signal" : "text-destructive")}>{picked === q.answer ? "Correct!" : "Not quite."}</p>
              <p className="mt-1 text-muted-foreground">{q.explanation}</p>
              <Button className="mt-4" onClick={next}>{i + 1 < qs.length ? "Next question" : "See results"}</Button>
            </div>
          )}
        </Panel>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Practice Arena" sub="Quick multiple-choice rounds with instant feedback." />
      <Panel>
        <div className="mb-4 flex items-center gap-2"><Target className="h-5 w-5 text-primary" /><Badge tone="amber">Sample questions — hand-written, not AI-generated</Badge></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Subject"><select className={inputCls} value={subject} onChange={(e) => { setSubject(e.target.value); setTopic("All"); }}>{questionSubjects.map((x) => <option key={x}>{x}</option>)}</select></Field>
          <Field label="Topic"><select className={inputCls} value={topic} onChange={(e) => setTopic(e.target.value)}><option>All</option>{topics.map((x) => <option key={x}>{x}</option>)}</select></Field>
        </div>
        <Button className="mt-5 w-full" size="lg" onClick={start}>Start quiz</Button>
        {missing.length > 0 && <p className="mt-4 text-xs text-muted-foreground">No sample questions yet for: {Array.from(new Set(missing)).join(", ")}. Custom question generation is planned for a future AI integration.</p>}
        {s.quizzes.length > 0 && <p className="mt-2 text-xs text-muted-foreground">{s.quizzes.length} quiz result(s) saved.</p>}
      </Panel>
    </div>
  );
}
