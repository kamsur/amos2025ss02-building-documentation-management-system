import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BuildingService, Building } from '../../services/building.service';
import { CategoryService, Category } from '../../services/category.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-document-metadata-popup',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './document-metadata-popup.component.html',
  styleUrls: ['./document-metadata-popup.component.css']
})
export class DocumentMetadataPopupComponent implements OnInit {
  @Input() documentId: number | null = null;
  @Input() documentName: string = '';
  @Output() closePopup = new EventEmitter<void>();
  @Output() saveMetadata = new EventEmitter<{categoryId: number, buildingId: number}>();
  
  buildings: Building[] = [];
  categories: Category[] = [];
  selectedBuildingId: number | null = null;
  selectedCategoryId: number | null = null;
  showCreateBuilding: boolean = false;
  newBuildingName: string = '';
  sourceBuilding: number | null = null;
  
  constructor(
    private buildingService: BuildingService,
    private categoryService: CategoryService,
    private router: Router
  ) {}
  
  ngOnInit(): void {
    this.loadBuildings();
    this.loadCategories();
  }
  
  loadBuildings(): void {
    this.buildingService.getBuildings().subscribe({
      next: (data) => this.buildings = data,
      error: (err) => console.error('Failed to fetch buildings', err)
    });
  }
  
  loadCategories(): void {
    this.categoryService.getCategories().subscribe({
      next: (data) => this.categories = data,
      error: (err) => console.error('Failed to fetch categories', err)
    });
  }
  
  onClose(): void {
    this.closePopup.emit();
  }
  
  onSave(): void {
    if (this.selectedCategoryId) {
      this.saveMetadata.emit({
        categoryId: this.selectedCategoryId,
        buildingId: this.selectedBuildingId || 0
      });
    } else {
      alert('Please select a category');
    }
  }
  
  toggleCreateBuilding(): void {
    this.showCreateBuilding = !this.showCreateBuilding;
    if (!this.showCreateBuilding) {
      this.newBuildingName = '';
      this.sourceBuilding = null;
    }
  }
  
  createNewBuilding(): void {
    if (!this.newBuildingName.trim()) {
      alert('Please enter a building name');
      return;
    }
    
    // Get template from source building if selected
    if (this.sourceBuilding) {
      const sourceBuildingObj = this.buildings.find(b => b.id === Number(this.sourceBuilding));
      if (sourceBuildingObj) {
        // Clone building with new name
        this.buildingService.createBuilding({
          name: this.newBuildingName,
          // Add any additional properties needed for cloning
        }, Number(this.sourceBuilding)).subscribe({
          next: (newBuilding: Building) => {
            this.buildings.push(newBuilding);
            this.selectedBuildingId = newBuilding.id;
            this.toggleCreateBuilding();
          },
          error: (err: Error) => console.error('Failed to create building', err)
        });
      }
    } else {
      // Create new building without template
      this.buildingService.createBuilding({
        name: this.newBuildingName
      }).subscribe({
        next: (newBuilding: Building) => {
          this.buildings.push(newBuilding);
          this.selectedBuildingId = newBuilding.id;
          this.toggleCreateBuilding();
        },
        error: (err: Error) => console.error('Failed to create building', err)
      });
    }
  }
  
  goToBuildings(): void {
    this.onClose();
    this.router.navigate(['/buildings']);
  }
}
