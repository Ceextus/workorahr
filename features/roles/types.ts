export interface RoleRecord {
  id: string;
  name: string;
  description: string | null;
}

export interface RolePayload {
  name: string;
  description?: string;
}
