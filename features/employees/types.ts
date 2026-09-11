

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 1 · The record
// ─────────────────────────────────────────────────────────────────────────────

/** Nested `department` and `role` come back expanded, not as bare ids. */
export interface EmployeeRef {
  id: string;
  name: string;
}

export interface Employee {
  id: string;
  /**
   * The linked *user* account id — a different key space from `id`.
   *
   * Incidents and on-call address people by user id, not employee id, and this
   * is the only field in the API that bridges the two. Optional because it is
   * only present on responses built from EmployeeResponse; anything reading it
   * must cope with it being absent.
   */
  userId?: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  jobTitle: string | null;
  department: EmployeeRef | string | null;
  departmentId?: string | null;
  departmentName?: string | null;
  role: EmployeeRef | string | null;
  roleId?: string | null;
  roleName?: string | null;
  salary: number | null;
  /** ISO date, YYYY-MM-DD. */
  hireDate: string | null;
  active: boolean;
  profilePictureUrl: string | null;
}

const isUuid = (val: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim());

/**
 * Resolves the display name of an employee's department across all backend response shapes:
 * 1. Nested object: `{ id, name }`, `{ departmentId, departmentName }`, `{ title }`
 * 2. Direct string: e.g. `"Engineering"` or department UUID
 * 3. Top-level property: `departmentName`, `deptName`
 * 4. Array of departments: `departments`
 * 5. Foreign key `departmentId` / `deptId` resolved via `departmentById` Map
 */
export function getEmployeeDepartmentName(
  employee: Employee,
  departmentById?: Map<string, string>,
): string {
  const anyEmp = employee as unknown as Record<string, unknown>;

  const lookupDept = (val: string): string => {
    if (!val) return "";
    const clean = String(val).trim();
    if (departmentById?.has(clean)) return departmentById.get(clean)!;
    if (departmentById?.has(clean.toLowerCase())) return departmentById.get(clean.toLowerCase())!;
    return clean;
  };

  // 1. Direct object property: employee.department.{name, departmentName, title}
  if (employee.department && typeof employee.department === "object") {
    const rec = employee.department as unknown as Record<string, unknown>;
    const directName = rec.name || rec.departmentName || rec.title;
    if (typeof directName === "string" && directName.trim()) {
      return directName.trim();
    }
    const id = rec.id || rec.departmentId || rec._id;
    if (typeof id === "string" && id.trim()) {
      const found = lookupDept(id.trim());
      if (found && !isUuid(found)) return found;
    }
  }

  // 2. Direct string property
  if (typeof employee.department === "string" && employee.department.trim()) {
    const found = lookupDept(employee.department.trim());
    if (found && !isUuid(found)) return found;
  }

  // 3. Top-level departmentName / deptName
  if (typeof anyEmp.departmentName === "string" && anyEmp.departmentName.trim()) {
    return anyEmp.departmentName.trim();
  }
  if (typeof anyEmp.deptName === "string" && anyEmp.deptName.trim()) {
    return anyEmp.deptName.trim();
  }

  // 4. Array of departments: employee.departments
  if (Array.isArray(anyEmp.departments) && anyEmp.departments.length > 0) {
    const names = anyEmp.departments
      .map((d: unknown) => {
        if (!d) return "";
        if (typeof d === "string") {
          const found = lookupDept(d);
          return found && !isUuid(found) ? found : "";
        }
        if (typeof d === "object") {
          const rec = d as Record<string, unknown>;
          const directName = rec.name || rec.departmentName || rec.title;
          if (typeof directName === "string" && directName.trim()) return directName.trim();
          const id = rec.id || rec.departmentId || rec._id;
          if (typeof id === "string") {
            const found = lookupDept(id);
            return found && !isUuid(found) ? found : "";
          }
        }
        return "";
      })
      .filter(Boolean);
    if (names.length > 0) return names.join(", ");
  }

  // 5. Foreign key lookup via departmentId or deptId
  const deptId =
    (typeof anyEmp.departmentId === "string" && anyEmp.departmentId.trim()
      ? anyEmp.departmentId.trim()
      : undefined) ||
    (typeof anyEmp.deptId === "string" && anyEmp.deptId.trim()
      ? anyEmp.deptId.trim()
      : undefined) ||
    (typeof anyEmp.department_id === "string" && anyEmp.department_id.trim()
      ? anyEmp.department_id.trim()
      : undefined) ||
    (employee.department && typeof employee.department === "object"
      ? (employee.department as EmployeeRef).id ||
        ((employee.department as unknown as Record<string, unknown>).departmentId as string | undefined) ||
        ((employee.department as unknown as Record<string, unknown>)._id as string | undefined)
      : undefined);

  if (deptId) {
    const found = lookupDept(deptId);
    if (found && !isUuid(found)) return found;
  }

  return "—";
}

