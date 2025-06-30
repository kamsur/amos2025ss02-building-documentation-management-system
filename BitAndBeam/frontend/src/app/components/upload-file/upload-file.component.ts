import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiClientFactory } from '../../services/api-client.factory';
import { DocumentsApi } from '../../../api';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { AiAssistantComponent } from '../ai-assistant/ai-assistant.component';
import type { AxiosProgressEvent, AxiosResponse } from 'axios';

interface FileInfo {
  name: string;
  status: string;
  id?: number;
}

@Component({
  selector: 'app-upload-file',
  templateUrl: './upload-file.component.html',
  styleUrls: ['./upload-file.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    SidebarComponent,
    AiAssistantComponent
  ]
})
export class UploadFileComponent implements OnInit {
  // For building association with documents
  selectedBuildingId: number | null = null;
  uploadedDocumentId: number | null = null;
  
  // File upload properties
  uploading = false;
  uploadProgress: number = 0;
  uploadedFile: File | null = null;
  isDragOver = false;
  errorMessage = '';

  private documentsApi: DocumentsApi;

  constructor(private apiFactory: ApiClientFactory) {
    this.documentsApi = this.apiFactory.create<DocumentsApi>(DocumentsApi);
  }

  ngOnInit(): void {
    // You could fetch the buildings list here if needed
    // For now, we're using null which means no specific building is selected
  }

  /**
   * Handle drag over event for file upload
   */
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  /**
   * Handle drag leave event for file upload
   */
  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  /**
   * Handle file drop event for file upload
   */
  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
    
    if (event.dataTransfer?.files?.length) {
      const file = event.dataTransfer.files[0];
      this.uploadedFile = file;
      this.uploadFile(file);
    }
  }

  /**
   * Handle file selection from file input
   */
  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (!file) return;

    this.uploadedFile = file;
    this.uploadFile(file);
  }

  /**
   * Upload the selected file
   */
  uploadFile(file: File): void {
    if (!file) return;

    this.uploading = true;
    this.uploadProgress = 0;
    this.errorMessage = '';

    // Pass the file directly as the API expects a File object, not FormData
    this.documentsApi.apiDocumentsPost(file, {
      onUploadProgress: (progressEvent: AxiosProgressEvent) => {
        if (progressEvent.total) {
          this.uploadProgress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        }
      }
    }).then((response: AxiosResponse<any>) => {
      console.log('Upload successful', response.data);
      this.uploading = false;
      this.uploadedDocumentId = response.data.id || response.data.documentId;
      
      // Associate the document with a building if needed
      if (this.selectedBuildingId && this.uploadedDocumentId) {
        this.associateDocumentWithBuilding(this.uploadedDocumentId, this.selectedBuildingId);
      }
      
      // Emit the uploaded document ID to the parent component or handle locally
      this.onFileUploaded(this.uploadedDocumentId!);
      
    }).catch((error: any) => {
      console.error('Upload failed', error);
      this.uploading = false;
      this.errorMessage = 'Upload failed: ' + (error.response?.data?.message || error.message || 'Unknown error');
    });
  }

  /**
   * Associate the uploaded document with a building using the metadata PATCH endpoint
   */
  private associateDocumentWithBuilding(documentId: number, buildingId: number): void {
    const metadata = {
      buildingId: buildingId,
      categoryName: null // Keep the category as is or null if not set yet
    };
    
    this.documentsApi.apiDocumentsIdPatch(documentId, metadata)
      .then(() => {
        console.log(`Document ${documentId} associated with building ${buildingId}`);
      })
      .catch(error => {
        console.error('Failed to associate document with building:', error);
      });
  }

  /**
   * Handle the fileUploaded event from the AI Assistant component
   */
  onFileUploaded(documentId: number): void {
    console.log('File uploaded with document ID:', documentId);
    this.uploadedDocumentId = documentId;
    
    // Any additional actions needed after a file is uploaded
    // For example, you might want to update a list of documents here
  }
}
