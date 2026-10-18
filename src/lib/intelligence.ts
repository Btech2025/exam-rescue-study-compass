import { addDays, estimateMinutes, toISO, topicPriority } from './engine';
import type { AppState, Exam, Plan, PriorityLevel, Topic } from './types';

export interface SyllabusTopic extends Topic { unit: string; subtopics: string[]; marks: string; objectives: string }
export interface Paper { id: string; title: string; url: string; text: string; year: string; review: 'pending' | 'verified' | 'irrelevant' }
export interface Intelligence { university: string; course: string; semester: string; subject: string; examType: string; examId: string; topics: SyllabusTopic[]; papers: Paper[] }
export const emptyIntelligence = (): Intelligence => ({ university: '', course: '', semester: '', subject: '', examType: 'End semester', examId: '', topics: [], papers: [] });
export const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
export function publicSource(value: string) {
  try { const u = new URL(value); return u.protocol === 'https:' && !/^(localhost|127\.|10\.|192\.168\.)/.test(u.hostname) ? u.href : null; } catch { return null; }
}
export function parseSyllabus(text: string): SyllabusTopic[] {
  if (!text.trim()) throw new Error('No readable text found. Paste the syllabus text or enter topics manually.');
  let unit = 'Unassigned';
  const topics: SyllabusTopic[] = [];
  let last: SyllabusTopic | undefined;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim().replace(/^[•*\-]\s*/, '');
    if (!line || /^page\s+\d+$/i.test(line)) continue;
    if (/^(unit|module)\s*[-:–]?\s*(\d+|[ivx]+)\b/i.test(line)) { unit = line; last = undefined; continue; }
    if (/^(learning\s+)?(objectives?|outcomes?)\s*:/i.test(line)) { if (last) last.objectives = line; continue; }
    if (/^(marks|weight(age)?|distribution)\s*:/i.test(line)) { if (last) last.marks = line; continue; }
    const clean = line.replace(/^\d+[.)]\s*/, '');
    const [name, ...details] = clean.split(/:\s*/);
    if (!name?.trim()) continue;
    last = { id: `syllabus-${topics.length}-${normalize(name)}`, name: name.trim(), unit, subtopics: details.join(': ').split(/[,;]\s*/).filter(Boolean), marks: line.match(/\b\d+(?:\.\d+)?\s*(?:marks|%)\b/i)?.[0] ?? '', objectives: '', importance: 'Medium', difficulty: 'Medium', status: 'Not Started' };
    topics.push(last);
  }
  if (!topics.length) throw new Error('No topic lines found. Add topic names beneath each unit heading.');
  return topics;
}
export function paperYears(text: string) { return [...new Set(text.match(/\b(?:19|20)\d{2}\b/g) ?? [])].filter(y => Number(y) <= new Date().getFullYear()); }
export function topicEvidence(topic: SyllabusTopic, papers: Paper[]) {
  const key = normalize(topic.name);
  return papers.filter(p => p.review === 'verified' && p.text.trim() && key && (` ${normalize(p.text)} `).includes(` ${key} `));
}
export function intelligenceRanking(data: Intelligence, state: AppState, exam: Exam, today: string) {
  const analyzed = data.papers.filter(p => p.review === 'verified' && p.text.trim());
  return data.topics.map(t => {
    const saved = exam.topics.find(x => normalize(x.name) === normalize(t.name));
    const topic = { ...t, ...(saved ?? {}) };
    const evidence = topicEvidence(t, analyzed);
    // Quiz signals are scoped to the selected subject, unlike the legacy aggregate.
    let correct = 0, total = 0;
    for (const q of state.quizzes.filter(q => normalize(q.subject) === normalize(exam.subject))) {
      for (const [name, v] of Object.entries(q.perTopic)) if (normalize(name) === normalize(topic.name)) { correct += v.correct; total += v.total; }
    }
    const base = topicPriority(topic, exam, today);
    const bonus = total && correct / total < .5 ? 6 : total && correct / total < .8 ? 3 : 0;
    const score = base.score + bonus + Math.min(6, evidence.length * 2);
    const level: PriorityLevel = score >= 22 ? 'High' : score >= 14 ? 'Medium' : 'Low';
    return { topic, evidence, score, level, correct, total, provisional: analyzed.length < 3, reasons: [...base.reasons, ...(total ? [`Quiz: ${correct}/${total} correct (+${bonus})`] : ['No saved quiz evidence']), ...(evidence.length ? [`Exact topic wording found in ${evidence.length}/${analyzed.length} reviewed papers (+${Math.min(6, evidence.length * 2)})`] : ['No verified topic appearance; syllabus-based recommendation'])] };
  }).sort((a, b) => b.score - a.score);
}
export function mergeSyllabus(exam: Exam, topics: SyllabusTopic[]): Exam {
  const added = topics.filter(t => !exam.topics.some(x => normalize(x.name) === normalize(t.name)));
  return { ...exam, topics: [...exam.topics, ...added] };
}
export interface StrategyDay { date: string; budget: number; used: number; sessions: { topicId?: string; title: string; minutes: number; score: number; priority: PriorityLevel }[] }
export function preparationStrategy(data: Intelligence, state: AppState, exam: Exam, selected: string[], now = new Date()) {
  const today = toISO(now);
  const ranking = intelligenceRanking(data, state, exam, today).filter(r => selected.includes(r.topic.id));
  const days: StrategyDay[] = [];
  for (let date = today; date < exam.date && days.length < 60; date = addDays(date, 1)) {
    const reserved = (state.plan?.tasks ?? []).filter(t => t.date === date || (date === today && t.done && t.completedAt === today && t.date !== date)).reduce((n, t) => n + t.minutes, 0);
    const wall = date === today ? Math.max(0, 23 * 60 - now.getHours() * 60 - now.getMinutes()) : Infinity;
    days.push({ date, budget: Math.max(0, Math.min(Math.floor(exam.hoursPerDay * 60) - reserved, wall)), used: 0, sessions: [] });
  }
  const incomplete: string[] = [];
  let index = 0;
  for (const r of ranking) {
    let remaining = estimateMinutes(r.topic) + 15;
    while (remaining > 0 && index < days.length) {
      const day = days[index];
      if (!day) break;
      const breakMin = day.sessions.length ? 10 : 0;
      const free = day.budget - day.used - breakMin;
      if (free < 15) { index++; continue; }
      if (breakMin) { day.sessions.push({ title: 'Break — stretch and reset', minutes: 10, score: 0, priority: 'Low' }); day.used += 10; }
      const minutes = Math.min(50, free, remaining);
      day.sessions.push({ topicId: r.topic.id, title: `${remaining <= 15 ? 'Quick recall' : 'Study'}: ${r.topic.name}`, minutes, score: r.score, priority: r.level });
      day.used += minutes; remaining -= minutes;
    }
    if (remaining > 0) incomplete.push(r.topic.name);
  }
  return { ranking, days: days.filter(d => d.sessions.length), incomplete };
}
export function appendStrategy(plan: Plan | null, examId: string, days: StrategyDay[], today: string): Plan {
  const tasks = days.flatMap(d => d.sessions.map((s, i) => ({ id: `intelligence-${examId}-${d.date}-${i}-${s.topicId ?? 'break'}`, examId, topicId: s.topicId ?? '', title: s.title, date: d.date, minutes: s.minutes, priority: s.priority, score: s.score, kind: 'learn' as const, done: false })));
  return { generatedAt: plan?.generatedAt ?? today, tasks: [...(plan?.tasks ?? []), ...tasks.filter(t => !plan?.tasks.some(p => p.id === t.id))], unscheduled: plan?.unscheduled ?? [] };
}