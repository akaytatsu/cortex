export interface User {
  id: string;
  email: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
}

// Public user interface without password for client-side usage
export interface UserPublic {
  id: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}
