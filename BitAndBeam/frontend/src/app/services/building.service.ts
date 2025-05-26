import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';


export interface DocumentItem {
  id: number;
  name: string;
  url: string;
  metadata: { label: string; value: string }[];
}

export interface DocumentResponse {
  id: number;
  fileName: string;
  url?: string;
  fileSize: number;
  fileType: string;
  uploadDate: string;
}

export interface Building {
  name: string;
  documents: DocumentItem[];
}

@Injectable({ providedIn: 'root' })
export class BuildingService {
  private buildingsSubject = new BehaviorSubject<Building[]>([]);
  buildings$ = this.buildingsSubject.asObservable();

  constructor(private http: HttpClient) {}

  getDocumentById(id: number): Observable<DocumentResponse> {
    return this.http.get<DocumentResponse>(`/api/documents/${id}`);
  }

  deleteDocument(id: number): Observable<void> {
    return this.http.delete<void>(`/api/documents/${id}`);
  }

  downloadDocument(id: number): void {
    window.open(`/api/documents/${id}/download`, '_blank');
  }

  // --- Selected document state for UI (optional, used for state sharing) ---

  private selectedFileSubject = new BehaviorSubject<DocumentItem | null>(null);
  selectedFile$ = this.selectedFileSubject.asObservable();

  setSelectedFile(file: DocumentItem): void {
    this.selectedFileSubject.next(file);
  }

  getSelectedFile(): DocumentItem | null {
    return this.selectedFileSubject.getValue();
  }
}
