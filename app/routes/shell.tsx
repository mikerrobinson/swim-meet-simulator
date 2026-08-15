import { useEffect } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { syncLabel, useSyncStatus } from "~/state/auto-sync";
import { useMeetStore } from "~/state/meet-store";

const TABS = [
  { to: "/", label: "Meet", end: true, icon: "🏊" },
  { to: "/setup", label: "Setup", end: false, icon: "⚙️" },
  { to: "/registration", label: "Register", end: false, icon: "📋" },
  { to: "/run", label: "Run", end: false, icon: "⏱️" },
  { to: "/results", label: "Results", end: false, icon: "🏅" },
];

const CHIP_TONES: Record<string, string> = {
  good: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  busy: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  warn: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  muted: "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

export default function Shell() {
  const { ready, meet } = useMeetStore();
  const navigate = useNavigate();
  const location = useLocation();

  // Everything except the landing page needs a meet to work with.
  useEffect(() => {
    if (ready && !meet && location.pathname !== "/") {
      navigate("/", { replace: true });
    }
  }, [ready, meet, location.pathname, navigate]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-400">
        Loading…
      </div>
    );
  }

  const status = useSyncStatus();
  const chip = syncLabel(status);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-30 h-[var(--app-chrome-top)] pt-[env(safe-area-inset-top)] border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
        <div className="mx-auto flex h-full max-w-3xl items-center justify-between gap-3 px-4">
          <h1 className="truncate text-base font-bold">
            {meet?.name ?? "Meet Runner"}
          </h1>
          {meet && (
            <span
              className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${CHIP_TONES[chip.tone]}`}
            >
              {chip.text}
            </span>
          )}
        </div>
      </header>

      {/* Bottom padding clears the fixed tab bar, including the iOS home bar.
          The registration grid opts out of the centered column so its event
          columns can spread across the full window. */}
      <main
        className={`mx-auto px-4 pt-4 pb-[calc(var(--app-chrome-bottom)+1rem)] ${
          location.pathname.startsWith("/registration")
            ? "max-w-none"
            : "max-w-3xl"
        }`}
      >
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex h-[var(--app-nav-h)] max-w-3xl">
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `flex flex-1 touch-manipulation flex-col items-center justify-center gap-0.5 text-xs font-semibold transition-colors ${
                  isActive
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-slate-500 dark:text-slate-400"
                }`
              }
            >
              <span aria-hidden className="text-xl leading-none">
                {tab.icon}
              </span>
              {tab.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
