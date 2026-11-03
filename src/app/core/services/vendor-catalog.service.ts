import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CatalogSection {
  id: string;
  name: string;
  sortOrder: number;
  parentId?: string | null;
}

export interface SectionWritePayload {
  name: string;
  sortOrder?: number;
  parentId?: string | null;
}

const SECTIONS_URL = `${environment.apiUrl}/v1/store/sections`;

@Injectable({ providedIn: 'root' })
export class VendorCatalogService {
  private readonly http = inject(HttpClient);

  getSections(): Observable<CatalogSection[]> {
    return this.http.get<unknown>(SECTIONS_URL).pipe(map(parseSections));
  }

  createSection(payload: SectionWritePayload): Observable<CatalogSection> {
    const body = normalizeSectionPayload(payload);
    return this.http.post<unknown>(SECTIONS_URL, body).pipe(
      map((row) => toSection(row, 0) ?? fallbackSection(body)),
    );
  }

  updateSection(id: string, payload: SectionWritePayload): Observable<CatalogSection> {
    const sectionId = id.trim();
    const body = normalizeSectionPayload(payload);
    return this.http.patch<unknown>(`${SECTIONS_URL}/${sectionId}`, body).pipe(
      map((row) => toSection(row, 0) ?? { ...fallbackSection(body), id: sectionId }),
    );
  }

  deleteSection(id: string): Observable<void> {
    const sectionId = id.trim();
    return this.http.delete<void>(`${SECTIONS_URL}/${sectionId}`);
  }
}

function normalizeSectionPayload(payload: SectionWritePayload): SectionWritePayload {
  return {
    name: payload.name.trim(),
    ...(payload.sortOrder !== undefined ? { sortOrder: payload.sortOrder } : {}),
    ...(payload.parentId !== undefined ? { parentId: payload.parentId } : {}),
  };
}

function fallbackSection(payload: SectionWritePayload): CatalogSection {
  return {
    id: '',
    name: payload.name.trim(),
    sortOrder: payload.sortOrder ?? 0,
    parentId: payload.parentId ?? null,
  };
}

function parseSections(body: unknown): CatalogSection[] {
  return sortSections(
    (Array.isArray(body) ? body : [])
      .map((row, index) => toSection(row, index))
      .filter((section): section is CatalogSection => section !== null),
  );
}

function sortSections(sections: CatalogSection[]): CatalogSection[] {
  return sections.slice().sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'ar'));
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
