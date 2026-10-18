import { Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { BookOpenCheck, FileSearch, Plus, Trash2, Upload, ExternalLink, ListChecks, Siren } from 'lucide-react';
import { toast } from 'sonner';
import { Badge, Button, Field, PageHeader, PriorityBadge, inputCls } from './ui';
import { actions, useAppState } from '@/lib/store';
import { addDays, fmtDay, fmtMin, todayISO, uid } from '@/lib/engine';
import { emptyIntelligence, intelligenceRanking, mergeSyllabus, normalize, paperYears, parseSyllabus, preparationStrategy, publicSource, type Intelligence, type Paper, type SyllabusTopic } from '@/lib/intelligence';
import { readPdf } from '@/lib/pdf';
import type { Exam, Difficulty, Importance, Status } from '@/lib/types';

export function ExamIntelligence({ research = false }: { research?: boolean }) {
  const s = useAppState();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<Intelligence>(() => s.intelligence ?? emptyIntelligence());
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [chosen, setChosen] = useState<string[]>(() => (s.intelligence?.topics ?? []).map(t => t.name));
  const [date, setDate] = useState(addDays(todayISO(), 7));
  const [hours, setHours] = useState(2);
  const [newId] = useState(() => uid());
  const [strategyOpen, setStrategyOpen] = useState(false);
  const [paper, setPaper] = useState<Paper>({ id: '', title: '', url: '', text: '', year: '', review: 'pending' });
  const baseExam = s.exams.find(e => e.id === draft.examId);
  const exam: Exam = baseExam ?? { id: newId, name: `${draft.subject || 'Syllabus'} · ${draft.examType}`, subject: draft.subject || 'Syllabus', date, hoursPerDay: hours, topics: [] };
  const rankings = intelligenceRanking(draft, s, exam, todayISO());
  const selection = rankings.filter(r => chosen.some(n => normalize(n) === normalize(r.topic.name))).map(r => r.topic.id);
  const strategy = strategyOpen ? preparationStrategy(draft, s, exam, selection) : null;
  const analyzed = draft.papers.filter(p => p.review === 'verified' && p.text.trim());
  const years = [...new Set(analyzed.map(p => p.year).filter(Boolean))].sort();
  const update = (next: Intelligence) => { setDraft(next); setStrategyOpen(false); };
  const save = () => { actions.saveIntelligence(draft); toast.success('Syllabus and evidence saved on this device.'); };
  const extract = (value: string) => { const topics = parseSyllabus(value); update({ ...draft, topics }); setChosen(topics.map(t => t.name)); setError(''); };
  const upload = async (file: File | undefined, isPaper = false) => {
    if (!file) return;
    setBusy(true); setError('');
    try { const value = await readPdf(file); if (isPaper) setPaper(p => ({ ...p, title: p.title || file.name, text: value })); else { setText(value); extract(value); } toast.success('PDF text extracted. Review it before saving.'); }
    catch (e) { setError(e instanceof Error ? e.message : 'Cannot read this PDF. Paste text instead.'); }
    finally { setBusy(false); }
  };
  const editTopic = (id: string, change: Partial<SyllabusTopic>) => update({ ...draft, topics: draft.topics.map(t => t.id === id ? { ...t, ...change } : t) });
  const addPaper = () => {
    const url = publicSource(paper.url);
    if (!url || !paper.title.trim() || !paper.text.trim()) { setError('Add a title, public HTTPS source link, and readable paper text or PDF.'); return; }
    if (paper.year && !paperYears(paper.text).includes(paper.year)) { setError('The selected year does not appear in the paper text. Leave it unverified.'); return; }
    const next = { ...draft, papers: [...draft.papers, { ...paper, url, id: uid() }] };
    update(next); actions.saveIntelligence(next); setPaper({ id: '', title: '', url: '', text: '', year: '', review: 'pending' }); setError(''); toast.success('Paper added for review.');
  };
  const send = async (rescue = false) => {
    if (!draft.subject.trim() || !selection.length) { setError('Enter a subject and select at least one topic.'); return; }
    if (exam.date <= todayISO() || !Number.isFinite(exam.hoursPerDay) || exam.hoursPerDay <= 0 || exam.hoursPerDay > 24) { setError('Choose a future exam date and between 0 and 24 study hours per day.'); return; }
    const topics = rankings.filter(r => selection.includes(r.topic.id)).map(r => r.topic);
    const merged = mergeSyllabus(exam, topics);
    if (rescue) actions.saveExam(merged);
    else actions.sendStrategy(merged, preparationStrategy(draft, s, exam, selection).days);
    actions.saveIntelligence({ ...draft, examId: merged.id });
    toast.success(rescue ? 'Selected topics sent to Rescue Mode.' : 'Strategy added; existing planner tasks preserved.');
    await navigate(rescue ? { to: '/rescue', search: { exam: merged.id } } : { to: '/planner' });
  };
  return <div className="space-y-6">
    <PageHeader title="Exam Intelligence" sub={research ? 'PYQ Research' : 'Syllabus Analyzer'} action={<Button variant="ghost" onClick={() => { if (!window.confirm('Delete the saved syllabus and all its evidence from this device? Planner topics will remain.')) return; actions.deleteIntelligence(); setDraft(emptyIntelligence()); setText(''); setChosen([]); setStrategyOpen(false); toast.success('Syllabus and evidence deleted.'); }}><Trash2 className="h-4 w-4" />Delete syllabus</Button>} />
    <nav className="flex flex-wrap gap-3 border-b pb-4"><Link to="/syllabus"><Button variant={research ? 'outline' : 'primary'}><BookOpenCheck className="h-4 w-4" />Syllabus Analyzer</Button></Link><Link to="/pyq"><Button variant={research ? 'primary' : 'outline'}><FileSearch className="h-4 w-4" />PYQ Research</Button></Link></nav>
    {error && <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>}
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {(['university', 'course', 'semester', 'subject'] as const).map(key => <Field key={key} label={key[0]?.toUpperCase() + key.slice(1)}><input className={inputCls} value={draft[key]} onChange={e => update({ ...draft, [key]: e.target.value })} /></Field>)}
      <Field label="Exam type"><select className={inputCls} value={draft.examType} onChange={e => update({ ...draft, examType: e.target.value })}>{['End semester', 'Mid semester', 'Internal assessment', 'Other'].map(x => <option key={x}>{x}</option>)}</select></Field>
      <Field label="Target exam"><select className={inputCls} value={draft.examId} onChange={e => { const target = s.exams.find(x => x.id === e.target.value); update({ ...draft, examId: e.target.value, subject: target?.subject ?? draft.subject }); }}><option value="">Create a new exam</option>{s.exams.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select></Field>
    </section>
    {!research && <section className="space-y-4 border-t pt-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Your syllabus</h2><label className="flex items-center gap-2 text-sm text-primary"><Upload className="h-4 w-4" />Upload syllabus PDF<input aria-label="Upload syllabus PDF" className="max-w-48 text-xs" type="file" accept="application/pdf" disabled={busy} onChange={e => void upload(e.target.files?.[0])} /></label></div>
      <p className="text-xs text-muted-foreground">Private on this device. Original PDFs are not uploaded or retained. Text extraction is rule-based; scanned PDFs need pasted text.</p>
      <Field label="Syllabus text"><textarea className={`${inputCls} h-40 py-3`} value={text} onChange={e => setText(e.target.value)} placeholder="Unit 1: Foundations&#10;Arrays: traversal, insertion, deletion&#10;Unit 2: Trees&#10;Binary search trees" /></Field>
      <div className="flex flex-wrap gap-2"><Button disabled={busy} onClick={() => { try { extract(text); } catch (e) { setError(e instanceof Error ? e.message : 'Cannot extract topics.'); } }}>{busy ? 'Reading PDF…' : 'Extract topics'}</Button><Button variant="outline" onClick={() => update({ ...draft, topics: [...draft.topics, { id: uid(), name: '', unit: '', subtopics: [], marks: '', objectives: '', difficulty: 'Medium', importance: 'Medium', status: 'Not Started' }] })}><Plus className="h-4 w-4" />Add topic manually</Button></div>
      <h2 className="pt-3 text-lg font-semibold">Review extracted topics <span className="text-muted-foreground">({draft.topics.length})</span></h2>
      {!draft.topics.length && <p className="py-5 text-sm text-muted-foreground">No syllabus reviewed yet.</p>}
      {draft.topics.map((t, i) => <article key={t.id} className="rounded-lg border bg-card p-4"><div className="mb-3 flex items-center justify-between"><span className="font-mono text-xs text-primary">TOPIC {i + 1}</span><Button title="Remove topic" aria-label={`Remove topic ${i + 1}`} size="sm" variant="ghost" onClick={() => update({ ...draft, topics: draft.topics.filter(x => x.id !== t.id) })}><Trash2 className="h-4 w-4" /></Button></div><div className="grid gap-3 sm:grid-cols-2">
        <Field label="Topic name"><input className={inputCls} value={t.name} onChange={e => editTopic(t.id, { name: e.target.value })} /></Field><Field label="Syllabus unit"><input className={inputCls} value={t.unit} onChange={e => editTopic(t.id, { unit: e.target.value })} /></Field>
        <Field label="Subtopics (comma separated)"><input className={inputCls} value={t.subtopics.join(', ')} onChange={e => editTopic(t.id, { subtopics: e.target.value.split(',').map(x => x.trim()) })} /></Field><Field label="Stated marks distribution"><input className={inputCls} value={t.marks} onChange={e => editTopic(t.id, { marks: e.target.value })} /></Field>
        <Field label="Learning objectives"><input className={inputCls} value={t.objectives} onChange={e => editTopic(t.id, { objectives: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-2"><Field label="Importance"><select className={inputCls} value={t.importance} onChange={e => editTopic(t.id, { importance: e.target.value as Importance })}>{['Low', 'Medium', 'High'].map(v => <option key={v}>{v}</option>)}</select></Field><Field label="Difficulty"><select className={inputCls} value={t.difficulty} onChange={e => editTopic(t.id, { difficulty: e.target.value as Difficulty })}>{['Easy', 'Medium', 'Hard'].map(v => <option key={v}>{v}</option>)}</select></Field></div>
      </div></article>)}
      <Button variant="signal" disabled={!draft.topics.length} onClick={() => { if (draft.topics.some(t => !t.name.trim()) || new Set(draft.topics.map(t => normalize(t.name))).size !== draft.topics.length) { setError('Topic names must be nonempty and unique.'); return; } setChosen(draft.topics.map(t => t.name)); save(); }}>Save reviewed syllabus</Button>
    </section>}
    {research && <section className="space-y-4 border-t pt-5">
      <h2 className="text-lg font-semibold">Public question paper resources</h2>
      <div className="rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm"><strong className="text-warning">Live search is not configured</strong><p className="mt-1 text-muted-foreground">Connect Firecrawl in Lovable → Connectors to enable web research. A Firecrawl connection (managed or your own Firecrawl API key) is required; searches may consume paid credits. No live search has taken place.</p></div>
      <Field label="Research query"><input readOnly className={inputCls} value={[draft.university, draft.course, draft.subject, draft.semester && `semester ${draft.semester}`, draft.examType, 'previous year question paper', ...draft.topics.slice(0, 3).map(t => t.name)].filter(Boolean).join(' ')} /></Field>
      <h3 className="font-semibold">Add a real paper for review</h3><p className="text-xs text-muted-foreground">Use the original source, preferably a university examination portal. User verification is not a claim of official publication.</p>
      <div className="grid gap-3 sm:grid-cols-2"><Field label="Paper title"><input className={inputCls} value={paper.title} onChange={e => setPaper({ ...paper, title: e.target.value })} /></Field><Field label="Original source link"><input type="url" className={inputCls} value={paper.url} onChange={e => setPaper({ ...paper, url: e.target.value })} /></Field></div>
      <label className="block text-sm text-primary">Upload question paper PDF <input aria-label="Upload question paper PDF" type="file" accept="application/pdf" disabled={busy} onChange={e => void upload(e.target.files?.[0], true)} className="mt-2 block max-w-full text-xs" /></label>
      <Field label="Retrieved paper text"><textarea className={`${inputCls} h-32 py-3`} value={paper.text} onChange={e => setPaper({ ...paper, text: e.target.value, year: '' })} /></Field>
      <Field label="Year stated in paper"><select className={inputCls} value={paper.year} onChange={e => setPaper({ ...paper, year: e.target.value })}><option value="">Unverified year</option>{paperYears(paper.text).map(y => <option key={y}>{y}</option>)}</select></Field><Button disabled={busy} onClick={addPaper}>Add paper for review</Button>
      {!draft.papers.length && <p className="py-4 text-sm text-muted-foreground">No papers retrieved or analyzed yet.</p>}
      {draft.papers.map(p => <article key={p.id} className="space-y-3 rounded-lg border bg-card p-4"><div className="flex flex-wrap justify-between gap-2"><a href={p.url} target="_blank" rel="noreferrer" className="flex min-w-0 items-center gap-2 break-words font-semibold text-primary">{p.title}<ExternalLink className="h-4 w-4 shrink-0" /></a><Badge tone={p.review === 'verified' ? 'lime' : 'muted'}>{p.review === 'verified' ? 'Verified by you' : p.review}</Badge></div><p className="break-all text-xs text-muted-foreground">{new URL(p.url).hostname} · {p.year || 'Year unverified'} · {p.text.trim() ? 'Text available' : 'No readable text'}</p><details><summary className="cursor-pointer text-sm">Paper text</summary><pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-words text-xs">{p.text}</pre></details><p className="text-xs text-muted-foreground">Matched topics: {draft.topics.filter(t => (` ${normalize(p.text)} `).includes(` ${normalize(t.name)} `)).map(t => t.name).join(', ') || 'No exact matches'}</p><div className="flex flex-wrap gap-2">{(['verified', 'irrelevant', 'pending'] as const).map(review => <Button size="sm" variant={p.review === review ? 'primary' : 'outline'} key={review} onClick={() => { const next = { ...draft, papers: draft.papers.map(x => x.id === p.id ? { ...x, review } : x) }; update(next); actions.saveIntelligence(next); }}>{review === 'verified' ? 'Mark verified' : review === 'irrelevant' ? 'Mark irrelevant' : 'Reset review'}</Button>)}<Button size="sm" variant="ghost" aria-label={`Delete ${p.title}`} onClick={() => { const next = { ...draft, papers: draft.papers.filter(x => x.id !== p.id) }; update(next); actions.saveIntelligence(next); }}><Trash2 className="h-4 w-4" /></Button></div></article>)}
    </section>}
    {rankings.length > 0 && <section className="space-y-4 border-t pt-6"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Important topic intelligence</h2><Badge tone="lime">{analyzed.length} papers analyzed</Badge></div><p className="text-xs text-muted-foreground">Year range: {years.length ? `${years[0]}–${years.at(-1)}` : 'Not verified'}. Exact wording matches only, not semantic analysis. Priorities with fewer than three reviewed papers are provisional. No prediction of next-exam questions.</p>
      {rankings.map(r => <article key={r.topic.id} className="rounded-lg border bg-card p-4"><div className="flex flex-wrap items-start justify-between gap-3"><label className="flex min-w-0 items-start gap-3"><input type="checkbox" className="mt-1" checked={chosen.some(n => normalize(n) === normalize(r.topic.name))} onChange={e => setChosen(e.target.checked ? [...chosen, r.topic.name] : chosen.filter(n => normalize(n) !== normalize(r.topic.name)))} /><span className="break-words font-semibold">{r.topic.name}<span className="mt-1 block text-xs font-normal text-muted-foreground">{r.topic.unit}</span></span></label><div className="flex gap-2"><PriorityBadge level={r.level} />{r.provisional && <Badge tone="amber">Provisional</Badge>}</div></div><ul className="mt-3 space-y-1 text-xs text-muted-foreground">{r.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul><div className="mt-3 flex flex-wrap gap-3">{r.evidence.map(p => <a key={p.id} href={p.url} target="_blank" rel="noreferrer" className="text-xs text-primary underline">{p.title} · {p.year || 'year unverified'}</a>)}</div><Field label="Preparation status"><select className={`${inputCls} mt-2 max-w-48`} value={r.topic.status} onChange={e => { const status = e.target.value as Status; if (baseExam?.topics.some(t => t.id === r.topic.id)) actions.setTopicStatus(r.topic.id, status); else editTopic(r.topic.id, { status }); }}>{['Not Started', 'Learning', 'Revised'].map(v => <option key={v}>{v}</option>)}</select></Field></article>)}
      {!baseExam && <div className="grid gap-3 sm:grid-cols-2"><Field label="Exam date"><input type="date" className={inputCls} value={date} min={addDays(todayISO(), 1)} onChange={e => setDate(e.target.value)} /></Field><Field label="Available study hours per day"><input type="number" min="0.25" max="24" step="0.25" className={inputCls} value={hours} onChange={e => setHours(Number(e.target.value))} /></Field></div>}
      {baseExam && <p className="text-sm text-muted-foreground">{baseExam.name} · {fmtDay(baseExam.date)} · {baseExam.hoursPerDay}h/day</p>}
      <Button variant="signal" disabled={!selection.length} className="h-auto min-h-10 py-2 text-left" onClick={() => { if (!draft.subject.trim() || exam.date <= todayISO() || hours <= 0 || hours > 24) { setError('Enter a subject, future exam date, and valid study hours.'); return; } setStrategyOpen(true); }}>Generate My Preparation Strategy</Button>
      {strategy && <div className="space-y-4"><h3 className="font-semibold">Your day-by-day strategy</h3><p className="text-xs text-muted-foreground">Existing planner commitments and breaks count toward the limit. Planning ends before exam day; today stops at 11pm. Preview covers at most 60 days.</p>{strategy.incomplete.length > 0 && <p role="status" className="text-sm text-warning">Not everything fits. Partly covered or deferred: {strategy.incomplete.join(', ')}. Highest-value topics come first.</p>}{!strategy.days.length && <p className="text-sm text-warning">No free study capacity remains alongside your existing planner.</p>}{strategy.days.map(d => <article key={d.date} className="rounded-lg border bg-card p-4"><div className="flex justify-between gap-2"><h4 className="font-semibold">{fmtDay(d.date)}</h4><span className="font-mono text-xs text-signal">{fmtMin(d.used)} / {fmtMin(d.budget)} free</span></div><ol className="mt-3 space-y-2">{d.sessions.map((session, i) => <li key={i} className="flex justify-between gap-3 text-sm"><span className="break-words">{session.title}</span><span className="shrink-0 text-muted-foreground">{session.minutes}m</span></li>)}</ol></article>)}<div className="flex flex-wrap gap-3"><Button disabled={!strategy.days.length} onClick={() => void send()}><ListChecks className="h-4 w-4" />Send to Study Planner</Button><Button variant="outline" onClick={() => void send(true)}><Siren className="h-4 w-4" />Send to Rescue Mode</Button></div></div>}
    </section>}
  </div>;
}