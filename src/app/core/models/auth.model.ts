export interface VendorTokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface VendorProfile {
  id: string;
  storeId: string;
  storeName: string;
  email: string;
  fullName: string;
  role: 'owner' | 'staff';
}

export interface VendorLoginResponse extends VendorTokenPair {
  profile: VendorProfile;
}

export interface ApiErrorBody {
  error?: { code?: string; message?: string };
}
