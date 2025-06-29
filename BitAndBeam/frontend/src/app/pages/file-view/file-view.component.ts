import { Component } from '@angular/core';
import { Router ,ActivatedRoute} from '@angular/router';
import { CommonModule } from '@angular/common';
import { PdfViewerModule } from 'ng2-pdf-viewer';
import { ConfigService } from '../../config.service';
import { SidebarComponent} from '../../components/sidebar/sidebar.component';
import { BuildingService, DocumentItem, DocumentResponse } from '../../services/building.service';
import { Configuration, DocumentsApi, Document as ApiDocument, DocumentMetadataPatchRequest } from '../../../api';
import { CategoryService, Category } from '../../services/category.service';
import { ApiClientFactory } from '../../services/api-client.factory';
import { SidebarRefreshService }  from '../../services/sidebar-refresh.service';
import { FormsModule } from '@angular/forms';
import { HttpClient , HttpHeaders} from '@angular/common/http';
import { SessionService } from '../../services/session.service'; //

@Component({
  standalone: true,
  selector: 'app-file-view',
  templateUrl: './file-view.component.html',
  styleUrls: ['./file-view.component.css'],
  imports: [CommonModule, PdfViewerModule, SidebarComponent, FormsModule]
})
export class FileViewComponent {

  selectedFile: DocumentItem | null = null;
  notFound = false;
  isPdf = false;
  isImage = false;
  buildings: any[] = [];
  categories: Category[] = [];
  selectedBuildingId: number | null = null;
  selectedCategoryId: number | null = null;
  loading = false;
  toastMessage = '';

  // ✅ New variables for key info
  keyInfo: any = null;
  loadingKeyInfo = false;
  metadataRaw: string = '';
  parsedMetadata: { label: string; value: string }[] = [];


  constructor(private config: ConfigService,private route: ActivatedRoute,private router: Router, private buildingService: BuildingService,  private categoryService: CategoryService,
  private apiFactory: ApiClientFactory , private sidebarRefreshService: SidebarRefreshService, private http: HttpClient,
              private session: SessionService) {}
  ngOnInit(): void {
    // Watch for route param changes
    this.route.paramMap.subscribe(paramMap => {
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

      this.buildingService.getBuildings().subscribe(b => this.buildings = b);
      this.categoryService.getCategories().subscribe(c => this.categories = c);

      this.buildingService.getDocumentById(id).subscribe({
        next: (doc: ApiDocument) => {
          const token = this.session.getToken();
          const previewUrl = `${this.config.apiUrl}/api/Documents/${doc.documentId}/preview`;

          const headers = new HttpHeaders({
            Authorization: `Bearer ${token}`
          });

          this.http.get(previewUrl, { headers, responseType: 'blob' }).subscribe(blob => {
            const objectUrl = URL.createObjectURL(blob);

            this.selectedFile = {
              id: doc.documentId!,
              name: doc.fileName ?? '',
              url: objectUrl,
              metadata: [
                { label: 'Uploaded', value: doc.uploadDate ?? '' },
                {
                  label: 'Size',
                  value: `${((doc.fileSize ?? 0) / 1024).toFixed(2)} KB`,
                },
                { label: 'Type', value: doc.fileType ?? 'unknown' },
              ]
            };

            this.metadataRaw = doc.metadata ?? '';
            this.selectedBuildingId = doc.buildingId ?? null;
            this.selectedCategoryId = null;

            const fileType = (doc.fileType ?? '').toLowerCase();
            this.isPdf = fileType === 'pdf';
            this.isImage = fileType === 'png' || fileType === 'jpg' || fileType === 'jpeg';
            
            // ✅ Fetch key info
            this.fetchKeyInfo(id);

          }, err => {
            console.error('❌ Failed to load document preview:', err);
            this.notFound = true;
          });
        },
        error: (err) => {
          console.error('❌ Failed to load document metadata:', err);
          this.notFound = true;
        }
      });
    });
  }

  // ✅ New method: fetch key information
  fetchKeyInfo(id: number) {
    this.loadingKeyInfo = true;
    const token = this.session.getToken();
    const url = `${this.config.apiUrl}/api/Documents/${id}`;
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    this.http.get<any>(url, { headers }).subscribe({
      next: (data) => {
        this.keyInfo = {
          hasMetadata: data.hasMetadata,
          suggestedAddress: data.suggestedAddress,
          rawMetadata: data.metadata,
        };
        this.loadingKeyInfo = false;
      },
      error: (err) => {
        console.error('❌ Failed to load key info:', err);
        this.loadingKeyInfo = false;
      }
    });
  }

  downloadFile(): void {
    if (this.selectedFile?.id) {
      this.buildingService.downloadDocument(this.selectedFile.id);
    }
  }

  deleteFile(): void {
    if (!this.selectedFile?.id) return;

    this.buildingService.deleteDocument(this.selectedFile.id).subscribe({
      next: () => this.router.navigate(['/upload']),
      error: (err) => console.error('Delete failed:', err)
    });
  }

  // ✅ New method: update building/category
  saveMetadataChanges(): void {
    if (!this.selectedFile?.id) return;

    this.loading = true;
    this.toastMessage = '';

    const patchRequest: DocumentMetadataPatchRequest = {
      buildingId: this.selectedBuildingId,
      categoryName: undefined
    };

    const documentsApi = this.apiFactory.create(DocumentsApi);
    documentsApi.apiDocumentsIdPatch(this.selectedFile.id, patchRequest)
      .then(() => {
        this.toastMessage = '✅ Metadata updated successfully.';
        this.sidebarRefreshService.triggerRefresh();
        setTimeout(() => this.toastMessage = '', 4000);
      })
      .catch(() => {
        this.toastMessage = '❌ Failed to update metadata.';
      })
      .finally(() => {
        this.loading = false;
      });
  }

}
