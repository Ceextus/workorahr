import type { LucideIcon } from "lucide-react";
import {
  Banknote,
  Bell,
  Building2,
  CalendarClock,
  CalendarDays,
  ClipboardList,
  Clock,
  FileText,
  LayoutGrid,
  Landmark,
  Laptop,
  Megaphone,
  Receipt,
  ShieldAlert,
  Truck,
  UserCog,
  Users,
} from "lucide-react";

import type { Role } from "@/lib/permissions";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Omitted means every authenticated user sees it. */
  minRole?: Role;
}

export interface NavSection {
  /** Omitted renders the items with no heading — used for the first group. */
  title?: string;
  items: NavItem[];
}

// ─────────────────────────────────────────────────────────────────────────────
// The sidebar, grouped by what someone is trying to do
// ─────────────────────────────────────────────────────────────────────────────

export const NAV_SECTIONS: NavSection[] = [
  {
    items: [{ label: "Dashboard", href: "/", icon: LayoutGrid }],
  },
  {
    title: "People",
    items: [
      { label: "Employees", href: "/employees", icon: Users },
      { label: "Departments", href: "/departments", icon: Building2 },
      { label: "Roles", href: "/roles", icon: UserCog },
    ],
  },
  {
    title: "Time",
    items: [
      { label: "My Leave", href: "/leaves/mine", icon: CalendarDays },
      { label: "Leave Requests", href: "/leaves", icon: ClipboardList, minRole: "MANAGER" },
      { label: "Attendance", href: "/attendance", icon: Clock },
      { label: "Scheduling", href: "/scheduling", icon: CalendarClock },
    ],
  },
  {
    title: "Money",
    items: [
      { label: "Payroll", href: "/payroll", icon: Banknote },
      { label: "Expenses", href: "/expenses", icon: Receipt },
    ],
  },
  {
    title: "Workplace",
    items: [
      { label: "Assets", href: "/assets", icon: Laptop },
      { label: "Bookings", href: "/bookings", icon: CalendarDays },
      { label: "Incidents", href: "/incidents", icon: ShieldAlert },
      { label: "Vendors", href: "/vendors", icon: Truck, minRole: "HR" },
    ],
  },
  {
    title: "Communication",
    items: [
      { label: "Announcements", href: "/announcements", icon: Megaphone },
      { label: "Notifications", href: "/notifications", icon: Bell },
      { label: "Policy Documents", href: "/policy-documents", icon: FileText },
      { label: "Board Room", href: "/board", icon: Landmark },
    ],
  },
];

/*
 * WHY THE NAV IS DATA, NOT JSX
 *
 * Written as markup, filtering by role means twenty scattered
 * `{isHR(user) && <NavLink .../>}` conditionals, and the answer to "what can a
 * MANAGER actually see?" is spread across a render function.
 *
 * As an array it is one list to read, and filtering is a single pass the sidebar
 * does once. It is also testable without rendering anything.
 *
 * WHY THIS IS NOT THE TEMPLATE'S NAV
 *
 * The mockup's sidebar reads Employees / Checklist / Time Off / Attendance /
 * Payroll / Performance / Recruitment. Three of those — Checklist, Performance,
 * Recruitment — have no endpoints in your API at all. Building them would mean
 * links to pages that cannot load anything.
 *
 * These sections are your seventeen real resource groups instead, grouped by
 * what someone came to do rather than by how the API is split.
 *
 * TWO ENTRIES FOR ONE RESOURCE
 *
 * "My Leave" (/leaves/mine) and "Leave Requests" (/leaves) are the same feature
 * seen from two sides, which is why permissions.ts gates them separately. An
 * employee sees only the first; a manager sees both. Same reasoning would apply
 * to expenses if you later split its two views.
 *
 * /board CARRIES NO `minRole`, AND THAT IS NOT AN OVERSIGHT
 *
 * The board room is gated by membership, not rank: an ADMIN who was never added
 * to the board is still refused. There is no rank that expresses that, so any
 * `minRole` here would be a guess that either hides the link from real members
 * or shows it to non-members — both wrong, one of them silently.
 *
 * So the link is shown to everyone and the *feature* owns the check, which is
 * the only place that can make it. Until it is built, /board renders the shared
 * placeholder, so nobody is misled about having access to something.
 *
 * NOT IN THIS LIST: THE SUB-ROUTES
 *
 * /incidents/on-call, /scheduling/swap-requests and /board/chat all exist and
 * all render placeholders, but none appear here. They belong to a parent screen
 * and should be reached from it — a top-level link to "Swap requests" before
 * Scheduling itself exists puts the detail above the thing it is a detail of.
 * Each parent links to its own children when it is built.
 *
 * NOT IN THIS LIST ANY MORE: /help
 *
 * "Help Center" came from the template design and was linked in the sidebar
 * footer for months. There is no help endpoint in the API and no /help route in
 * the app, so it was a link to a 404 dressed as a feature. Removed rather than
 * given a placeholder, because unlike the others it is not a documented resource
 * waiting to be built — there is nothing behind it to build.
 */

/** Flattens the sections to the entries `userType` is allowed to see. */
export function visibleSections(
  userType: string | null | undefined,
  hasRole: (role: string | null | undefined, required: Role) => boolean,
): NavSection[] {
  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter(
      (item) => !item.minRole || hasRole(userType, item.minRole),
    ),
  })).filter((section) => section.items.length > 0);
}

/*
 * `hasRole` is passed in rather than imported so this module stays free of
 * runtime dependencies and remains trivially testable. The sidebar supplies the
 * real one.
 *
 * The trailing filter drops any section left empty — without it, an EMPLOYEE
 * would see a "Workplace" heading with Vendors missing and nothing odd about it,
 * but a section whose every item was gated would render as a floating label.
 */
