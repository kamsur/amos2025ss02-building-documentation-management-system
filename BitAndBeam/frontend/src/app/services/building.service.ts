import { Injectable } from '@angular/core';
import { BehaviorSubject, switchMap, map, Observable, from } from 'rxjs';
import { AxiosResponse } from 'axios';
import {
  DocumentsApi,
  Document as ApiDocument,
  BuildingsApi,
  Building as ApiBuilding
} from '../../api';
import { ApiClientFactory } from './api-client.factory'; // ✅ NEW

export interface DocumentItem {
  id: number;
  name: string;
  url: string;
  metadata: { label: string; value: string }[];
}

export interface DocumentResponse {
  documentId: number;
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
  private documentsApi: DocumentsApi;
  private buildingsApi: BuildingsApi;
  private buildingsSubject = new BehaviorSubject<ApiBuilding[]>([]);
  buildings$ = this.buildingsSubject.asObservable();

  constructor(private apiFactory: ApiClientFactory) {
    this.documentsApi = this.apiFactory.create(DocumentsApi);
    this.buildingsApi = this.apiFactory.create(BuildingsApi);
  }

  // 🏢 Buildings
  getBuildings(): Observable<Building[]> {
    return from(
      this.buildingsApi.apiBuildingsGet().then(res =>
        res.data.map(apiB => ({
          id: apiB.buildingId!,
          name: apiB.name ?? '',
          documents: []
        }))
      )
    );
  }

  addBuilding(building: Partial<ApiBuilding>): Observable<Building> {
    return from(this.buildingsApi.apiBuildingsPost(building)).pipe(
      switchMap((res) => {
        const createdId = (res.data as unknown as { id: number }).id;

        return from(this.buildingsApi.apiBuildingsIdGet(createdId)).pipe(
          map((b) => {
            const fetchedBuilding = b.data as ApiBuilding;
            return {
              id: fetchedBuilding.buildingId!,
              name: fetchedBuilding.name ?? '',
              documents: []
            } as Building;
          })
        );
      })
    );
  }

  deleteBuilding(id: number): Observable<void> {
    return from(this.buildingsApi.apiBuildingsIdDelete(id).then(() => {}));
  }

  // 📄 Documents
  getDocumentById(id: number): Observable<ApiDocument> {
    return from(
      this.documentsApi.apiDocumentsIdGet(id)
        .then(res => (res as unknown as AxiosResponse<ApiDocument>).data)
    );
  }

  deleteDocument(id: number): Observable<void> {
    return from(this.documentsApi.apiDocumentsIdDelete(id).then(() => {}));
  }

  downloadDocument(id: number): void {
    const downloadUrl = `/api/Documents/${id}/download`; // Uses relative path
    window.open(downloadUrl, '_blank');
  }

  // File Selection
  private selectedFileSubject = new BehaviorSubject<DocumentItem | null>(null);
  selectedFile$ = this.selectedFileSubject.asObservable();

  setSelectedFile(file: DocumentItem): void {
    this.selectedFileSubject.next(file);
  }

  getSelectedFile(): DocumentItem | null {
    return this.selectedFileSubject.getValue();
  }
}
