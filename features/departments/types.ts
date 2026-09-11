export interface Department {
  id: string;
  name: string;
  description: string | null;
}

export interface DepartmentPayload {
  name: string;
  description?: string;
}
