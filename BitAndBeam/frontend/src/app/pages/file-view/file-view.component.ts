import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { PdfViewerModule } from 'ng2-pdf-viewer';
import { ConfigService } from '../../config.service';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { BuildingService, DocumentItem, DocumentResponse } from '../../services/building.service';
import { Configuration, DocumentsApi, Document as ApiDocument, DocumentMetadataPatchRequest } from '../../../api';
import { CategoryService, Category } from '../../services/category.service';
import { ApiClientFactory } from '../../services/api-client.factory';
import { SidebarRefreshService } from '../../services/sidebar-refresh.service';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { SessionService } from '../../services/session.service';
import { AiAssistantComponent } from '../../components/ai-assistant/ai-assistant.component';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  standalone: true,
  selector: 'app-file-view',
  templateUrl: './file-view.component.html',
  styleUrls: ['./file-view.component.css'],
  imports: [CommonModule, PdfViewerModule, SidebarComponent, FormsModule, AiAssistantComponent]
})
export class FileViewComponent implements OnInit, OnDestroy {

  selectedFile: DocumentItem | null = null;
  notFound = false;
  isPdf = false;
  isImage = false;
  buildings: any[] = [];
  categories: Category[] = []; // Always initialize as empty array
  selectedBuildingId: number | null = null;
  selectedCategoryName: string | null = null;
  loading = false;
  toastMessage = '';
  isMetadataPanelCollapsed = false;
  showToolbar = false;
  imageZoom = 1;
  pdfZoom = 1;

  // ✅ New variables for key info
  metadataRaw: string = '';
  parsedMetadata: { label: string; value: string }[] = [];
  keyInformation: { label: string; value: string | null }[] = [];
  loadingKeyInfo: boolean = false;
  keyInfo: any = null;
  hasChanges: boolean = false;
  // 🟡 Tracks if a field has been touched for validation feedback
  touchedFields: { [label: string]: boolean } = {};

  originalKeyInformation: { [key: string]: string } = {};
  originalCategoryName: string | null = null;
  originalBuildingId: number | null = null;


  // ✅ New variables for Analysis button
  originalCategoryName: string | null = null;
  isAnalyzing: boolean = false;
  analysisMessage: string = '';
  analysisSuccess: boolean = true;

  // Cleanup
  private destroy$ = new Subject<void>();
  private blobUrl: string | null = null;

  constructor(
    private config: ConfigService,
    private route: ActivatedRoute,
    private router: Router,
    private buildingService: BuildingService,
    private categoryService: CategoryService,
    private apiFactory: ApiClientFactory,
    private sidebarRefreshService: SidebarRefreshService,
    private http: HttpClient,
    private session: SessionService
  ) {
    // Initialize arrays to prevent undefined errors
    this.buildings = [];
    this.categories = [];
  }

