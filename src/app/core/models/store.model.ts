/** Shop switch sent to `PATCH /v1/store/status`. `OPEN` follows opening hours. */
export type StoreStatus = 'OPEN' | 'BUSY' | 'CLOSED';

/** What customers see: the switch, the hours, and the ops on/off together. */
export type LiveStatus = 'OPEN' | 'BUSY' | 'CLOSED';

/** Cairo time. `weekday` 0 = Sunday. A missing weekday is closed. `closes <= opens` runs past midnight. */
export interface StoreHours {
  weekday: number;
  opens: string;
  closes: string;
}

/** `GET /v1/store`, and the reply of `PATCH /v1/store/status`. */
export interface StoreProfile {
  id: string;
  name: string;
  phone: string | null;
  logoUrl: string | null;
  categoryName: string;
  hubName: string;
  status: StoreStatus;
  liveStatus: LiveStatus;
  nextOpenAt: string | null;
  hours: StoreHours[];
  isActive: boolean;
  autoAccept: boolean;
  canEditCatalog: boolean;
  minOrderPiastres: number;
  discountBp: number;
  commissionBp: number;
}
