import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BuildingService } from '../../services/building.service';
import { Building as ApiBuilding } from '../../../api';

@Component({
  selector: 'app-create-building',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-building.component.html',
  styleUrls: ['./create-building.component.css']
})
export class CreateBuildingComponent {
  // Hardcoded organizations for now
  organizations = [
    { id: 1, name: 'Organization Alpha' },
    { id: 2, name: 'Organization Beta' }
  ];

  // Initialize fields
  building: Partial<ApiBuilding> = {
    name: '',
    address: '',
    constructionYear: null,
    totalArea: null,
    floors: null,
    description: '',
    organizationId: undefined // Must be undefined, not null
  };

  successMessage = '';
  errorMessage = '';

  constructor(private buildingService: BuildingService, private router: Router) {}

  submitForm() {
    if (!this.building.name?.trim() || !this.building.address?.trim() || !this.building.organizationId) {
      this.errorMessage = 'Name, Address, and Organization are required.';
      return;
    }

    // 🟩 Backend requires empty arrays for these fields
    const building: Partial<ApiBuilding> = {
      ...this.building,
      buildingDocumentRelations: [],
      documents: []
    };

    this.buildingService.addBuilding(building).subscribe({
      next: () => {
        this.successMessage = 'Building created successfully!';
        this.errorMessage = '';
        setTimeout(() => this.router.navigate(['/upload']), 1500);
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = 'Failed to create building. Please try again.';
      }
    });
  }
}