  ngOnInit(): void {
    // Watch for route param changes
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(paramMap => {
      const idParam = paramMap.get('id');
      const id = Number(idParam);

      if (!idParam || isNaN(id)) {
        console.error('❌ Invalid document ID in route:', idParam);
        this.notFound = true;
        return;
      }

      this.notFound = false;
      this.selectedFile = null;
      this.isPdf = false;
      this.isImage = false;

      // Load buildings and categories first
      this.loadBuildingsAndCategories();
      this.loadDocument(id);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    
    // Clean up blob URL
    if (this.blobUrl) {
      URL.revokeObjectURL(this.blobUrl);
    }
  }

  /**
   * Load buildings and categories with proper error handling
   */
  private loadBuildingsAndCategories(): void {
    // Load buildings
    this.buildingService.getBuildings().pipe(takeUntil(this.destroy$)).subscribe({
      next: (buildings) => {
        this.buildings = Array.isArray(buildings) ? buildings : [];
        console.log('✅ Loaded buildings:', this.buildings.length);
      },
      error: (err) => {
        console.error('❌ Failed to load buildings:', err);
        this.buildings = [];
      }
    });

    // Load categories
    this.categoryService.getCategories().pipe(takeUntil(this.destroy$)).subscribe({
      next: (categories) => {
        this.categories = Array.isArray(categories) ? categories : [];
        console.log('✅ Loaded categories:', this.categories.length);
      },
      error: (err) => {
        console.error('❌ Failed to load categories:', err);
        this.categories = [];
      }
    });
  }

  loadDocument(id: number): void {
    this.buildingService.getDocumentById(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (doc: ApiDocument) => {
        this.metadataRaw = doc.metadata ?? '';
        if (doc.metadata) {
          try {
            const entries = doc.metadata
              .split(/[\r\n]+/)
              .map(line => {
                const separator = line.includes('=') ? '=' : line.includes(',') ? ',' : ':';
                const [key, ...rest] = line.split(separator).map(s => s.trim());
                const value = rest.join(separator);
                return [key, value];
              })
              .filter(arr => arr.length >= 2);

            const metadataObject: { [key: string]: string } = {};
            entries.forEach(([key, value]) => {
              metadataObject[key] = value;
            });

            this.parsedMetadata = [
              { label: 'Title', value: metadataObject['resourceName'] || 'N/A' },
              { label: 'Author', value: metadataObject['dc:creator'] || metadataObject['pdf:docinfo:creator'] || 'N/A' },
              { label: 'Created Date', value: metadataObject['dcterms:created']?.split('T')[0] || 'N/A' },
              { label: 'Modified Date', value: metadataObject['dcterms:modified']?.split('T')[0] || 'N/A' },
              { label: 'Page Count', value: metadataObject['pdf:ocrPageCount'] || metadataObject['xmpTPg:NPages'] || 'N/A' },
              { label: 'File Type', value: metadataObject['Content-Type'] || 'N/A' },
              { label: 'Category', value: doc.categoryName || 'N/A' },
            ];
          } catch (e) {
            console.error('❌ Failed to parse metadata', e);
            this.parsedMetadata = [];
          }
        }

        const token = this.session.getToken();
        const previewUrl = `${this.config.apiUrl}/api/Documents/${doc.documentId}/preview`;

        const headers = new HttpHeaders({
          Authorization: `Bearer ${token}`
        });

        this.http.get(previewUrl, { headers, responseType: 'blob' })
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (blob) => {
              // Clean up previous blob URL if exists
              if (this.blobUrl) {
                URL.revokeObjectURL(this.blobUrl);
              }
              
              this.blobUrl = URL.createObjectURL(blob);

              this.selectedFile = {
                id: doc.documentId!,
                name: doc.fileName ?? '',
                url: this.blobUrl,
                metadata: [
                  { label: 'Uploaded', value: doc.uploadDate ?? '' },
                  {
                    label: 'Size',
                    value: `${((doc.fileSize ?? 0) / 1024).toFixed(2)} KB`,
                  },
                  { label: 'Type', value: doc.fileType ?? 'unknown' },
                ]
              };
              
              this.selectedBuildingId = doc.buildingId ?? null;
              this.selectedCategoryName = doc.categoryName ?? null;
              this.originalCategoryName = doc.categoryName ?? null; // Store original category

              // ✅ FIXED: Add safe check before using array methods
              if (doc.categoryName && Array.isArray(this.categories) && !this.categories.some(c => c.name === doc.categoryName)) {
                this.categories.push({ name: doc.categoryName } as Category);
              }

              if (doc.keyInformation) {
                this.keyInformation = Object.entries(doc.keyInformation).map(([key, value]) => ({
                  label: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
                  value: value !== null ? String(value) : 'N/A'
                }));
              } else {
                this.keyInformation = [];
              }

              const fileType = (doc.fileType ?? '').toLowerCase();
              this.isPdf = fileType === 'pdf';
              this.isImage = fileType === 'png' || fileType === 'jpg' || fileType === 'jpeg';

              // ✅ Fetch key info
              this.fetchKeyInfo(id);
            },
            error: (err) => {
              console.error('❌ Failed to load document preview:', err);
              this.notFound = true;
            }
          });
      },
      error: (err) => {
        console.error('❌ Failed to load document metadata:', err);
        this.notFound = true;
      }
    });
  }

  // ✅ New method: fetch key information
  fetchKeyInfo(id: number): void {
    this.loadingKeyInfo = true;
    const token = this.session.getToken();
    const url = `${this.config.apiUrl}/api/Documents/${id}`;
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    this.http.get<any>(url, { headers })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.keyInfo = {
            hasMetadata: data.hasMetadata,
            suggestedAddress: data.suggestedAddress,
            rawMetadata: data.metadata,
          };
          
          // Safely fallback if address is missing
          if (!this.keyInfo.suggestedAddress) {
            this.keyInfo.suggestedAddress = {
              street: '',
              house_number: '',
              zip_code: '',
              city: ''
            };
          }
          
          // ✅ FIXED: Add safe checks for array operations
          if ((!data.keyInformation || Object.keys(data.keyInformation).length === 0) &&
              this.selectedCategoryName && Array.isArray(this.categories) && this.categories.length > 0) {
            const match = this.categories.find(c => c.name === this.selectedCategoryName);
            if (match && Array.isArray(match.fields)) {
              this.keyInformation = match.fields.map(f => ({
                label: f.name,
                value: ''
              }));
            }
          } else {
            this.keyInformation = Object.entries(data.keyInformation || {}).map(([key, value]) => ({
              label: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
              value: value !== null ? String(value) : 'N/A'
            }));
          }
          
          if (!this.keyInformation.length && this.selectedCategoryName) {
            this.onCategoryChange();
          }

          this.loadingKeyInfo = false;
        },
        error: (err) => {
          console.error('❌ Failed to load key info:', err);
          this.loadingKeyInfo = false;
        }
      });
  }

  downloadFile(): void {
    if (!this.selectedFile?.id) return;
    this.buildingService.downloadDocument(this.selectedFile.id, this.selectedFile.name);
  }

  deleteFile(): void {
    if (!this.selectedFile?.id) return;

    if (confirm('Are you sure you want to delete this document?')) {
      this.buildingService.deleteDocument(this.selectedFile.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.sidebarRefreshService.triggerRefresh();
            this.router.navigate(['/upload']);
          },
          error: (err) => {
            console.error('Delete failed:', err);
            this.toastMessage = '❌ Failed to delete document.';
            setTimeout(() => this.toastMessage = '', 4000);
          }
        });
    }
  }

  /**
 * Builds patch request and sends metadata updates to backend.
 * Regenerates view after successful save.
 */
  saveMetadataChanges(): void {
    if (!this.selectedFile?.id) return;

    this.loading = true;
    this.toastMessage = '';

    // ✅ FIXED: Add safe checks for array operations
    if ((!this.keyInformation || this.keyInformation.length === 0) &&
        this.selectedCategoryName && Array.isArray(this.categories) && this.categories.length > 0) {
      const match = this.categories.find(c => c.name === this.selectedCategoryName);
      if (match && Array.isArray(match.fields) && match.fields.length > 0) {
        this.keyInformation = match.fields.map(f => ({
          label: f.name,
          value: ''
        }));
      }
    }

    const patchRequest: DocumentMetadataPatchRequest & {
      keyInformation?: any;
    } = {
      buildingId: this.selectedBuildingId,
      categoryName: this.selectedCategoryName ?? undefined,
      keyInformation: Object.fromEntries(
        this.keyInformation.map(k => [k.label.toLowerCase().replace(/ /g, '_'), k.value])
      )
    };

    console.log('📦 Patch request payload:', patchRequest);
    const documentsApi = this.apiFactory.create(DocumentsApi);
    documentsApi.apiDocumentsIdPatch(this.selectedFile.id, patchRequest)
      .then(() => {
        this.toastMessage = '✅ Metadata updated successfully.';
        this.hasChanges = false;
        this.originalCategoryName = this.selectedCategoryName; // Update original category after save
        this.sidebarRefreshService.triggerRefresh();

        // ✅ After save, reload document to update UI
        this.loadDocument(this.selectedFile!.id);
        this.fetchKeyInfo(this.selectedFile!.id);

        setTimeout(() => this.toastMessage = '', 4000);
      })
      .catch((err) => {
        console.error('❌ Failed to update metadata:', err);
        this.toastMessage = '❌ Failed to update metadata.';
        setTimeout(() => this.toastMessage = '', 4000);
      })
      .finally(() => {
        this.loading = false;
      });
  }

  onCategoryChange(): void {
    // ✅ FIXED: Add safe check for array
    if (!Array.isArray(this.categories)) {
      console.warn('Categories is not an array');
      return;
    }
    
    const selected = this.categories.find(c => c.name === this.selectedCategoryName);
    if (selected && Array.isArray(selected.fields)) {
      this.keyInformation = selected.fields.map(field => ({
        label: field.name,
        value: ''
      }));
    }
    
    this.hasChanges = true;
    this.analysisMessage = ''; // Clear any previous analysis messages
  }

  /**
   * Check if the Analyze button should be enabled
   */
  get canAnalyze(): boolean {
    return !!(
      this.selectedCategoryName && 
      this.selectedCategoryName !== this.originalCategoryName &&
      !this.isAnalyzing
    );
  }

  /**
   * Get tooltip for the Analyze button
   */
  getAnalyzeButtonTooltip(): string {
    if (this.isAnalyzing) {
      return 'Analysis in progress...';
    }
    if (!this.selectedCategoryName) {
      return 'Please select a category first';
    }
    if (this.selectedCategoryName === this.originalCategoryName) {
      return 'Category has not changed';
    }
    return 'Re-analyze document with new category';
  }

  /**
   * Analyze document with new category
   */
  analyzeWithNewCategory(): void {
    if (!this.selectedFile?.id || !this.selectedCategoryName) return;

    this.isAnalyzing = true;
    this.analysisMessage = '';
    
    console.log('🔍 Starting AI analysis with category:', this.selectedCategoryName);

    const documentsApi = this.apiFactory.create(DocumentsApi);
    
    // Try to use the OpenAPI client method for key extraction
    const extractMethod = (documentsApi as any).apiDocumentsIdExtractKeyInformationPost 
                       || (documentsApi as any).apiDocumentsDocumentIdExtractKeyInformationPost
                       || (documentsApi as any).extractKeyInformation;

    if (extractMethod && typeof extractMethod === 'function') {
      console.log('✅ Using OpenAPI client method for key extraction');
      
      extractMethod.call(documentsApi, this.selectedFile.id, { categoryName: this.selectedCategoryName })
        .then((response: any) => {
          console.log('✅ Key information extracted:', response.data);
          this.isAnalyzing = false;
          this.analysisSuccess = true;
          this.analysisMessage = '✅ AI analysis completed successfully!';
          
          // Reload document to get new key information
          this.loadDocument(this.selectedFile!.id);
          this.fetchKeyInfo(this.selectedFile!.id);
          
          // Clear message after delay
          setTimeout(() => {
            this.analysisMessage = '';
          }, 5000);
        })
        .catch((error: any) => {
          console.error('❌ Key extraction failed:', error);
          this.handleAnalysisError(error);
        });
    } else {
      console.log('⚠️ OpenAPI method not found, using manual HTTP call');
      
      // Fallback to manual HTTP call
      const token = this.session.getToken();
      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      });

      this.http.post(
        `${this.config.apiUrl}/api/Documents/${this.selectedFile.id}/extract-key-information`,
        { categoryName: this.selectedCategoryName },
        { headers }
      ).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          console.log('✅ Key information extracted:', response);
          this.isAnalyzing = false;
          this.analysisSuccess = true;
          this.analysisMessage = '✅ AI analysis completed successfully!';
          
          // Reload document to get new key information
          this.loadDocument(this.selectedFile!.id);
          this.fetchKeyInfo(this.selectedFile!.id);
          
          // Clear message after delay
          setTimeout(() => {
            this.analysisMessage = '';
          }, 5000);
        },
        error: (error) => {
          console.error('❌ Key extraction failed:', error);
          this.handleAnalysisError(error);
        }
      });
    }
  }

  /**
   * Handle analysis errors
   */
  private handleAnalysisError(error: any): void {
    this.isAnalyzing = false;
    this.analysisSuccess = false;
    
    let errorMsg = 'AI analysis failed';
    if (error.response?.status === 401 || error.status === 401) {
      errorMsg = 'Authentication failed for AI analysis';
    } else if (error.response?.status === 405 || error.status === 405) {
      errorMsg = 'AI analysis endpoint not available';
    } else if (error.response?.status === 404 || error.status === 404) {
      errorMsg = 'Document not found for AI analysis';
    } else if (error.response?.data?.message || error.error?.message) {
      errorMsg = error.response?.data?.message || error.error?.message;
    }
    
    this.analysisMessage = `❌ ${errorMsg}`;
    
    // Clear error message after delay
    setTimeout(() => {
      this.analysisMessage = '';
    }, 5000);
  }

  toggleMetadataPanel(): void {
    this.isMetadataPanelCollapsed = !this.isMetadataPanelCollapsed;
  }

  zoomIn(): void {
    if (this.isImage) {
      this.imageZoom = Math.min(this.imageZoom + 0.2, 5);
    } else if (this.isPdf) {
      this.pdfZoom = Math.min(this.pdfZoom + 0.2, 5);
    }
  }

  zoomOut(): void {
    if (this.isImage) {
      this.imageZoom = Math.max(this.imageZoom - 0.2, 0.2);
    } else if (this.isPdf) {
      this.pdfZoom = Math.max(this.pdfZoom - 0.2, 0.2);
    }
  }

  resetZoom(): void {
    this.imageZoom = 1;
    this.pdfZoom = 1;
  }
}