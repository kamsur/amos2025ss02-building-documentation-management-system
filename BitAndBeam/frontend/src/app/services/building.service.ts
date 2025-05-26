import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';


export interface DocumentItem {
  id?: number;
  name: string;
  file?: File;
  url: string;
  metadata?: { label: string; value: string }[];
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

  getBuildings(): Building[] {
    return this.buildingsSubject.getValue();
  }

  updateBuildings(buildings: Building[]): void {
    this.buildingsSubject.next(buildings);
  }

  addBuilding(name: string): void {
    const updated = [...this.getBuildings(), { name, documents: [] }];
    this.updateBuildings(updated);
  }

  addDocumentToBuilding(index: number, file: File): void {
    const url = URL.createObjectURL(file);
    const newDoc: DocumentItem = {
      name: file.name,
      file,
      url,
      metadata: [
        { label: 'Uploaded', value: new Date().toISOString() }
      ]
    };

    const buildings = this.getBuildings();
    buildings[index].documents.push(newDoc);
    this.updateBuildings([...buildings]);
  }

  deleteBuilding(index: number): void {
    const updated = this.getBuildings().filter((_, i) => i !== index);
    this.updateBuildings(updated);
  }

  getDocumentById(id: number): Observable<DocumentItem> {
    return this.http.get<any>(`/api/documents/${id}`);
  }

  deleteDocument(id: number): Observable<void> {
    return this.http.delete<void>(`/api/documents/${id}`);
  }

  downloadDocument(id: number): void {
    window.open(`/api/documents/${id}/download`, '_blank');
  }
  private selectedFileSubject = new BehaviorSubject<DocumentItem | null>(null);
  selectedFile$ = this.selectedFileSubject.asObservable();

  setSelectedFile(file: DocumentItem): void {
    this.selectedFileSubject.next(file);
  }

  getSelectedFile(): DocumentItem | null {
    return this.selectedFileSubject.getValue();
  }
}
