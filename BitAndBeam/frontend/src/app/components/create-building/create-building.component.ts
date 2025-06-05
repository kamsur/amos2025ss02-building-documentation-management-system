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
  building: Partial<ApiBuilding> = {
    name: '',
    address: '',
    constructionYear: null,
    totalArea: null,
    floors: null,
    description: ''
  };

  successMessage = '';
  errorMessage = '';

  constructor(private buildingService: BuildingService, private router: Router) {}

  submitForm() {
    if (!this.building.name?.trim() || !this.building.address?.trim()) {
      this.errorMessage = 'Name and Address are required.';
      return;
    }

    this.buildingService.addBuilding(this.building).subscribe({
      next: () => {
        this.successMessage = 'Building created successfully!';
        this.errorMessage = '';
        setTimeout(() => this.router.navigate(['/upload']), 1500); // Adjust as needed
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = 'Failed to create building. Please try again.';
      }
    });
  }
}
 