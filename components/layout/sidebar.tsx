"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Moon, Settings, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

import { visibleSections } from "@/components/layout/nav-items";
import { hasRole } from "@/lib/permissions";

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 1 · Active-link matching
// ─────────────────────────────────────────────────────────────────────────────

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/*
 * "/" needs an exact match or it would light up on every page — every path
 * starts with a slash. Everything else matches its own subtree, so /employees
 * stays highlighted while you are on /employees/abc-123.
 *
 * Note /leaves and /leaves/mine both match the prefix rule for /leaves. The
 * order in NAV_SECTIONS puts "My Leave" first, and both being lit is arguably
 * correct — but if it looks wrong to you, the fix is the same longest-prefix
 * approach as minRoleForPath in permissions.ts.
 */

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 2 · Theme toggle
// ─────────────────────────────────────────────────────────────────────────────

/*
 * The theme lives in two external places — the `dark` class on <html> and
 * localStorage — so it is subscribed to rather than mirrored into state.
 *
 * `useSyncExternalStore` is built for exactly this: it reads the live value on
 * every render, re-renders when the store announces a change, and takes a
 * separate server snapshot so SSR does not touch the DOM.
 *
 * The earlier version read localStorage in an effect and called setState, which
 * is a cascading render — one pass in the wrong theme, then a second to correct
 * it. Reading the class directly means the toggle can never disagree with the
 * page it is describing.
 */
const themeStore = {
  subscribe(onChange: () => void) {
    window.addEventListener("workora-theme-change", onChange);
    return () => window.removeEventListener("workora-theme-change", onChange);
  },
  getSnapshot() {
    return document.documentElement.classList.contains("dark");
  },
  // Server render has no DOM; light is the default ground.
  getServerSnapshot() {
    return false;
  },
};

function ThemeToggle() {
  const isDark = useSyncExternalStore(
    themeStore.subscribe,
    themeStore.getSnapshot,
    themeStore.getServerSnapshot,
  );

  function apply(dark: boolean) {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("workora-theme", dark ? "dark" : "light");
    // Tells every mounted toggle to re-read, not just this one.
    window.dispatchEvent(new Event("workora-theme-change"));
  }

  return (
    <div className="flex rounded-pill bg-surface-sunk p-1">
      <button
        type="button"
        onClick={() => apply(false)}
        aria-pressed={!isDark}
        className={`flex flex-1 items-center justify-center gap-2 rounded-pill px-3 py-2 text-body-sm font-semibold transition-colors ${
          isDark ? "text-text-muted hover:text-text-strong" : "bg-surface-raised text-text-strong shadow-sm"
        }`}
      >
        <Sun size={16} aria-hidden />
        Light
      </button>
      <button
        type="button"
        onClick={() => apply(true)}
        aria-pressed={isDark}
        className={`flex flex-1 items-center justify-center gap-2 rounded-pill px-3 py-2 text-body-sm font-semibold transition-colors ${
          isDark ? "bg-surface-raised text-text-strong shadow-sm" : "text-text-muted hover:text-text-strong"
        }`}
      >
        <Moon size={16} aria-hidden />
        Dark
      </button>
    </div>
  );
}

/*
 * This is why globals.css declares dark mode as a class variant rather than
 * following the OS: the design has an explicit toggle, so the user's choice has
 * to be able to disagree with their system setting.
 *
 * The class is applied before first paint by a small inline script in
 * app/layout.tsx, so there is no flash of the wrong theme. This component only
 * reads and writes it.
 */

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 3 · The sidebar
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The nav itself, with no shell around it.
 *
 * Rendered twice: inside the fixed `<Sidebar>` on desktop, and inside the
 * slide-over in mobile-nav.tsx. Extracting it is what stops the two drifting —
 * one list of links, one active-state rule, one place to add a section.
 *
 * `onNavigate` lets the mobile drawer close itself when a link is tapped; the
 * desktop sidebar passes nothing.
 */
export function SidebarNav({
  userType,
  onNavigate,
}: {
  userType: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const sections = visibleSections(userType, hasRole);

  return (
    <>
      <nav className="scroll-area flex-1 overflow-y-auto px-3 py-5">
        {sections.map((section, index) => (
          <div key={section.title ?? index} className={index > 0 ? "mt-6" : ""}>
            {section.title ? (
              <p className="px-3 pb-2 text-body-xs font-semibold uppercase tracking-wider text-text-subtle">
                {section.title}
              </p>
            ) : null}

            <ul className="flex flex-col gap-1">
              {section.items.map((item) => {
                const active = isActive(pathname, item.href);
                const Icon = item.icon;

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={`flex items-center gap-3 rounded-field px-3 py-2.5 text-body-md font-semibold transition-all ${
                        active
                          ? "bg-primary text-white shadow-card"
                          : "text-text-muted hover:bg-surface-sunk hover:text-text-strong"
                      }`}
                    >
                      <Icon size={18} aria-hidden />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="flex shrink-0 flex-col gap-1 p-3 pt-4">
        <Link
          href="/settings"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-field px-3 py-2.5 text-body-md font-semibold text-text-muted transition-colors hover:bg-surface-sunk hover:text-text-strong"
        >
          <Settings size={18} aria-hidden />
          Settings
        </Link>
        <ThemeToggle />
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 4 · Desktop shell
// ─────────────────────────────────────────────────────────────────────────────

export function Sidebar({ userType }: { userType: string }) {
  return (
    <aside className="hidden w-64 shrink-0 flex-col rounded-panel bg-surface-raised shadow-card lg:flex">
      <div className="flex h-16 shrink-0 items-center gap-2 px-6 pt-3">
        <span className="text-h5 font-extrabold text-primary">H</span>
        <span className="text-body-lg font-bold text-text-strong">Workora</span>
      </div>

      <SidebarNav userType={userType} />
    </aside>
  );
}

/*
 * WHY THIS IS A CLIENT COMPONENT
 *
 * `usePathname` — the active link has to change as you navigate, and the server
 * rendered this once. The theme toggle needs state too.
 *
 * Note what it does NOT do: fetch the user. `userType` arrives as a prop from
 * the layout, which already has the session from `requireSession()`. Fetching it
 * again here would be a second round-trip for something the server already knew.
 *
 * `aria-current="page"` marks the active link for screen readers. The green
 * background says "you are here" to sighted users only.
 *
 * THE SPLIT EXISTS FOR MOBILE
 *
 * `<Sidebar>` is still `hidden lg:flex` — a 256px column has no place on a
 * phone. But the nav inside it is the only way to reach seventeen routes, so
 * below 1024px it has to appear somewhere.
 *
 * `SidebarNav` is that content with no shell, so mobile-nav.tsx can render the
 * identical list in a slide-over. Before this split there was simply no
 * navigation at all under 1024px — every route was unreachable once you were on
 * a page, which is fatal for the planned WebView build.
 */
