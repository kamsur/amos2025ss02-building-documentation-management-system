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
  isOtherCategory: boolean = false;
  otherCategoryName: string = '';
  readonly OTHER_CATEGORY_OPTION = 'other';
  
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
  
  onCategoryChange(value: string | null): void {
    if (value === this.OTHER_CATEGORY_OPTION) {
      this.isOtherCategory = true;
      this.selectedCategoryId = null;
    } else {
      this.isOtherCategory = false;
    }
  }
  
  createNewCategory(): void {
    if (!this.otherCategoryName.trim()) {
      alert('Please enter a category name');
      return;
    }
    
    this.categoryService.createCategory({ name: this.otherCategoryName }).subscribe({
      next: (newCategory: Category) => {
        this.categories.push(newCategory);
        this.selectedCategoryId = newCategory.id;
        this.isOtherCategory = false;
        this.otherCategoryName = '';
      },
      error: (err) => console.error('Failed to create category', err)
    });
  }
  
  onClose(): void {
    this.closePopup.emit();
  }
  
  onSave(): void {
    if (this.isOtherCategory && this.otherCategoryName.trim()) {
      // If using a custom category, create it first then save
      this.categoryService.createCategory({ name: this.otherCategoryName }).subscribe({
        next: (newCategory: Category) => {
          this.saveMetadata.emit({
            categoryId: newCategory.id,
            buildingId: this.selectedBuildingId || 0
          });
        },
        error: (err) => console.error('Failed to create category', err)
      });
    } else if (this.selectedCategoryId) {
      // Using an existing category
      this.saveMetadata.emit({
        categoryId: this.selectedCategoryId,
        buildingId: this.selectedBuildingId || 0
      });
    } else if (!this.isOtherCategory) {
      alert('Please select a category');
    } else {
      alert('Please enter a name for the new category');
    }
  }
  
  goToCreateBuilding(): void {
    // Store current state if needed
    localStorage.setItem('returnToDocumentMetadata', 'true');
    
    // Close the popup and navigate to building creation page
    this.onClose();
    this.router.navigate(['/buildings/create']);
  }
}
