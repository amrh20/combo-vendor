import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, delay, map, of } from 'rxjs';
import { API_BASE_URL, USE_MOCK_API } from '../api-config';

export interface CatalogSection {
  id: string;
  name: string;
  sortOrder: number;
  parentId?: string | null;
}

const SECTIONS_URL = `${API_BASE_URL}/v1/vendor/sections`;

@Injectable({ providedIn: 'root' })
export class VendorCatalogService {
  private readonly http = inject(HttpClient);
  private readonly mockSections = signal<CatalogSection[]>([
    { id: 's1', name: 'ساندwiches', sortOrder: 1, parentId: null },
    { id: 's2', name: 'مخبوزات', sortOrder: 2, parentId: null },
    { id: 's3', name: 'مشروبات', sortOrder: 3, parentId: null },
  ]);

  getSections(): Observable<CatalogSection[]> {
    if (USE_MOCK_API) {
      return of(this.mockSections()).pipe(delay(80));
    }
    return this.http.get<unknown>(SECTIONS_URL).pipe(
      map((body) =>
        (Array.isArray(body) ? body : [])
          .map((row, index) => toSection(row, index))
          .filter((section): section is CatalogSection => section !== null)
          .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'ar')),
      ),
    );
  }
}

function toSection(value: unknown, index: number): CatalogSection | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const row = value as Record<string, unknown>;
  const name = String(row['name'] ?? '').trim();
  if (!name) {
    return null;
  }
  return {
    id: String(row['id'] ?? row['sectionId'] ?? `s${index}`).trim(),
    name,
    sortOrder: Number(row['sortOrder'] ?? index),
    parentId: row['parentId'] == null ? null : String(row['parentId']),
  };
}
