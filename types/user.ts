export type Role =
  | "Project Manager"
  | "Construction Manager"
  | "Quality Manager"
  | "Procurement Manager"
  | "HSE Manager"
  | "Planning Manager"
  | "Supervisor"
  | "Inspector"
  | "Buyer"
  | "Foreman"
  | "Worker";

export interface User {
  _id: string;
  fullName: string;
  email: string;
  role: Role;
  department: string;
  password: string; 
  reportsTo?: string | { _id: string };
  projectId :String
}
