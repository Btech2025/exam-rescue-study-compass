import { Link } from "@tanstack/react-router";
import {
  Brain,
  BookOpenCheck,
  ChevronsLeft,
  FileSearch,
  Gauge,
  GraduationCap,
  LayoutDashboard,
  LifeBuoy,
  ListChecks,
  Menu,
  Settings,
  Siren,
  Target,
  X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { loadState } from "@/lib/store";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/rescue", label: "Rescue Mode", icon: Siren },
  { to: "/syllabus", label: "Syllabus Analyzer", icon: BookOpenCheck },
  { to: "/pyq", label: "PYQ Research", icon: FileSearch },
  { to: "/exams", label: "My Exams", icon: GraduationCap },
  { to: "/planner", label: "Study Planner", icon: ListChecks },
  { to: "/topics", label: "Topic Intelligence", icon: Brain },
  { to: "/practice", label: "Practice Arena", icon: Target },
  { to: "/readiness", label: "Readiness Report", icon: Gauge },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function NavList({ collapsed, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-0.5">
      {NAV.map(({ to, label, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          onClick={onNavigate}
          activeOptions={{ exact: to === "/" }}
          className="group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-surface hover:text-foreground"
          activeProps={{
            className: "!bg-primary/10 !text-primary !font-semibold",
          }}
          title={collapsed ? label : undefined}
        >
          <Icon className="h-[18px] w-[18px] shrink-0 transition-transform group-hover:scale-110" />
          {!collapsed && <span className="truncate">{label}</span>}
        </Link>
      ))}
    </nav>
  );
}

function Logo({ collapsed }: { collapsed?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-[oklch(0.70_0.15_285)] text-primary-foreground shadow-md transition group-hover:shadow-lg">
        <LifeBuoy className="h-5 w-5" />
        <div className="absolute inset-0 rounded-xl bg-white/20 opacity-0 transition group-hover:opacity-100" />
      </div>
      {!collapsed && (
        <div className="leading-tight">
          <div className="font-display text-sm font-bold tracking-wide text-foreground">
            EXAM RESCUE
          </div>
          <div className="text-[10px] font-medium text-muted-foreground">Exam prep copilot</div>
        </div>
      )}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    loadState();
    setReady(true);
  }, []);

  return (
    <div className="min-h-screen">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden flex-col border-r bg-card p-3 transition-all duration-300 lg:flex",
          collapsed ? "w-[68px]" : "w-60",
        )}
      >
        <div className="group mb-6 flex items-center justify-between px-1 pt-2">
          <Logo collapsed={collapsed} />
        </div>
        <NavList collapsed={collapsed} />
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="mt-auto flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted-foreground transition hover:bg-surface hover:text-foreground"
          aria-label="Toggle sidebar"
        >
          <ChevronsLeft
            className={cn("h-4 w-4 transition-transform duration-300", collapsed && "rotate-180")}
          />
          {!collapsed && "Collapse"}
        </button>
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-card/90 px-4 py-3 backdrop-blur lg:hidden">
        <Logo />
        <button
          onClick={() => setMobile(true)}
          className="rounded-lg p-2 text-muted-foreground transition hover:bg-surface hover:text-foreground"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>
      {mobile && (
        <div
          className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm lg:hidden"
          onClick={() => setMobile(false)}
        >
          <div
            className="h-full w-72 border-r bg-card p-4 animate-in slide-in-from-left duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <Logo />
              <button
                onClick={() => setMobile(false)}
                aria-label="Close menu"
                className="text-muted-foreground transition hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavList onNavigate={() => setMobile(false)} />
          </div>
        </div>
      )}

      <main className={cn("transition-all duration-300", collapsed ? "lg:pl-[68px]" : "lg:pl-60")}>
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
          {ready ? (
            <div
              key={typeof location !== "undefined" ? location.pathname : "root"}
              className="route-enter"
            >
              {children}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="skeleton h-8 w-56 rounded-lg" />
              <div className="grid gap-4 md:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="skeleton h-36 rounded-xl" />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
