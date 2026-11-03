import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface UploadedFile {
  url: string;
}

const UPLOADS_URL = `${environment.apiUrl}/v1/store/uploads`;

@Injectable({ providedIn: 'root' })
export class UploadService {
  private readonly http = inject(HttpClient);

  uploadImage(file: File): Observable<UploadedFile> {
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
