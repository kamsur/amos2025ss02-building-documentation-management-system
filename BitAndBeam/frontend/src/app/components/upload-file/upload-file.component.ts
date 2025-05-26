import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfigService } from '../../config.service';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { FormsModule } from '@angular/forms';
import { BuildingService } from '../../services/building.service'

import { RouterModule , Router } from '@angular/router';

@Component({
  selector: 'app-upload-file',
  standalone: true,
  imports: [CommonModule, RouterModule, SidebarComponent,FormsModule],
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
    public buildingService: BuildingService


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
    this.uploadedFile = event.target.files[0];
  }


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
    if (!this.uploadedFile || this.selectedBuildingId == null) return;
    const formData = new FormData();
    formData.append('file', this.uploadedFile);
    formData.append('buildingId', this.selectedBuildingId.toString());

    fetch(`${this.config.apiUrl}/api/documents`, {
      method: 'POST',
      body: formData
    })
      .then(res => {
        if (!res.ok) throw new Error('Upload failed');
        this.uploadSuccess = true;
        this.uploadedFile = null;
      })
      .catch(err => {
        this.uploadError = err.message;
      })
      .finally(() => {
        this.uploading = false;
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
}



