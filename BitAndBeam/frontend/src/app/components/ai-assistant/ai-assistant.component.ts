import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { MarkdownBoldPipe } from '../../pipes/markdown-bold.pipe';
import { environment } from '../../../environments/environment';
import { ThemeService } from '../../services/theme.service';
import { Subscription } from 'rxjs';
import { DocumentsApi } from '../../../api';
import { ApiClientFactory } from '../../services/api-client.factory';
import { DocumentMetadataPopupComponent } from '../document-metadata-popup/document-metadata-popup.component';
import type { AxiosProgressEvent, AxiosResponse } from 'axios';

interface FileInfo {
  name: string;
  status: string;
  id?: number;
}

interface ChatMessage {
  text: string;
  sender: 'user' | 'assistant';
  timestamp?: Date;
  isFileUpload?: boolean;
  fileInfo?: FileInfo;
}

@Component({
  selector: 'app-ai-assistant',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    HttpClientModule, 
    MarkdownBoldPipe,
    DocumentMetadataPopupComponent
  ],
  templateUrl: './ai-assistant.component.html',
  styleUrls: ['./ai-assistant.component.css']
})
export class AiAssistantComponent implements OnInit, OnDestroy {
  @Input() selectedBuildingId: number | null = null;
  @Output() fileUploaded: EventEmitter<number> = new EventEmitter<number>();
  
  messages: ChatMessage[] = [];
  userInput = '';
  errorMessage = '';
  showHistory = false;
  isProcessing = false;
  isDarkMode = false;
  isDragOver = false;
  
  // File upload properties
  uploading = false;
  uploadProgress: number = 0;
  uploadedFile: File | null = null;
  uploadedDocumentId: number | null = null;
  showMetadataPopup = false;
  
  private themeSubscription: Subscription | null = null;
  private documentsApi: DocumentsApi;

  constructor(
    private http: HttpClient,
    private themeService: ThemeService,
    private apiFactory: ApiClientFactory
  ) {
    this.documentsApi = this.apiFactory.create<DocumentsApi>(DocumentsApi);
  }

  ngOnInit(): void {
    // Subscribe to theme changes
    this.themeSubscription = this.themeService.darkMode$.subscribe(isDark => {
      this.isDarkMode = isDark;
    });
    
    // Initialize with current theme state
    this.isDarkMode = this.themeService.isDarkMode();
    
    // Load chat history from local storage if available
    const savedHistory = localStorage.getItem('chatHistory');
    if (savedHistory) {
      try {
        this.messages = JSON.parse(savedHistory);
      } catch (e) {
        console.error('Error loading chat history:', e);
      }
    }
  }
  
  ngOnDestroy(): void {
    // Clean up subscription
    if (this.themeSubscription) {
      this.themeSubscription.unsubscribe();
    }
  }

  toggleHistory(): void {
    this.showHistory = !this.showHistory;
  }

  sendMessage(): void {
    const userMessage = this.userInput.trim();
    if (!userMessage || this.isProcessing) {
      return;
    }

    // Add user message to chat
    this.messages.push({
      text: userMessage,
      sender: 'user',
      timestamp: new Date()
    });

    this.userInput = '';
    this.errorMessage = '';
    this.isProcessing = true;

    // Save history to local storage
    this.saveHistory();

    // Send to backend
    this.http.post<any>(`${environment.apiUrl}/api/chat`, { message: userMessage })
      .subscribe({
        next: (response) => {
          if (response && response.message) {
            this.messages.push({
              text: response.message,
              sender: 'assistant',
              timestamp: new Date()
            });
          } else {
            this.handleError('Received an empty response from the AI');
          }
          this.isProcessing = false;
          this.saveHistory();
        },
        error: (error) => {
          console.error('Error calling AI assistant:', error);
          this.handleError('Failed to get a response from the AI assistant');
          this.isProcessing = false;
        }
      });
  }

  // File handling methods
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

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

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (!file) return;

    this.uploadedFile = file;
    this.uploadFile(file);
  }

  uploadFile(file: File): void {
    if (!file) return;

    this.uploading = true;
    this.uploadProgress = 0;
    this.errorMessage = '';

    // Add file upload message to chat
    const uploadMessage: ChatMessage = {
      text: `Uploading ${file.name}...`,
      sender: 'user',
      timestamp: new Date(),
      isFileUpload: true,
      fileInfo: {
        name: file.name,
        status: 'Uploading...'
      }
    };
    
    this.messages.push(uploadMessage);
    this.saveHistory();

    // Pass the file directly as the API expects a File object, not FormData
    this.documentsApi.apiDocumentsPost(file, {
      onUploadProgress: (progressEvent: AxiosProgressEvent) => {
        if (progressEvent.total) {
          this.uploadProgress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          
          // Update the upload message with progress
          const index = this.messages.findIndex(m => m === uploadMessage);
          if (index !== -1) {
            this.messages[index].fileInfo!.status = `Uploading: ${this.uploadProgress}%`;
            this.saveHistory();
          }
        }
      }
    }).then((response: AxiosResponse<any>) => {
      console.log('Upload successful', response.data);
      this.uploading = false;
      this.uploadedDocumentId = response.data.id || response.data.documentId;
      
      // Update the file upload message
      const index = this.messages.findIndex(m => m === uploadMessage);
      if (index !== -1) {
        this.messages[index].text = `Uploaded ${file.name}`;
        this.messages[index].fileInfo!.status = 'Upload successful';
        this.messages[index].fileInfo!.id = this.uploadedDocumentId!==null?this.uploadedDocumentId:undefined;
        this.saveHistory();
      }
      
      // Associate the document with a building if needed
      if (this.selectedBuildingId && this.uploadedDocumentId) {
        this.associateDocumentWithBuilding(this.uploadedDocumentId, this.selectedBuildingId);
      }
      
      // Add AI response about the file
      this.messages.push({
        text: `I've received your file "${file.name}". Would you like me to analyze its contents or help you categorize it?`,
        sender: 'assistant',
        timestamp: new Date()
      });
      this.saveHistory();
      
      // Show metadata popup after short delay
      setTimeout(() => {
        this.showMetadataPopup = true;
      }, 500);
      
      // Emit the uploaded document ID
      if (this.uploadedDocumentId !== null) {
        this.fileUploaded.emit(this.uploadedDocumentId);
      }
      
    }).catch((error: any) => {
      console.error('Upload failed', error);
      this.uploading = false;
      
      // Update the file upload message
      const index = this.messages.findIndex(m => m === uploadMessage);
      if (index !== -1) {
        this.messages[index].text = `Failed to upload ${file.name}`;
        this.messages[index].fileInfo!.status = 'Upload failed';
        this.saveHistory();
      }
      
      this.handleError('Upload failed: ' + (error.response?.data?.message || error.message || 'Unknown error'));
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

  closeMetadataPopup(): void {
    this.showMetadataPopup = false;
    this.uploadedFile = null;
  }

  saveDocumentMetadata(metadata: any): void {
    console.log('Saving metadata:', metadata);
    this.showMetadataPopup = false;
    this.uploadedFile = null;
    
    // Add a message indicating metadata was saved
    this.messages.push({
      text: `Document metadata saved successfully.`,
      sender: 'assistant',
      timestamp: new Date()
    });
    this.saveHistory();
  }

  private handleError(message: string): void {
    this.errorMessage = message;
    setTimeout(() => {
      this.errorMessage = '';
    }, 5000);
  }

  private saveHistory(): void {
    // Keep only the last 50 messages to manage storage size
    const historyToSave = this.messages.slice(-50);
    localStorage.setItem('chatHistory', JSON.stringify(historyToSave));
  }
}
