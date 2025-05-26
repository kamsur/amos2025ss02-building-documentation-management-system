import { Component } from '@angular/core';
import { Router ,ActivatedRoute} from '@angular/router';
import { CommonModule } from '@angular/common';
import { PdfViewerModule } from 'ng2-pdf-viewer';
import { SidebarComponent} from '../../components/sidebar/sidebar.component';
import { BuildingService, DocumentItem } from '../../services/building.service';


@Component({
  standalone: true,
  selector: 'app-file-view',
  templateUrl: './file-view.component.html',
  styleUrls: ['./file-view.component.css'],
  imports: [CommonModule, PdfViewerModule, SidebarComponent]
})
export class FileViewComponent {

  selectedFile: DocumentItem | null = null;
  notFound = false;

  constructor(private route: ActivatedRoute,private router: Router, private buildingService: BuildingService) {}
  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.buildingService.getDocumentById(+id).subscribe({
        next: (doc) => {
          this.selectedFile = {
            id: doc.id,
            name: doc.name,
            url: doc.url,
            metadata: doc.metadata
          };
        },
        error: () => {
          this.notFound = true;
        }
      });
    }
  }

  selectFileToView(file: { name: string; url: string }) {
    this.selectedFile = file;
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

}
