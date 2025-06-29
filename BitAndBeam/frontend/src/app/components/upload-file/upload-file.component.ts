import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfigService } from '../../config.service';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import type { AxiosResponse } from 'axios';
import { DocumentsApi, Building as ApiBuilding } from '../../../api';
import { BuildingService } from '../../services/building.service';
import { CategoryService } from '../../services/category.service';
import { MarkdownBoldPipe } from '../../pipes/markdown-bold.pipe';
import { DocumentMetadataPopupComponent } from '../document-metadata-popup/document-metadata-popup.component';
import { ApiClientFactory } from '../../services/api-client.factory';
import { AiAssistantComponent } from '../ai-assistant/ai-assistant.component';

@Component({
  selector: 'app-upload-file',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    SidebarComponent, 
    FormsModule, 
    HttpClientModule, 
    MarkdownBoldPipe, 
    DocumentMetadataPopupComponent,
    AiAssistantComponent
  ],
  templateUrl: './upload-file.component.html',
  styleUrls: ['./upload-file.component.css'],
})
export class UploadFileComponent implements OnInit {
  showSpinner = false;
  uploadProgress: number = 0;
  uploading = false;
  uploadSuccess = false;
  uploadError = '';
  uploadedFile: File | null = null;
  selectedBuildingId: number | null = null;
  buildings: any[] = [];

  // Metadata popup properties
  showMetadataPopup = false;
  uploadedDocumentId: number | null = null;

  private documentsApi: DocumentsApi;

  constructor(
    private apiFactory: ApiClientFactory, // ✅ centralized factory
    private config: ConfigService,
    private router: Router,
    public buildingService: BuildingService,
    private categoryService: CategoryService
  ) {
    this.documentsApi = this.apiFactory.createDocumentsApi();
  }

  ngOnInit() {
    this.buildingService.getBuildings().subscribe({
      next: (data) => this.buildings = data,
      error: (err) => console.error('Failed to fetch buildings', err)
    });
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    this.uploadedFile = file;
    this.uploadDocumentToServer(file);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer?.files?.length) {
      const file = event.dataTransfer.files[0];
      this.uploadedFile = file;
      this.uploadDocumentToServer(file);
    }
  }

  onDragOver(event: Event) {
    event.preventDefault();
  }

  uploadDocumentToServer(file: File): void {
    this.showSpinner = true;
    this.uploadProgress = 0;
    const onUploadProgress = (progressEvent: any) => {
      // AxiosProgressEvent: loaded & total may be undefined
      if (progressEvent && progressEvent.total) {
        this.uploadProgress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
      }
    };

    this.documentsApi.apiDocumentsPost(file, { onUploadProgress })
      .then((axiosResponse: AxiosResponse<any>) => {
        const documentId = axiosResponse.data?.documentId;

        if (!documentId) {
          this.uploadError = 'Upload succeeded but no document ID found in response body.';
          return;
        }

        this.uploadSuccess = true;
        this.uploadedDocumentId = documentId;
        this.showSpinner = false;
        // Show the metadata popup instead of navigating directly
        this.showMetadataPopup = true;
      })
      .catch(error => {
        this.uploading = false;
        this.uploadError = 'Upload failed: ' + error.message;
        this.showSpinner = false;
      });
  }

  extractDocumentIdFromLocation(location: string | undefined): number | null {
    if (!location) return null;
    const match = location.match(/\/(\d+)(\/)?$/);
    return match ? parseInt(match[1], 10) : null;
  }

  createBuildingAndUpload() {
    const name = prompt('New building name:');
    if (!name?.trim() || !this.uploadedFile) return;

    const building: Partial<ApiBuilding> = { name }; // Only the name for now

    this.buildingService.addBuilding(building).subscribe({
      next: (building) => {
        this.uploadDocumentToServer(this.uploadedFile!);
      },
      error: (err) => console.error('Failed to create building', err)
    });
  }

  closeMetadataPopup(): void {
    this.showMetadataPopup = false;

    // If user closes the popup without saving, navigate to the document view
    if (this.uploadedDocumentId) {
      this.router.navigate(['/documents', this.uploadedDocumentId]);
    }
  }
  
  saveDocumentMetadata(metadata: {categoryName: string | null, buildingId: number | null}): void {
    if (this.uploadedDocumentId) {
      this.categoryService.assignDocumentCategory(
        this.uploadedDocumentId, 
        metadata.categoryName,
        metadata.buildingId
      ).subscribe({
        next: () => {
          this.showMetadataPopup = false;
          this.refreshDocuments(); // Refresh the document/building list after update
        },
        error: (err) => {
          console.error('Failed to assign document metadata', err);
          this.showMetadataPopup = false;
          this.refreshDocuments();
        }
      });
    }
  }

  // Refresh the building and document list after update
  refreshDocuments(): void {
    // Reload buildings (which include documents)
    this.buildingService.getBuildings().subscribe({
      next: (data) => this.buildings = data,
      error: (err) => console.error('Failed to refresh buildings', err)
    });
    // Optionally, reset upload state
    this.uploadedFile = null;
    this.uploadSuccess = false;
    this.uploadError = '';
    this.uploadedDocumentId = null;
  }

}
