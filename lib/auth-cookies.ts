/**
 * Cookie names issued by POST /auth/login.
 *
 * WHY THIS IS ITS OWN FILE
 *
 * These names started life in lib/auth.ts, which is the natural home for them.
 * Adding `import "server-only"` to that file made it the wrong home.
 *
 * Three different runtimes need to agree on the string "accessToken":
 *
 *   middleware.ts   edge runtime, checks whether the cookie is present
 *   lib/auth.ts     node server, reads its value and forwards it
 *   (later)         client code, to clear local state on logout
 *
 * `server-only` works by resolving to a throwing module unless the bundler is
 * using the `react-server` export condition. Middleware is not compiled with
 * that condition, so importing lib/auth.ts from middleware is at best fragile
 * and at worst a build failure.
 *
 * The fix is not to weaken lib/auth.ts. It is to notice that a cookie *name* is
 * a shared contract, not server logic — nothing here reads a cookie, it only
 * says what one is called. Splitting the contract from the implementation lets
 * the implementation stay locked down.
 *
 * Keep this file free of imports. The moment it needs one, it stops being
 * runtime-neutral and this whole arrangement quietly breaks.
 */

export const ACCESS_TOKEN_COOKIE = "accessToken";
export const REFRESH_TOKEN_COOKIE = "refreshToken";

export const AUTH_COOKIES = [ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE] as const;
