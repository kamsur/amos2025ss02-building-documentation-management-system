import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfigService } from '../../config.service';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { FormsModule } from '@angular/forms';
import { BuildingService } from '../../services/building.service'

import { RouterModule , Router } from '@angular/router';

import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-upload-file',
  standalone: true,
  imports: [CommonModule, RouterModule, SidebarComponent,FormsModule, HttpClientModule],
  templateUrl: './upload-file.component.html',
  styleUrls: ['./upload-file.component.css'],
})
export class UploadFileComponent implements OnInit {
  uploading = false;
  uploadSuccess = false;
  uploadError = '';
  selectedBuildingId: number | null = null;
  buildings: any[] = [];

  constructor(
    private config: ConfigService,
    private router: Router,
    public buildingService: BuildingService,
    private http: HttpClient

) {}
  ngOnInit() {
    console.log('API URL from config service:', this.config.apiUrl);
    this.buildingService.getBuildings().subscribe({
      next: (data) => this.buildings = data,
      error: (err) => console.error('Failed to fetch buildings', err)
    });
  }
  uploadedFile: File | null = null; // Change to single file

  // Handle file selection
  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    this.uploadedFile = file;
    this.uploading = true;
    this.uploadSuccess = false;
    this.uploadError = '';

    const formData = new FormData();
    formData.append('file', file); // 👈 use `file` directly

    this.http.post(`${this.config.apiUrl}/api/documents`, formData).subscribe({
      next: (response: any) => {
        this.uploading = false;
        this.uploadSuccess = true;

        const documentId = response.documentId; // 👈 FIXED: match backend case exactly
        if (!documentId) {
          console.error('❌ No documentId returned from server:', response);
          this.uploadError = 'Upload succeeded, but no document ID returned.';
          return;
        }


        this.router.navigate(['/documents', documentId]);
      },
      error: (error: HttpErrorResponse) => {
        this.uploading = false;
        this.uploadError = 'Upload failed: ' + error.message;
      }
    });
  }

    // Simulate upload with delay (replace this with actual HTTP upload later)



  // Handle drag-and-drop file selection
  onDrop(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer?.files) {
      const file = event.dataTransfer.files[0]; // Only get the first file
      if (file) {
        this.uploadedFile = file;
      }
    }
  }

  // Handle drag over event (required for drop event to trigger)
  onDragOver(event: Event) {
    event.preventDefault();
  }

  uploadDocumentToBuilding() {
    if (!this.uploadedFile) return;

    const formData = new FormData();
    formData.append('file', this.uploadedFile); // Backend expects 'file'

    this.http.post(`${this.config.apiUrl}/api/documents`, formData).subscribe({
      next: (response: any) => {
        const documentId = response.documentId; // Make sure this matches the backend response key!
        this.router.navigate(['/documents', documentId]); // 🔥 Navigate right after upload
      },
      error: (error) => {
        this.uploading = false;
        this.uploadError = 'Upload failed: ' + error.message;
      }
    });
  }

  createBuildingAndUpload() {
    const name = prompt('New building name:');
    if (!name?.trim() || !this.uploadedFile) return;

    this.buildingService.addBuilding(name).subscribe({
      next: (building) => {
        this.selectedBuildingId = building.id;
        this.uploadDocumentToBuilding();
      },
      error: (err) => console.error('Failed to create building', err)
    });
  }
  uploadDummyForPreview() {
    if (!this.uploadedFile) return;

    // Simulate assigning a hardcoded document ID
    const dummyId = 1;

    // Navigate to the file view page to simulate preview
    this.router.navigate(['/documents', dummyId]);
  }


}



