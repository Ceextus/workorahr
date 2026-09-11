import type { CSSProperties } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 1 · The primitive
// ─────────────────────────────────────────────────────────────────────────────

/*
 * Full class strings in a lookup, NOT `rounded-${rounded}`.
 *
 * Tailwind finds classes by scanning source text for complete literals. It never
 * evaluates your code, so an interpolated name is invisible to it and the CSS is
 * simply never generated — no error, no warning, just a square corner where you
 * expected a round one. This is the single most common Tailwind bug, and it gets
 * worse in production where unused classes are not lying around from elsewhere.
 */
const ROUNDED = {
  field: "rounded-field",
  card: "rounded-card",
  pill: "rounded-pill",
  panel: "rounded-panel",
} as const;

interface SkeletonProps {
  /** Extra classes — usually the width and height of the thing being awaited. */
  className?: string;
  style?: CSSProperties;
  rounded?: keyof typeof ROUNDED;
}

export function Skeleton({ className = "", style, rounded = "field" }: SkeletonProps) {
  return (
    <div
      aria-hidden
      style={style}
      className={`relative overflow-hidden bg-surface-sunk ${ROUNDED[rounded]} ${className}`}
    >
      <div
        className="shimmer-sweep absolute inset-0 animate-shimmer
          bg-gradient-to-r from-transparent via-white/70 to-transparent
          dark:via-white/10"
      />
    </div>
  );
}

/*
 * HOW THE SHIMMER WORKS
 *
 * The grey block is the outer div. Inside it sits a full-size gradient that is
 * transparent at both edges and light in the middle, animated from -100% to
 * +100% on the X axis. `overflow-hidden` clips it, so what you see is a
 * highlight travelling across the block.
 *
 * The gradient is white at 70% in light mode and 10% in dark — a bright sweep on
 * a dark surface looks like a strobe, so it has to be much subtler there.
 *
 * `aria-hidden` because this is visual scaffolding, not content. A screen reader
 * announcing "loading" ten times for ten skeleton rows is worse than silence;
 * the container that owns the request should carry the live region instead.
 *
 * The `.shimmer-sweep` class exists only so globals.css can hide the moving part
 * under prefers-reduced-motion. The grey block stays, so the loading state is
 * still communicated without the animation.
 */

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 2 · Shapes you reach for repeatedly
// ─────────────────────────────────────────────────────────────────────────────

/** A line of text. `w` lets rows vary so a paragraph does not look like a grid. */
export function SkeletonText({
  className = "",
  width,
}: {
  className?: string;
  width?: string;
}) {
  return (
    <Skeleton
      rounded="pill"
      className={`h-3.5 ${className}`}
      style={width ? { width } : undefined}
    />
  );
}

/** An avatar or icon chip. */
export function SkeletonCircle({ size = 40 }: { size?: number }) {
  return <Skeleton rounded="pill" style={{ width: size, height: size }} />;
}

/*
 * WHY THESE TWO EXIST
 *
 * Because `<Skeleton className="h-3.5 w-32 rounded-pill" />` written forty times
 * across the app is forty chances to pick a slightly different height. Naming
 * the two recurring shapes keeps them identical everywhere.
 *
 * THE RULE FOR USING THESE
 *
 * Skeleton only what you do not know yet. Column headers, icons, section titles
 * and button labels are all known before the request finishes and should render
 * immediately — replacing them with grey blocks throws away layout the browser
 * could already paint, and makes the page lurch when data lands.
 *
 * Match the real shape too: if a row is an avatar plus two lines, the skeleton
 * is a circle plus two lines of roughly the same widths. A skeleton that does
 * not match causes exactly the layout shift it was meant to prevent.
 */
