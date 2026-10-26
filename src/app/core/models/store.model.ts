export type StoreOperationalStatus = 'open' | 'busy' | 'closed';

export interface BusinessHoursDay {
  day: string;
  open: string;
  close: string;
  closed: boolean;
}

export interface StoreProfile {
  id: string;
  name: string;
  logoUrl?: string;
  coverUrl?: string;
  defaultPreparationMinutes: number;
  operationalStatus: StoreOperationalStatus;
  businessHours: BusinessHoursDay[];
  phone?: string;
  address?: string;
}
