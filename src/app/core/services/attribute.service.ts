import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Attribute {
  id: string;
  name: string;
  isGlobal: boolean;
  suggestedValues: string[];
}

export interface AttributeWritePayload {
  name: string;
  values?: string[];
}

const ATTRIBUTES_URL = `${environment.apiUrl}/v1/store/attributes`;

@Injectable({ providedIn: 'root' })
export class AttributeService {
  private readonly http = inject(HttpClient);

  getAttributes(): Observable<Attribute[]> {
    return this.http.get<unknown>(ATTRIBUTES_URL).pipe(
      map((body) => (Array.isArray(body) ? body.map(toAttribute).filter(isAttribute) : [])),
    );
  }

  createAttribute(payload: AttributeWritePayload): Observable<Attribute> {
    const name = payload.name.trim();
    const values = normalizeValues(payload.values);
    return this.http
      .post<unknown>(ATTRIBUTES_URL, {
        name,
        ...(values.length ? { values } : {}),
      })
      .pipe(map((body) => toAttribute(body) ?? { id: '', name, isGlobal: false, suggestedValues: values }));
  }
}

function normalizeValues(values: string[] | undefined): string[] {
  if (!values?.length) {
    return [];
  }
  return values.map((item) => String(item ?? '').trim()).filter(Boolean);
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
  const rawValues = row['suggestedValues'] ?? row['values'];
  return {
    id: String(row['id'] ?? '').trim(),
    name,
    isGlobal: row['isGlobal'] === true,
    suggestedValues: Array.isArray(rawValues)
      ? rawValues.map((item) => String(item ?? '').trim()).filter(Boolean)
      : [],
  };
}
