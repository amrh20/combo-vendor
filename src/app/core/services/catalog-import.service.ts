import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CatalogImport,
  ImportPreview,
  ImportWriteBody,
  parseCatalogImport,
  parseImportPreview,
} from '../models/catalog-import.model';

const IMPORTS_URL = `${environment.apiUrl}/v1/store/imports`;
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

@Injectable({ providedIn: 'root' })
export class CatalogImportService {
  private readonly http = inject(HttpClient);

  /** `GET /v1/store/imports/template` */
  downloadTemplate(): Observable<Blob> {
    return this.http.get(`${IMPORTS_URL}/template`, { responseType: 'blob' });
  }

  /**
   * `POST /v1/store/imports?fileName=&sheet=`
   * The body is the raw file. The API rejects multipart `FormData`.
   */
  upload(file: File, sheet?: string): Observable<CatalogImport> {
    return this.http
      .post<unknown>(IMPORTS_URL, file, {
        headers: new HttpHeaders({ 'Content-Type': contentTypeFor(file) }),
        params: queryParams(file.name, sheet),
      })
      .pipe(
        map((body) => {
          const job = parseCatalogImport(body);
          if (!job.id) {
            throw new Error('استجابة الاستيراد لا تحتوي على معرّف.');
          }
          return job;
        }),
      );
  }

  /** `POST /v1/store/imports/{id}/preview` */
  preview(id: string, body: ImportWriteBody): Observable<ImportPreview> {
    return this.http
      .post<unknown>(`${IMPORTS_URL}/${id}/preview`, body)
      .pipe(map((response) => parseImportPreview(response)));
  }

  /** `POST /v1/store/imports/{id}/commit` */
  commit(id: string, body: ImportWriteBody): Observable<CatalogImport> {
    return this.http
      .post<unknown>(`${IMPORTS_URL}/${id}/commit`, body)
      .pipe(map((response) => parseCatalogImport(response)));
  }

  /** `GET /v1/store/imports/{id}` */
  get(id: string): Observable<CatalogImport> {
    return this.http.get<unknown>(`${IMPORTS_URL}/${id}`).pipe(map((body) => parseCatalogImport(body)));
  }

  /** `GET /v1/store/imports/{id}/errors.xlsx` */
  downloadErrors(id: string): Observable<Blob> {
    return this.http.get(`${IMPORTS_URL}/${id}/errors.xlsx`, { responseType: 'blob' });
  }
}

function queryParams(fileName: string, sheet?: string): Record<string, string> {
  const params: Record<string, string> = { fileName };
  const sheetName = sheet?.trim();
  if (sheetName) {
    params['sheet'] = sheetName;
  }
  return params;
}

function contentTypeFor(file: File): string {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv')) {
    return 'text/csv';
  }
  if (name.endsWith('.xlsx')) {
    return XLSX_MIME;
  }
  throw new Error('يُقبل ملف Excel ‏(.xlsx) أو CSV فقط.');
}
