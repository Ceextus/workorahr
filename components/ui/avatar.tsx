"use client";

import { useState } from "react";

/**
 * Turns whatever `profilePictureUrl` holds into something an <img> can load.
 *
 * The browser cannot reach the backend directly — API_BASE_URL has no
 * NEXT_PUBLIC_ prefix, deliberately, so the backend origin never ships to the
 * client. Anything relative therefore has to go through our own proxy route,
 * the same way every other request does.
 *
 * NOTE: whether a relative path resolves correctly depends on where the backend
 * serves uploaded files from. If pictures 404 once one is uploaded, this is the
 * function to look at — log the raw `profilePictureUrl` and compare it to what
 * the proxy builds.
 */
export function pictureSrc(url: string | null | undefined): string | null {
  if (!url) return null;

  // A local preview from URL.createObjectURL, or an inline image. Never rewrite.
  if (/^(data:|blob:)/i.test(url)) return url;

  /*
   * Anything containing /uploads/ is a file this backend stored, and the host
   * in front of it cannot be trusted — see the note at the foot of this file.
   * Keep the path from /uploads/ onward and send it through our own proxy.
   */
  const uploads = url.indexOf("/uploads/");
  if (uploads !== -1) return `/api${url.slice(uploads)}`;

  // Some other absolute URL — a cloud storage provider, say. Leave it alone.
  if (/^https?:/i.test(url)) return url;

  // Already pointing at our proxy.
  if (url.startsWith("/api/")) return url;

  return `/api/${url.replace(/^\/+/, "")}`;
}

export function initialsOf(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((part) => part[0] ?? "")
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"
  );
}

const TEXT_FOR_SIZE = (size: number) =>
  size >= 72 ? "text-h4" : size >= 44 ? "text-body-lg" : "text-body-sm";

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
}

export function Avatar({ name, src, size = 40, className = "" }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const resolved = failed ? null : pictureSrc(src);

  return (
    <span
      style={{ width: size, height: size }}
      className={`grid shrink-0 place-items-center overflow-hidden rounded-pill bg-primary/10 font-bold text-primary ${TEXT_FOR_SIZE(size)} ${className}`}
    >
      {resolved ? (
        // Not next/image: the backend host is not in next.config's
        // remotePatterns, and blob: previews cannot be optimised at all.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={resolved}
          alt=""
          width={size}
          height={size}
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <span aria-hidden>{initialsOf(name)}</span>
      )}
    </span>
  );
}

/*
 * THE /uploads/ REWRITE IS THE FIX FOR "UPLOAD SUCCEEDED, PICTURE NEVER APPEARS"
 *
 * The backend stores files locally and builds the URL as `{BASE_URL}/uploads/…`,
 * where BASE_URL defaults to `http://localhost:8080/api/v1`. If that variable is
 * not set in the deploy environment — and it was not — every uploaded picture is
 * recorded with a localhost address.
 *
 * The upload genuinely succeeds, the response is 200, the toast says so, and
 * `profilePictureUrl` comes back populated. Then the browser tries to load
 * `http://localhost:8080/...`, which on the user's machine is nothing at all.
 * The request fails, `onError` fires, and this component quietly shows initials
 * — exactly what it shows when there is no picture. A completely silent failure,
 * with every visible signal saying it worked.
 *
 * Taking everything from `/uploads/` onward and prefixing `/api` sends it
 * through the proxy route instead, which knows the real backend origin. That
 * makes the rendered image independent of whatever host got baked into the
 * database, so it fixes rows already stored with a bad URL as well as new ones.
 *
 * Setting BASE_URL correctly on the server is still worth doing — anything else
 * reading `profilePictureUrl` gets a working link — but it is no longer what
 * stands between an upload and a visible face.
 *
 * Note the ordering: `blob:` is checked first so a local preview is never
 * rewritten, and the generic `https?:` passthrough comes after, so a future move
 * to S3 or Cloudinary (whose URLs contain no `/uploads/`) is unaffected.
 *
 * WHY `onError` MATTERS MORE THAN USUAL HERE
 *
 * A profile picture URL can be present and still not load — the file was
 * deleted, the path is wrong, the proxy guess above is off. Without a fallback
 * that renders a broken-image glyph in a circle, which looks like a bug in the
 * app rather than a missing file.
 *
 * Falling back to initials means the worst case is indistinguishable from
 * "no picture uploaded yet", which is a state the UI already handles gracefully.
 *
 * `alt=""` because the name is always rendered beside the avatar in every place
 * this is used. Repeating it would make a screen reader say it twice.
 *
 * WHY THIS COMPONENT EXISTS AT ALL
 *
 * The initials expression was written out four times — topbar, employee table,
 * employee grid, employee profile — each slightly differently, and none of them
 * rendered `profilePictureUrl`. One component means uploading a picture now
 * shows up everywhere at once, rather than in whichever place got remembered.
 */
