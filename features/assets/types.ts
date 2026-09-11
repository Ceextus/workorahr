export interface Asset {
  id: string;
  name: string;
  category: string;
  serialNumber: string | null;
  notes: string | null;

  /*
   * The docs give the create payload and never show a response, so everything
   * about assignment is optional. `assignedToEmployeeId` is the field this UI
   * uses to decide "in use" versus "in stock" — if the backend spells it
   * differently, `isAssigned` below is the one place to fix.
   */
  assignedToEmployeeId?: string | null;
  assignedToName?: string | null;
  assignedAt?: string | null;
  conditionNotes?: string | null;
  createdAt?: string | null;
}

export interface CreateAssetPayload {
  name: string;
  category: string;
  serialNumber?: string;
  notes?: string;
}

export interface AssignAssetPayload {
  id: string;
  employeeId: string;
}

export interface ReturnAssetPayload {
  id: string;
  conditionNotes?: string;
}

/** Is this asset currently with somebody? */
export function isAssigned(asset: Asset): boolean {
  return Boolean(asset.assignedToEmployeeId ?? asset.assignedToName);
}

/*
 * ASSETS USE AN *EMPLOYEE* ID, UNLIKE INCIDENTS.
 *
 * POST /assets/{id}/assign takes `{ "employeeId": "" }`. That is the same key
 * space as GET /employees, which means this feature CAN offer a real dropdown
 * of people — and `useEmployeeNameMap()` can resolve `assignedToEmployeeId`
 * into a name.
 *
 * Worth stating plainly because the neighbouring incidents feature cannot do
 * either of those things: it takes a *user* id, and nothing in the API maps one
 * to the other. Two features, two id spaces, one API. See the note at the foot
 * of features/incidents/types.ts.
 */
