import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button, Field, PageHeader, Panel, PanelTitle, inputCls } from "@/components/app/ui";
import { actions, useAppState } from "@/lib/store";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Exam Rescue" },
      { name: "description", content: "Profile, data and sample data settings." },
      { property: "og:title", content: "Settings — Exam Rescue" },
      { property: "og:description", content: "Manage your Exam Rescue data." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const s = useAppState();
  const [name, setName] = useState(s.settings.name);
  return (
    <div className="max-w-2xl space-y-5">
      <PageHeader title="Settings" />
      <Panel>
        <PanelTitle>Profile</PanelTitle>
        <form onSubmit={(e) => { e.preventDefault(); if (name.length > 40) return toast.error("Name is too long"); actions.setName(name.trim()); toast.success("Saved"); }} className="flex items-end gap-2">
          <div className="flex-1"><Field label="Your name"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} /></Field></div>
          <Button type="submit">Save</Button>
        </form>
      </Panel>
      <Panel>
        <PanelTitle>Data</PanelTitle>
        <p className="mb-4 text-sm text-muted-foreground">Your data is saved in this browser only — there's no account yet, so it won't sync across devices and clearing browser data removes it.</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => { if (confirm("Replace everything with sample data?")) { actions.resetSample(); toast.success("Sample data restored"); } }}>Load sample data</Button>
          <Button variant="danger" onClick={() => { if (confirm("Delete all exams, plans and quiz results?")) { actions.clearAll(); toast.success("All data cleared — start fresh"); } }}>Clear all data</Button>
        </div>
      </Panel>
      <Panel>
        <PanelTitle>Coming later</PanelTitle>
        <p className="text-sm text-muted-foreground">Syllabus PDF analysis, AI-generated questions and personalized recommendations are planned. Today, all priorities and plans come from transparent rules you can see in Topic Intelligence.</p>
      </Panel>
    </div>
  );
}