/**
 * Resolves the display name of an employee's role(s) across all backend response shapes:
 * 1. Array of roles: `roles: [{ id, name }]` or `["id"]`
 * 2. Array of role IDs: `roleIds: ["uuid"]`
 * 3. Nested object: `{ id, name }`, `{ roleName }`, `{ title }`
 * 4. Direct string: e.g. `"Admin"`
 * 5. Foreign key `roleId` resolved via `roleById` Map
 * 6. Fallback userType / userRole
 */
export function getEmployeeRoleName(
  employee: Employee,
  roleById?: Map<string, string>,
): string {
  const anyEmp = employee as unknown as Record<string, unknown>;

  const lookupRole = (val: string): string => {
    if (!val) return "";
    const clean = String(val).trim();
    if (roleById?.has(clean)) return roleById.get(clean)!;
    if (roleById?.has(clean.toLowerCase())) return roleById.get(clean.toLowerCase())!;
    return clean;
  };

  // 1. Array of roles: employee.roles = [{ id, name }] or ["id"]
  if (Array.isArray(anyEmp.roles) && anyEmp.roles.length > 0) {
    const names = anyEmp.roles
      .map((r: unknown) => {
        if (!r) return "";
        if (typeof r === "string") {
          const found = lookupRole(r);
          return found && !isUuid(found) ? found : "";
        }
        if (typeof r === "object") {
          const rec = r as Record<string, unknown>;
          const directName = rec.name || rec.roleName || rec.title;
          if (typeof directName === "string" && directName.trim()) return directName.trim();
          const id = rec.id || rec.roleId || rec._id;
          if (typeof id === "string") {
            const found = lookupRole(id);
            return found && !isUuid(found) ? found : "";
          }
        }
        return "";
      })
      .filter(Boolean);
    if (names.length > 0) return names.join(", ");
  }

  // 2. Array of roleIds: employee.roleIds = ["uuid"]
  if (Array.isArray(anyEmp.roleIds) && anyEmp.roleIds.length > 0) {
    const names = anyEmp.roleIds
      .map((id: unknown) => {
        if (!id) return "";
        const found = lookupRole(String(id));
        return found && !isUuid(found) ? found : "";
      })
      .filter(Boolean);
    if (names.length > 0) return names.join(", ");
  }

  // 3. Nested object: employee.role = { id, name } / { roleName } / { title }
  if (employee.role && typeof employee.role === "object") {
    const rec = employee.role as unknown as Record<string, unknown>;
    const directName = rec.name || rec.roleName || rec.title;
    if (typeof directName === "string" && directName.trim()) {
      return directName.trim();
    }
    const id = rec.id || rec.roleId || rec._id;
    if (typeof id === "string" && id.trim()) {
      const found = lookupRole(id.trim());
      if (found && !isUuid(found)) return found;
    }
  }

  // 4. Direct string role
  if (typeof employee.role === "string" && employee.role.trim()) {
    const found = lookupRole(employee.role.trim());
    if (found && !isUuid(found)) return found;
  }

  // 5. Top-level roleName / roleTitle
  if (typeof anyEmp.roleName === "string" && anyEmp.roleName.trim()) {
    return anyEmp.roleName.trim();
  }
  if (typeof anyEmp.roleTitle === "string" && anyEmp.roleTitle.trim()) {
    return anyEmp.roleTitle.trim();
  }

  // 6. Top-level roleId
  const rId =
    (typeof anyEmp.roleId === "string" && anyEmp.roleId.trim() ? anyEmp.roleId.trim() : undefined) ||
    (typeof anyEmp.role_id === "string" && anyEmp.role_id.trim() ? anyEmp.role_id.trim() : undefined);
  if (rId) {
    const found = lookupRole(rId);
    if (found && !isUuid(found)) return found;
  }

  // 7. userType or userRole fallback (e.g. "ADMIN", "HR", "EMPLOYEE")
  if (typeof anyEmp.userType === "string" && anyEmp.userType.trim()) {
    return anyEmp.userType.trim();
  }
  if (typeof anyEmp.userRole === "string" && anyEmp.userRole.trim()) {
    return anyEmp.userRole.trim();
  }

  return "—";
}

