import Link from "next/link";

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 1 · The shell all three auth screens share
// ─────────────────────────────────────────────────────────────────────────────

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="safe-x flex min-h-dvh w-full">
      <BrandPanel />

      <div className="flex flex-1 flex-col bg-surface-raised">
        <main className="safe-top flex flex-1 items-center justify-center px-5 py-10 sm:px-6 sm:py-12">
          <div className="w-full max-w-120">{children}</div>
        </main>
        <AuthFooter />
      </div>
    </div>
  );
}

/*
 * WHY THIS FILE EXISTS
 *
 * Login, forgot-password and reset-password are three routes wearing the same
 * frame: brand panel on the left, a centred column on the right, footer beneath.
 * A layout renders once and keeps that frame mounted while only `children`
 * changes between routes — so navigating from login to forgot-password does not
 * re-render or re-download the photo.
 *
 * This is what route groups are actually for. `(auth)` adds nothing to any URL —
 * this is still /login, not /auth/login — it exists purely so these three routes
 * can share a layout that the dashboard does not.
 *
 * Note it was not in the original folder plan. It earned its place the moment a
 * second page needed the same frame.
 *
 * WHY THE TYPE IS `LayoutProps<"/">` AND NOT `LayoutProps<"/login">`
 *
 * Because route groups really are invisible to routing. `(auth)` contributes no
 * URL segment, so as far as Next is concerned this layout sits at "/" — the same
 * level as the root layout. Next generates the union of valid layout routes into
 * .next/types/routes.d.ts, and today it contains exactly one entry: "/".
 *
 * `LayoutProps<"/login">` fails to compile for that reason. A useful reminder
 * that the folder tree and the route tree are two different shapes, and the
 * generated types describe the second one.
 */

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 2 · Brand panel
// ─────────────────────────────────────────────────────────────────────────────

function BrandPanel() {
  return (
    <aside className="relative hidden w-1/2 max-w-180 flex-col lg:flex">
      {/*
        The hero photo is a background-image rather than next/image so the panel
        still looks deliberate before the asset exists — the grey-800 ground
        shows through instead of a broken-image icon. Drop the file at
        public/login-hero.jpg and it appears with no code change.
      */}
      <div
        className="flex-1 bg-grey-800 bg-cover bg-center"
        style={{ backgroundImage: "url('/login-hero.jpg')" }}
        role="presentation"
      />

      {/* The green seam between photo and panel, straight from the styleguide. */}
      <div className="h-1 shrink-0 bg-primary" />

      <div className="shrink-0 bg-grey-900 px-12 py-14">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-h4 font-extrabold text-primary">H</span>
          <span className="text-body-xl font-bold text-white">Workora</span>
        </Link>

        <h1 className="mt-8 text-h2 text-white">
          Let&rsquo;s empower your employees today.
        </h1>

        <p className="mt-4 text-body-lg text-grey-400">
          We help you manage people, payroll and time off in one place.
        </p>
      </div>
    </aside>
  );
}

/*
 * TWO DELIBERATE DEPARTURES FROM THE MOCKUP
 *
 * 1 · The brand reads "Workora", not "HRDashboard". That name belongs to the
 *     template the design was built from. Shipping it would put someone else's
 *     product name on your login screen. Say the word if the real brand is
 *     different again and it changes here and in app/layout.tsx.
 *
 * 2 · The subheading is rewritten. The mockup says "We help to complete all your
 *     conveyancing needs easily" — conveyancing is property law, left over from
 *     whatever the template was originally for. It has nothing to do with an HR
 *     system, and it is the sort of thing that ships to production because
 *     everyone assumed it was intentional.
 *
 * `hidden lg:flex` drops the whole panel below 1024px. Nothing here is content —
 * it is atmosphere — so on a phone the form takes the full width rather than
 * being pushed below a large decorative image.
 */

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 3 · Footer
// ─────────────────────────────────────────────────────────────────────────────

function AuthFooter() {
  return (
    <footer className="safe-bottom flex flex-wrap items-center justify-center gap-x-6 gap-y-2 px-5 pb-6 text-body-sm sm:px-6 sm:pb-8">
      <p className="text-text-subtle">
        &copy; {new Date().getFullYear()} Workora. All rights reserved.
      </p>
      <nav className="flex gap-6">
        <Link href="/terms" className="font-medium text-text-strong hover:underline">
          Terms &amp; Conditions
        </Link>
        <Link href="/privacy" className="font-medium text-text-strong hover:underline">
          Privacy Policy
        </Link>
      </nav>
    </footer>
  );
}

/*
 * `new Date().getFullYear()` rather than a hard-coded 2025. This is a Server
 * Component, so it is evaluated per request — the year is simply correct, and
 * nobody has to remember to change it in January.
 *
 * The two links point at routes that do not exist yet, so they will 404. That is
 * the honest state: the pages are real obligations, not decoration, and a 404 is
 * a better reminder than a `href="#"` that silently goes nowhere.
 */
