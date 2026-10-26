import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, delay, of } from 'rxjs';
import { API_BASE_URL, USE_MOCK_API } from '../api-config';

export interface UploadedFile {
  url: string;
}

const UPLOADS_URL = `${API_BASE_URL}/v1/uploads`;

@Injectable({ providedIn: 'root' })
export class UploadService {
  private readonly http = inject(HttpClient);

  uploadImage(file: File): Observable<UploadedFile> {
    if (USE_MOCK_API) {
      const url = URL.createObjectURL(file);
      return of({ url }).pipe(delay(400));
    }

    const contentType = isSvgFile(file) ? 'image/svg+xml' : file.type;
    const body = file.type === contentType ? file : new Blob([file], { type: contentType });

    return this.http.post<UploadedFile>(UPLOADS_URL, body, {
      headers: new HttpHeaders({ 'Content-Type': contentType }),
    });
  }
}

function isSvgFile(file: File): boolean {
  return file.type === 'image/svg+xml' || file.type === 'image/svg' || /\.svg$/i.test(file.name);
}
