import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, delay, map, of, tap } from 'rxjs';
import { API_BASE_URL, USE_MOCK_API } from '../api-config';
import { BusinessHoursDay, StoreOperationalStatus, StoreProfile } from '../models/store.model';

const STORE_URL = `${API_BASE_URL}/v1/vendor/store`;

@Injectable({ providedIn: 'root' })
export class StoreProfileService {
  private readonly http = inject(HttpClient);

  readonly profile = signal<StoreProfile>(seedProfile());
  readonly operationalStatus = signal<StoreOperationalStatus>('open');

  load(): Observable<StoreProfile> {
    if (USE_MOCK_API) {
      return of(this.profile()).pipe(delay(100));
    }
    return this.http.get<StoreProfile>(STORE_URL).pipe(
      tap((profile) => {
        this.profile.set(profile);
        this.operationalStatus.set(profile.operationalStatus);
      }),
    );
  }

  update(patch: Partial<StoreProfile>): Observable<StoreProfile> {
    if (USE_MOCK_API) {
      this.profile.update((current) => ({ ...current, ...patch }));
      return of(this.profile()).pipe(delay(200));
    }
    return this.http.patch<StoreProfile>(STORE_URL, patch).pipe(tap((profile) => this.profile.set(profile)));
  }

  setOperationalStatus(status: StoreOperationalStatus): Observable<StoreOperationalStatus> {
    this.operationalStatus.set(status);
    if (USE_MOCK_API) {
      this.profile.update((p) => ({ ...p, operationalStatus: status }));
      return of(status).pipe(delay(80));
    }
    return this.http
      .patch<{ operationalStatus: StoreOperationalStatus }>(`${STORE_URL}/status`, { operationalStatus: status })
      .pipe(
        tap((res) => this.operationalStatus.set(res.operationalStatus)),
        map((res) => res.operationalStatus),
      );
  }
}

function seedProfile(): StoreProfile {
  return {
    id: 'store-1',
    name: 'مخبز الربيع',
    defaultPreparationMinutes: 15,
    operationalStatus: 'open',
    phone: '+20 100 000 0000',
    address: 'التجمع الخامس، القاهرة',
    businessHours: defaultHours(),
  };
}

function defaultHours(): BusinessHoursDay[] {
  const days = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
  return days.map((day) => ({
    day,
    open: '09:00',
    close: '23:00',
    closed: day === 'الجمعة',
  }));
}
