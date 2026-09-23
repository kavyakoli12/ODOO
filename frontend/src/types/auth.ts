export type UserRole = 'citizen' | 'officer' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  isEmailVerified: boolean;
  phone?: string;
  familyPhone?: string;
  familyName?: string;
  familyRelation?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  bloodGroup?: string;
  medicalNotes?: string;
  badgeNumber?: string;
  department?: string;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  user?: User;
  accessToken?: string;
  requiresVerification?: boolean;
  email?: string;
  devOtp?: string;
  previewUrl?: string;
}