/**
 * Resolves the department ID from an employee record.
 */
export function getEmployeeDepartmentId(employee: Employee): string | undefined {
  const anyEmp = employee as unknown as Record<string, unknown>;
  if (typeof anyEmp.departmentId === "string" && anyEmp.departmentId.trim()) {
    return anyEmp.departmentId.trim();
  }
  if (typeof anyEmp.deptId === "string" && anyEmp.deptId.trim()) {
    return anyEmp.deptId.trim();
  }
  if (typeof anyEmp.department_id === "string" && anyEmp.department_id.trim()) {
    return anyEmp.department_id.trim();
  }
  if (employee.department && typeof employee.department === "object") {
    const rec = employee.department as unknown as Record<string, unknown>;
    const id = rec.id || rec.departmentId || rec._id;
    if (typeof id === "string" && id.trim()) {
      return id.trim();
    }
  }
  if (typeof employee.department === "string" && employee.department.trim()) {
    return employee.department.trim();
  }
  return undefined;
}

/**
 * Resolves the role IDs from an employee record.
 */
export function getEmployeeRoleIds(employee: Employee): string[] {
  const anyEmp = employee as unknown as Record<string, unknown>;

  if (Array.isArray(anyEmp.roleIds) && anyEmp.roleIds.length > 0) {
    return anyEmp.roleIds.map(String).filter(Boolean);
  }

  if (Array.isArray(anyEmp.roles) && anyEmp.roles.length > 0) {
    return anyEmp.roles
      .map((r: unknown) => {
        if (!r) return "";
        if (typeof r === "string") return r;
        if (typeof r === "object") {
          const rec = r as Record<string, unknown>;
          const id = rec.id || rec.roleId || rec._id;
          if (typeof id === "string") return id;
        }
        return "";
      })
      .filter(Boolean);
  }

  if (employee.role && typeof employee.role === "object") {
    const rec = employee.role as unknown as Record<string, unknown>;
    const id = rec.id || rec.roleId || rec._id;
    if (typeof id === "string" && id.trim()) {
      return [id.trim()];
    }
  }

  if (typeof anyEmp.roleId === "string" && anyEmp.roleId.trim()) {
    return [anyEmp.roleId.trim()];
  }

  if (typeof employee.role === "string" && employee.role.trim()) {
    return [employee.role.trim()];
  }

  return [];
}

/*
 * NOTE THE ASYMMETRY, IT MATTERS
 *
 * Reads give you `department: { id, name }` — expanded, so a table can print the
 * name without a second request.
 *
 * Writes take `departmentId: string` — just the id.
 *
 * So an edit form cannot round-trip the object it was handed. It has to map
 * `employee.department?.id` back into the payload. Miss that and you send
 * `[object Object]` as the id, and the backend rejects it with a message about
 * a malformed UUID that says nothing about which field.
 *
 * This shape is extremely common in REST APIs. Modelling both sides honestly —
 * rather than one loose type with optional everything — makes the compiler catch
 * the mistake instead of the backend.
 */

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 2 · Writes
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateEmployeePayload {
  firstName: string;
  lastName: string;
  email: string;
  /** Required. A UUID from GET /departments. */
  departmentId: string;
  /** Required. */
  salary: number;
  /** Required. YYYY-MM-DD */
  hireDate: string;
  /** Optional. */
  jobTitle?: string;
  /** Optional. An array of role UUIDs from GET /roles. */
  roleIds?: string[];
}

