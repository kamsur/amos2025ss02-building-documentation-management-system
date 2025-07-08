import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiClientFactory } from '../../services/api-client.factory';
import { DocumentsApi } from '../../../api';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { AiAssistantComponent } from '../ai-assistant/ai-assistant.component';
import { DocumentMetadataPopupComponent } from '../document-metadata-popup/document-metadata-popup.component';
import type { AxiosProgressEvent, AxiosResponse } from 'axios';
import { SidebarRefreshService } from '../../services/sidebar-refresh.service';

interface UploadResponse {
  documentId: number;
  fileUrl: string;
  hasMetadata: boolean;
  suggestedAddress: {
    street: string;
    house_number: string;
    zip_code: string;
    city: string;
  };
  suggestedBuildingId?: number;
  suggestedBuildingName?: string;
  suggestedCategoryName?: string;
  categoryName?: string;
  keyInformation: any;
}

@Component({
  selector: 'app-upload-file',
  templateUrl: './upload-file.component.html',
  styleUrls: ['./upload-file.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    SidebarComponent,
    AiAssistantComponent,
    DocumentMetadataPopupComponent
  ]
})
export class UploadFileComponent implements OnInit {
  // For building association with documents
  selectedBuildingId: number | null = null;
  uploadedDocumentId: number | null = null;
  uploadResponse: UploadResponse | null = null;

  // File upload properties
  uploading = false;
  uploadProgress: number = 0;
  uploadedFile: File | null = null;
  isDragOver = false;
  errorMessage = '';
  successMessage = '';

  // Metadata popup control
  showMetadataPopup = false;

  private documentsApi: DocumentsApi;

  constructor(private apiFactory: ApiClientFactory, private sidebarRefreshService: SidebarRefreshService) {
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
    if (this.uploading) return;
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  /**
   * Handle drag leave event for file upload
   */
  onDragLeave(event: DragEvent): void {
    if (this.uploading) return;
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  /**
   * Handle file drop event for file upload
   */
  onDrop(event: DragEvent): void {
    if (this.uploading) return;
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
    if (this.uploading) return;
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
    this.successMessage = '';

    console.log('📤 Starting file upload:', file.name);

    // Pass the file directly as the API expects a File object, not FormData
    this.documentsApi.apiDocumentsPost(file, {
      onUploadProgress: (progressEvent: AxiosProgressEvent) => {
        if (progressEvent.total) {
          this.uploadProgress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          console.log(`📊 Upload progress: ${this.uploadProgress}%`);
        }
      }
    }).then((response: AxiosResponse<any>) => {
      console.log('✅ Upload successful:', response.data);
      this.uploading = false;
      
      // Store the complete upload response
      this.uploadResponse = response.data as UploadResponse;
      this.uploadedDocumentId = response.data.documentId;
      
      // Show success message with AI suggestions info
      let suggestionInfo = '';
      if (response.data.suggestedCategoryName) {
        suggestionInfo += ` AI suggested category: ${response.data.suggestedCategoryName}.`;
      }
      if (response.data.suggestedBuildingName) {
        suggestionInfo += ` AI suggested building: ${response.data.suggestedBuildingName}.`;
      }
      
      this.successMessage = `File "${file.name}" uploaded successfully!${suggestionInfo}`;

      // Show metadata popup after successful upload with AI suggestions
      this.showMetadataPopup = true;

      // Emit the uploaded document ID to the parent component or handle locally
      // Add null check to prevent TypeScript error
      if (response.data.documentId) {
        this.onFileUploaded(response.data.documentId);
      }

      // Clear success message after a delay
      setTimeout(() => {
        this.successMessage = '';
      }, 8000); // Longer delay to show AI suggestions

    }).catch((error: any) => {
      console.error('❌ Upload failed:', error);
      this.uploading = false;
      this.uploadResponse = null;
      this.errorMessage = 'Upload failed: ' + (error.response?.data?.message || error.message || 'Unknown error');

      // Clear error message after a delay
      setTimeout(() => {
        this.errorMessage = '';
      }, 5000);
    });
  }

  /**
   * Update document ID after successful upload
   * This is called from within the uploadFile method after a successful upload
   */
  onFileUploaded(documentId: number | null): void {
    if (!documentId) {
      console.log('⚠️ No document ID provided to onFileUploaded');
      return;
    }
    
    console.log('📄 File uploaded with document ID:', documentId);
    this.uploadedDocumentId = documentId;
    // Trigger sidebar refresh after upload
    this.sidebarRefreshService.triggerRefresh();
    // Any additional actions needed after a file is uploaded
    // For example, you might want to update a list of documents here
  }

  /**
   * Close the metadata popup
   */
  closeMetadataPopup(): void {
    console.log('❌ Closing metadata popup');
    this.showMetadataPopup = false;
    this.uploadedDocumentId = null;
    this.uploadResponse = null;
  }

  /**
   * Save document metadata - this is now handled by the popup component
   * but we can still listen to the event for additional actions
   */
  saveDocumentMetadata(metadata: {categoryName: string | null, buildingId: number | null}): void {
    console.log('💾 Document metadata saved:', metadata);
    
    // The popup component now handles the actual API calls and key information extraction
    // This method is just for any additional actions you want to take after saving
    
    // Trigger sidebar refresh to show updated document
    this.sidebarRefreshService.triggerRefresh();
    
    // Close the popup (this will also be called by the popup component itself)
    this.closeMetadataPopup();
  }

  /**
   * Get the document name for the popup
   */
  get documentName(): string {
    return this.uploadedFile?.name || 'Unknown Document';
  }

  /**
   * Get suggested category name from upload response
   */
  get suggestedCategoryName(): string | null {
    return this.uploadResponse?.suggestedCategoryName || null;
  }

  /**
   * Get suggested building ID from upload response
   */
  get suggestedBuildingId(): number | null {
    return this.uploadResponse?.suggestedBuildingId || null;
  }
}