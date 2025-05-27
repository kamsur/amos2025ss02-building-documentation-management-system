import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { ConfigService } from '../config.service';
import { of } from 'rxjs';

export interface DocumentItem {
  id: number;
  name: string;
  url: string;
  metadata: { label: string; value: string }[];
}

export interface DocumentResponse {
  documentId: number; // 👈 add this
  title: string;
  fileName: string;
  filePath?: string;
  fileSize: number;
  fileType: string;
  uploadDate: string;
}

export interface Building {
  id: number;
  name: string;
  documents?: DocumentItem[];
}

@Injectable({ providedIn: 'root' })
export class BuildingService {
  private buildingsSubject = new BehaviorSubject<Building[]>([]);
  buildings$ = this.buildingsSubject.asObservable();

  constructor(private http: HttpClient, private config: ConfigService) {}

  getBuildings(): Observable<Building[]> {
    return this.http.get<Building[]>(`${this.config.apiUrl}/api/Buildings`);
  }

  addBuilding(name: string): Observable<Building> {
    return this.http.post<Building>(`${this.config.apiUrl}/api/Buildings`, { name });
  }

  deleteBuilding(id: number): Observable<void> {
    return this.http.delete<void>(`${this.config.apiUrl}/api/Buildings/${id}`);
  }

  getDocumentById(id: number): Observable<DocumentResponse> {
    return this.http.get<DocumentResponse>(`${this.config.apiUrl}/api/documents/${id}`);
  }



  deleteDocument(id: number): Observable<void> {
    return this.http.delete<void>(`${this.config.apiUrl}/api/documents/${id}`);
  }

  downloadDocument(id: number): void {
    window.open(`${this.config.apiUrl}/api/documents/${id}/download`, '_blank');
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
