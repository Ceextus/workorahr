import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";

import { QueryProvider } from "@/components/providers/query-provider";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

/*
 * Manrope is a variable font (200–800 on Google Fonts), so no `weight` array is
 * needed — asking for specific weights would pull static cuts instead and cost
 * you the ones the styleguide uses at both ends (Regular 400 through
 * Extrabold 800).
 *
 * next/font self-hosts the files at build time. Nothing is fetched from Google
 * at runtime, so there is no third-party request and no flash of fallback text.
 *
 * `variable` exposes it as a CSS custom property, which app/globals.css picks up
 * as --font-sans inside @theme. That is the seam between the two files.
 */
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Workora",
  description: "Employee management for modern teams.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Fills the display behind a notch, so `env(safe-area-inset-*)` becomes usable.
  viewportFit: "cover",
  // Keeps the layout height stable when a mobile keyboard opens.
  interactiveWidget: "resizes-content",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f1f5f4" },
    { media: "(prefers-color-scheme: dark)", color: "#131923" },
  ],
};

/*
 * WHY THIS EXPORT MATTERS MORE THAN USUAL HERE
 *
 * Without a viewport meta tag a phone renders the page at ~980px wide and scales
 * it down, so everything is unreadably small and no media query ever matches.
 * Every responsive rule in this codebase is inert until this exists.
 *
 * `viewportFit: "cover"` lets the page paint under the notch and home indicator,
 * which is what makes `env(safe-area-inset-*)` in globals.css return real values
 * instead of zero.
 *
 * `interactiveWidget: "resizes-content"` shrinks the layout viewport when the
 * keyboard appears rather than sliding the page up under it — the difference
 * between a form field staying visible while typing and disappearing behind the
 * keyboard.
 *
 * NOT SET: `maximumScale: 1` / `userScalable: false`. They are the usual pair for
 * making a web app feel native, and they also disable pinch-zoom entirely, which
 * is a real accessibility regression for anyone who needs to magnify. The iOS
 * auto-zoom-on-focus problem they are usually reached for is solved properly in
 * globals.css instead, by giving inputs a 16px font size on small screens.
 */

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${manrope.variable} h-full antialiased`}
    >
      <head>
        {/*
          Applies the stored theme BEFORE first paint.

          Everything else in this app is React, but this cannot be: any component
          runs after the first frame, so a dark-mode user would see one light flash
          on every load. In a WebView that reads as a broken screen rather than a
          transition.

          A blocking inline script in <head> is the standard answer — it is a few
          hundred bytes, runs before the body renders, and the try/catch keeps a
          browser with site data blocked from throwing on `localStorage`.

          The toggle in sidebar.tsx then reads this class as its source of truth
          via useSyncExternalStore, so the two can never disagree.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var s=localStorage.getItem('workora-theme');var d=s?s==='dark':matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d)}catch(e){}`,
          }}
        />
      </head>

      {/*
        This file stays a Server Component. QueryProvider is the client boundary,
        and `children` passes through it already rendered — nesting inside a
        client component does not make the tree client-side.
      */}
      <body className="min-h-full flex flex-col font-sans">
        <QueryProvider>{children}</QueryProvider>
        <Toaster />
      </body>
    </html>
  );
}
