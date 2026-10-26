import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, delay, map, of } from 'rxjs';
import { API_BASE_URL, USE_MOCK_API } from '../api-config';

export interface Attribute {
  id: string;
  name: string;
  isGlobal: boolean;
  suggestedValues: string[];
}

const ATTRIBUTES_URL = `${API_BASE_URL}/v1/vendor/attributes`;

@Injectable({ providedIn: 'root' })
export class AttributeService {
  private readonly http = inject(HttpClient);
  private readonly mockAttributes = signal<Attribute[]>([
    { id: 'a1', name: 'الوزن', isGlobal: false, suggestedValues: ['1 كجم', '2 كجم', '500 جم'] },
    { id: 'a2', name: 'الحجم', isGlobal: false, suggestedValues: ['صغير', 'وسط', 'كبير'] },
  ]);

  getAttributes(): Observable<Attribute[]> {
    if (USE_MOCK_API) {
      return of(this.mockAttributes()).pipe(delay(80));
    }
    return this.http.get<unknown>(ATTRIBUTES_URL).pipe(
      map((body) => (Array.isArray(body) ? body.map(toAttribute).filter(isAttribute) : [])),
    );
  }

  createAttribute(payload: { name: string }): Observable<Attribute> {
    const name = payload.name.trim();
    if (USE_MOCK_API) {
      const created: Attribute = { id: `a${Date.now()}`, name, isGlobal: false, suggestedValues: [] };
      this.mockAttributes.update((list) => [...list, created]);
      return of(created).pipe(delay(80));
    }
    return this.http.post<unknown>(ATTRIBUTES_URL, { name }).pipe(
      map((body) => toAttribute(body) ?? { id: '', name, isGlobal: false, suggestedValues: [] }),
    );
  }
}

function isAttribute(value: Attribute | null): value is Attribute {
  return value !== null;
}

function toAttribute(value: unknown): Attribute | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const row = value as Record<string, unknown>;
  const name = String(row['name'] ?? '').trim();
  if (!name) {
    return null;
  }
  return {
    id: String(row['id'] ?? '').trim(),
    name,
    isGlobal: row['isGlobal'] === true,
    suggestedValues: Array.isArray(row['suggestedValues'])
      ? row['suggestedValues'].map((item) => String(item ?? '').trim()).filter(Boolean)
      : [],
  };
}