/**
 * PUT /employees/{id} — a genuine partial update. Every field is optional and
 * only non-null ones are applied, so send just what changed.
 *
 * This is a different DTO from create, not a subset of it. It accepts four
 * fields, and names roles differently.
 */
export interface UpdateEmployeePayload {
  /*
   * Required by validation even though the service ignores them.
   *
   * PUT /employees/{id} binds the SAME EmployeeRequest DTO as create, and the
   * controller annotates it `@Valid` — so @NotBlank on firstName/lastName/email
   * and @NotNull on hireDate/salary/departmentId all fire on update. The docs
   * describe this endpoint as "partial update — every field is optional", and
   * the deployed build disagrees.
   *
   * firstName, lastName and email are validated and then discarded: the service
   * only assigns hireDate, jobTitle, salary, departmentId and roleIds. They live
   * on the User row and this endpoint cannot change them.
   */
  firstName: string;
  lastName: string;
  email: string;
  /** YYYY-MM-DD. Required by validation, and genuinely applied. */
  hireDate: string;
  salary: number;
  departmentId: string;

  jobTitle?: string;
  /**
   * Plural, and an array — NOT `roleId`. A non-empty array replaces the
   * employee's roles outright.
   *
   * Sending `[]` does NOT clear them: the backend treats an empty array as
   * "no change". So there is currently no way to remove every role from
   * someone through this endpoint.
   */
  roleIds?: string[];
}

/*
 * THIS SHAPE WAS DETERMINED BY PROBING, NOT BY READING THE DOCS.
 *
 * The Postman collection documents ten fields for POST /employees. The real DTO
 * takes eight, and rejects two of them outright with
 * "Request body contains invalid or unrecognized fields":
 *
 *   userType   no alternate spelling accepted (type, accessLevel, roleName)
 *   phone      nor phoneNumber, mobile, contactPhone
 *
 * `roleIds` (plural, an array of UUIDs) is accepted — but `roleId` (singular)
 * is NOT. The field name must match exactly.
 *
 * Required, per the backend's own validation messages: email (valid),
 * departmentId, salary, hireDate. `jobTitle` and `roleIds` are optional.
 */

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 3 · Filters
// ─────────────────────────────────────────────────────────────────────────────

/** Server-side filters — the only three GET /employees accepts. */
export interface EmployeeFilters {
  firstName?: string;
  lastName?: string;
  email?: string;
}

/** Narrowing done in the browser, because the API has no params for it. */
export interface EmployeeClientFilters {
  /** Matches name, email or job title. */
  search?: string;
  departmentId?: string;
  active?: boolean;
}

/*
 * THE SERVER FILTERS CHANGED COMPLETELY.
 *
 * They used to be departmentId, jobTitle and active. GET /employees now accepts
 * firstName, lastName and email — and nothing else. Department and status are no
 * longer server-side concerns at all.
 *
 * Two things follow from that:
 *
 *   1. Department and status filtering has to happen in the browser. That is
 *      acceptable here only because the endpoint still returns every row in one
 *      array with no pagination — we already hold the whole set, so filtering it
 *      locally is complete rather than partial.
 *
 *   2. A single search box cannot map onto firstName/lastName/email, because it
 *      cannot know which one you typed. Sending the term as `firstName` would
 *      silently fail to find anyone searched by surname.
 *
 * So the list is fetched unfiltered and narrowed locally. That is also faster:
 * one request, then instant filtering with no debounce and no refetch.
 *
 * The server filters are kept in the type because they are real and will matter
 * the day pagination arrives — at which point search, department and status all
 * have to move back to the server together.
 *
 * Note also: "Non-HR/Admin/SuperAdmin callers only see their own department."
 * The backend scopes the list by role before we ever see it, so an employee's
 * "all departments" is already just theirs.
 */
