import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiClientFactory } from '../../services/api-client.factory';
import { DocumentsApi } from '../../../api';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { AiAssistantComponent } from '../ai-assistant/ai-assistant.component';

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

  constructor(private apiFactory: ApiClientFactory) {}

  ngOnInit(): void {
    // You could fetch the buildings list here if needed
    // For now, we're using null which means no specific building is selected
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
