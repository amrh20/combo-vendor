export interface VendorTokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
}

export interface VendorStoreSummary {
  id: string;
  name: string;
  logoUrl: string | null;
  canEditCatalog: boolean;
}

/** Profile on `POST /v1/auth/store/login` and `GET /v1/auth/store/me`. */
export interface VendorProfile {
  id: string;
  fullName: string;
  username: string;
  phone: string | null;
  role: 'MANAGER' | 'CASHIER';
  store: VendorStoreSummary;
}

export interface VendorLoginResponse extends VendorTokenPair {
  profile: VendorProfile;
}

export interface ApiErrorBody {
  error?: { code?: string; message?: string };
}
