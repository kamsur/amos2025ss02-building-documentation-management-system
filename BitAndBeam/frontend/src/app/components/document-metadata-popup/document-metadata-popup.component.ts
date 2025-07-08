import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BuildingService, Building, DocumentResponse } from '../../services/building.service';
import { CategoryService, Category } from '../../services/category.service';
import { DocumentsApi, DocumentMetadataPatchRequest } from '../../../api/api';
import { ApiClientFactory } from '../../services/api-client.factory';
import { SidebarRefreshService }  from '../../services/sidebar-refresh.service';

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
  @Input() documentData: DocumentResponse | null = null;
  @Input() suggestedCategoryName: string | null = null;
  @Input() suggestedBuildingId: number | null = null;
  @Output() closePopup = new EventEmitter<void>();
  @Output() saveMetadata = new EventEmitter<{categoryName: string | null, buildingId: number | null}>();

  // Initialize as empty arrays to prevent undefined errors
  buildings: Building[] = [];
  categories: Category[] = [];
  selectedBuildingId: number | null = null;
  selectedCategoryName: string | null = null;
  isOtherCategory: boolean = false;
  otherCategoryName: string = '';
  readonly OTHER_CATEGORY_OPTION = 'other';

  // Notification properties
  showNotification: boolean = false;
  notificationMessage: string = '';
  notificationType: 'success' | 'error' = 'success';
  notificationTimeout: any = null;

  // Loading state for key information extraction
  isExtractingKeyInfo: boolean = false;

  constructor(
    private buildingService: BuildingService,
    private categoryService: CategoryService,
    private apiFactory: ApiClientFactory,
    private sidebarRefreshService: SidebarRefreshService
  ) {}

  ngOnInit(): void {
    console.log('🔄 DocumentMetadataPopup ngOnInit called');
    this.loadCategories();
    this.loadBuildings();
  }

  setInitialValues(): void {
    console.log('🔍 Setting initial values:');
    console.log('📋 DocumentData:', this.documentData);
    console.log('🏷️ SuggestedCategoryName:', this.suggestedCategoryName);
    console.log('🏢 SuggestedBuildingId:', this.suggestedBuildingId);
    console.log('📂 Available categories:', this.categories.length);

    // Priority 1: Use suggested values from upload response (for new uploads)
    if (this.suggestedCategoryName !== null && this.suggestedCategoryName !== undefined) {
      this.selectedCategoryName = this.suggestedCategoryName;
      console.log('✅ Using suggested category:', this.suggestedCategoryName);
    } 
    // Priority 2: Use existing document data (for editing existing documents)
    else if (this.documentData?.categoryName !== null && this.documentData?.categoryName !== undefined) {
      this.selectedCategoryName = this.documentData.categoryName;
      console.log('✅ Using existing document category:', this.documentData.categoryName);
    } 
    // Priority 3: No category selected
    else {
      this.selectedCategoryName = null;
      console.log('⚪ No category pre-selected');
    }

    // Similar logic for building
    if (this.suggestedBuildingId !== null && this.suggestedBuildingId !== undefined) {
      this.selectedBuildingId = this.suggestedBuildingId;
      console.log('✅ Using suggested building ID:', this.suggestedBuildingId);
    } 
    else if (this.documentData?.buildingId !== null && this.documentData?.buildingId !== undefined) {
      this.selectedBuildingId = this.documentData.buildingId;
      console.log('✅ Using existing document building ID:', this.documentData.buildingId);
    } 
    else {
      this.selectedBuildingId = null;
      console.log('⚪ No building pre-selected');
    }
  }

  loadBuildings(): void {
    console.log('🏢 Loading buildings...');
    this.buildingService.getBuildings().subscribe({
      next: (data) => {
        console.log('✅ BuildingService response:', data);
        // Ensure buildings is always an array
        this.buildings = Array.isArray(data) ? data : [];
        console.log('✅ Loaded buildings:', this.buildings.length, this.buildings);
      },
      error: (err) => {
        console.error('❌ Failed to fetch buildings', err);
        this.buildings = [];
      }
    });
  }

  loadCategories(): void {
    console.log('🏷️ Loading categories...');
    
    // Primary method: Try using DocumentsApi directly
    const documentsApi = this.apiFactory.create(DocumentsApi);
    documentsApi.apiDocumentsCategoriesGet()
      .then((response: any) => {
        console.log('✅ Raw categories response:', response);
        
        // Safely extract categories from response
        this.categories = this.extractCategoriesFromResponse(response);
        
        console.log('✅ Processed categories:', this.categories.length, this.categories);
        
        // Set initial values after categories are loaded
        this.setInitialValues();
      })
      .catch((err: any) => {
        console.error('❌ DocumentsApi categories failed:', err);
        
        // Fallback: Try CategoryService
        console.log('🔄 Trying CategoryService as fallback...');
        this.categoryService.getCategories().subscribe({
          next: (data) => {
            console.log('✅ CategoryService response:', data);
            // Ensure categories is always an array
            this.categories = Array.isArray(data) ? data : [];
            this.setInitialValues();
          },
          error: (fallbackErr) => {
            console.error('❌ CategoryService also failed:', fallbackErr);
            
            // Last resort: Hardcode categories for testing
            console.log('🔧 Using hardcoded categories as last resort');
            this.categories = [
              { name: 'Energieausweis', description: 'Energy certificate documents' },
              { name: 'Antrag auf Baugenehmigung', description: 'Building permit applications' },
              { name: 'Bebauungsplan', description: 'Development plans' }
            ];
            this.setInitialValues();
          }
        });
      });
  }

  /**
   * Safely extract categories array from various response formats
   */
  private extractCategoriesFromResponse(response: any): Category[] {
    if (!response) return [];

    let categoriesData = response.data || response;
    
    // If the response has a categories property, use it
    if (categoriesData.categories && Array.isArray(categoriesData.categories)) {
      return categoriesData.categories;
    }
    
    // If the data itself is an array, use it
    if (Array.isArray(categoriesData)) {
      return categoriesData;
    }
    
    // If it's an object with numeric keys (like {0: {...}, 1: {...}}), convert to array
    if (categoriesData && typeof categoriesData === 'object' && !Array.isArray(categoriesData)) {
      const keys = Object.keys(categoriesData);
      const isNumericKeys = keys.every(key => !isNaN(Number(key)));
      if (isNumericKeys) {
        return keys.map(key => categoriesData[key]).filter(item => item && typeof item === 'object');
      }
    }
    
    // Default to empty array
    return [];
  }

  onCategoryChange(value: string | null): void {
    console.log('🔄 Category changed to:', value);
    if (value === this.OTHER_CATEGORY_OPTION) {
      this.isOtherCategory = true;
      this.selectedCategoryName = null;
    } else {
      this.isOtherCategory = false;
      this.selectedCategoryName = value;
    }
  }

  createNewCategory(): void {
    if (!this.otherCategoryName.trim()) {
      this.showErrorNotification('Please enter a category name');
      return;
    }

    this.categoryService.createCategory({ name: this.otherCategoryName }).subscribe({
      next: (newCategory: Category) => {
        this.loadCategories(); // reloads the list, avoids duplicates
        this.selectedCategoryName = newCategory.name;
        this.isOtherCategory = false;
        this.otherCategoryName = '';
        this.showSuccessNotification('New category created successfully');
      },
      error: (err: Error) => {
        console.error('Failed to create category', err);
        this.showErrorNotification('Failed to create category');
      }
    });
  }

  onClose(): void {
    this.clearNotificationTimeout();
    this.closePopup.emit();
  }

  onSave(): void {
    if (!this.documentId) {
      this.showErrorNotification('No document ID available');
      return;
    }

    // Determine categoryName based on selection
    const categoryName: string | null = this.isOtherCategory ? this.otherCategoryName : this.selectedCategoryName;

    console.log('💾 Saving with category:', categoryName, 'and building:', this.selectedBuildingId);

    // First update the document metadata
    this.updateDocumentMetadata(this.documentId!, categoryName, this.selectedBuildingId);
  }

  private updateDocumentMetadata(documentId: number, categoryName: string | null, buildingId: number | null): void {
    const patchRequest: DocumentMetadataPatchRequest = {
      categoryName: categoryName,
      buildingId: buildingId
    };

    console.log('🔄 Sending PATCH request:', patchRequest);

    const documentsApi = this.apiFactory.create(DocumentsApi);

    documentsApi.apiDocumentsIdPatch(documentId, patchRequest).then(response => {
      console.log('✅ Document metadata updated:', response.data);
      
      // If a category was selected, trigger key information extraction
      if (categoryName && categoryName.trim()) {
        this.extractKeyInformation(documentId, categoryName);
      } else {
        // No category selected, just close the popup
        this.completeSave(categoryName, buildingId);
      }
    }).catch(error => {
      console.error('❌ Failed to update document metadata', error);
      this.showErrorNotification('Failed to update document metadata');
    });
  }

  private extractKeyInformation(documentId: number, categoryName: string): void {
    console.log('🔍 Extracting key information for category:', categoryName);
    this.isExtractingKeyInfo = true;
    
    // Show loading notification
    this.showSuccessNotification('Extracting key information...');

    const documentsApi = this.apiFactory.create(DocumentsApi);
    
    // Try to use the OpenAPI client method if it exists
    const extractMethod = (documentsApi as any).apiDocumentsIdExtractKeyInformationPost 
                       || (documentsApi as any).apiDocumentsDocumentIdExtractKeyInformationPost
                       || (documentsApi as any).extractKeyInformation;

    if (extractMethod && typeof extractMethod === 'function') {
      console.log('✅ Using OpenAPI client method for key extraction');
      
      extractMethod.call(documentsApi, documentId, { categoryName: categoryName })
        .then((response: any) => {
          console.log('✅ Key information extracted via OpenAPI:', response.data);
          this.isExtractingKeyInfo = false;
          this.showSuccessNotification('Key information extracted successfully!');
          
          // Wait a bit to show success message, then complete save
          setTimeout(() => {
            this.completeSave(categoryName, this.selectedBuildingId);
          }, 1000);
        })
        .catch((error: any) => {
          console.error('❌ OpenAPI key extraction failed:', error);
          this.handleKeyExtractionError(error, categoryName);
        });
    } else {
      console.log('⚠️ OpenAPI method not found, using manual HTTP call');
      
      // Fallback to manual HTTP call with proper authentication
      import('axios').then(axios => {
        const authConfig = this.getAuthenticatedAxiosConfig();
        
        axios.default.post(`/api/Documents/${documentId}/extract-key-information`, {
          categoryName: categoryName
        }, authConfig)
        .then((response: any) => {
          console.log('✅ Key information extracted via manual call:', response.data);
          this.isExtractingKeyInfo = false;
          this.showSuccessNotification('Key information extracted successfully!');
          
          // Wait a bit to show success message, then complete save
          setTimeout(() => {
            this.completeSave(categoryName, this.selectedBuildingId);
          }, 1000);
        })
        .catch((error: any) => {
          console.error('❌ Manual key extraction failed:', error);
          this.handleKeyExtractionError(error, categoryName);
        });
      }).catch(() => {
        // Fallback if axios import fails - just complete the save
        console.log('⚠️ Key information extraction skipped - Axios not available');
        this.isExtractingKeyInfo = false;
        this.showSuccessNotification('Document saved successfully (key extraction skipped)');
        setTimeout(() => {
          this.completeSave(categoryName, this.selectedBuildingId);
        }, 1000);
      });
    }
  }

  private getAuthenticatedAxiosConfig(): any {
    try {
      const documentsApi = this.apiFactory.create(DocumentsApi);
      const apiInstance = documentsApi as any;
      
      const config: any = {
        baseURL: window.location.origin.replace(':4200', ':5001').replace(':8080', ':5001'),
        headers: {}
      };

      // Try to extract auth headers from the existing API client
      if (apiInstance.configuration) {
        const authConfig = apiInstance.configuration;
        if (authConfig.apiKey) {
          config.headers['Authorization'] = `Bearer ${authConfig.apiKey}`;
        }
        if (authConfig.accessToken) {
          config.headers['Authorization'] = `Bearer ${authConfig.accessToken}`;
        }
      }

      // Try to get auth from the default axios instance if available
      if (apiInstance.defaults?.headers?.common?.Authorization) {
        config.headers['Authorization'] = apiInstance.defaults.headers.common.Authorization;
      }

      // Get CSRF token if available
      const csrfToken = this.getCsrfToken();
      if (csrfToken) {
        config.headers['X-CSRF-TOKEN'] = csrfToken;
      }

      console.log('🔐 Auth config prepared:', { ...config, headers: { ...config.headers, Authorization: config.headers.Authorization ? '[HIDDEN]' : undefined } });
      
      return config;
    } catch (error) {
      console.error('❌ Failed to get auth config:', error);
      return {
        baseURL: window.location.origin.replace(':4200', ':5001').replace(':8080', ':5001')
      };
    }
  }

  private getCsrfToken(): string | null {
    // Try to get CSRF token from meta tag
    const csrfMeta = document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement;
    if (csrfMeta) {
      return csrfMeta.content;
    }
    
    // Try to get from cookie
    const csrfCookie = document.cookie.split(';')
      .find(cookie => cookie.trim().startsWith('XSRF-TOKEN='));
    if (csrfCookie) {
      return decodeURIComponent(csrfCookie.split('=')[1]);
    }
    
    return null;
  }

  private handleKeyExtractionError(error: any, categoryName: string): void {
    this.isExtractingKeyInfo = false;
    
    // Show more specific error message
    let errorMsg = 'Document saved but key information extraction failed';
    if (error.response?.status === 401) {
      errorMsg = 'Authentication failed for key information extraction';
    } else if (error.response?.status === 405) {
      errorMsg = 'Key information extraction endpoint not available yet';
    } else if (error.response?.status === 404) {
      errorMsg = 'Document not found for key information extraction';
    }
    
    this.showErrorNotification(errorMsg);
    
    // Still complete the save even if key extraction fails
    setTimeout(() => {
      this.completeSave(categoryName, this.selectedBuildingId);
    }, 1500);
  }

  private completeSave(categoryName: string | null, buildingId: number | null): void {
    // Emit metadata saved event
    this.saveMetadata.emit({ categoryName, buildingId });
    this.sidebarRefreshService.triggerRefresh();
    
    // Show final success notification and close
    this.showSuccessNotification('Document saved successfully');
    
    // Close popup after a short delay to show the success message
    setTimeout(() => {
      this.onClose();
    }, 1500);
  }

  /**
   * Show a success notification
   */
  private showSuccessNotification(message: string): void {
    this.notificationType = 'success';
    this.notificationMessage = message;
    this.showNotification = true;
    this.clearNotificationTimeout();
    this.notificationTimeout = setTimeout(() => {
      this.showNotification = false;
    }, 5000);
  }

  /**
   * Show an error notification
   */
  private showErrorNotification(message: string): void {
    this.notificationType = 'error';
    this.notificationMessage = message;
    this.showNotification = true;
    this.clearNotificationTimeout();
    this.notificationTimeout = setTimeout(() => {
      this.showNotification = false;
    }, 5000);
  }

  /**
   * TrackBy function for categories to improve performance
   */
  trackByCategory(index: number, category: Category): any {
    return category.name || index;
  }

  /**
   * Get building name by ID for display purposes
   */
  getBuildingName(buildingId: number | null): string {
    if (!buildingId) return 'Unknown Building';
    const building = this.buildings.find(b => b.id === buildingId);
    return building ? building.name : `Building #${buildingId}`;
  }

  /**
   * Clear any existing notification timeout
   */
  private clearNotificationTimeout(): void {
    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout);
      this.notificationTimeout = null;
    }
  }

  ngOnDestroy(): void {
    this.clearNotificationTimeout();
  }
}