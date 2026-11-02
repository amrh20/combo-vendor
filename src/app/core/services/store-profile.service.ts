import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { API_BASE_URL } from '../api-config';
import { StoreProfile, StoreStatus } from '../models/store.model';

const STORE_URL = `${API_BASE_URL}/v1/store`;

@Injectable({ providedIn: 'root' })
export class StoreProfileService {
  private readonly http = inject(HttpClient);

  readonly profile = signal<StoreProfile>(emptyStoreProfile());

  /** `GET /v1/store` */
  load(): Observable<StoreProfile> {
    return this.http.get<StoreProfile>(STORE_URL).pipe(tap((profile) => this.profile.set(profile)));
  }

  /** `PATCH /v1/store/status` with `{ status }`. The reply is the shop after the change. */
  setStatus(status: StoreStatus): Observable<StoreProfile> {
    return this.http
      .patch<StoreProfile>(`${STORE_URL}/status`, { status })
      .pipe(tap((profile) => this.profile.set(profile)));
  }
}

function emptyStoreProfile(): StoreProfile {
  return {
    id: '',
    name: '',
    phone: null,
    logoUrl: null,
    categoryName: '',
    hubName: '',
    status: 'CLOSED',
    liveStatus: 'CLOSED',
    nextOpenAt: null,
    hours: [],
    isActive: false,
    autoAccept: false,
    canEditCatalog: false,
    minOrderPiastres: 0,
    discountBp: 0,
    commissionBp: 0,
  };
}
