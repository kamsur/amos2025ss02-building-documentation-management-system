import { Component, EventEmitter, Output } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SessionService } from '../../services/session.service';
import { FormsModule } from '@angular/forms';
import { BuildingService, DocumentItem, Building } from '../../services/building.service';
import { SidebarRefreshService } from '../../services/sidebar-refresh.service';
import { ThemeService, ThemeMode } from '../../services/theme.service';

@Component({
  standalone: true,
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css'],
  imports: [CommonModule,FormsModule]
})
export class SidebarComponent {  
  isDarkMode = false;
  themeMode: ThemeMode = 'device';
  isExplorerCollapsed = false;
  groupedDocuments: {
    buildingId: number | null;
    buildingName: string;
    documents: DocumentItem[];
  }[] = [];


  constructor(
    public session: SessionService,
    private router: Router,
    public buildingService: BuildingService,
    private sidebarRefreshService: SidebarRefreshService,
    private themeService: ThemeService
  ) {}
  
  ngOnInit(): void {
    // Load documents
    this.buildingService.getGroupedDocuments().subscribe({
      next: (data) => this.groupedDocuments = data,
      error: (err) => console.error('Failed to load grouped documents', err)
    });

    // Subscribe to sidebar refresh
    this.sidebarRefreshService.refresh$.subscribe(() => {
      console.log('📣 Sidebar refresh triggered');
      this.buildingService.getGroupedDocuments().subscribe({
        next: (data) => this.groupedDocuments = data,
        error: (err) => console.error('Sidebar refresh failed', err)
      });
    });
    
    // Subscribe to theme changes
    this.isDarkMode = this.themeService.isDarkMode();
    this.themeService.darkMode$.subscribe(isDark => {
      this.isDarkMode = isDark;
    });
    // Subscribe to mode changes
    this.themeMode = this.themeService.getMode();
    this.themeService.mode$.subscribe(mode => {
      this.themeMode = mode;
    });
  }

  toggleExplorer() {
    this.isExplorerCollapsed = !this.isExplorerCollapsed;
    console.log('Explorer collapsed:', this.isExplorerCollapsed);
  }

  viewDocument(doc: DocumentItem): void {
    if (!doc.id) {
      console.error('Document has no ID');
      return;
    }
    this.router.navigate(['/documents', doc.id]);
  }

  addBuilding(): void {
    this.router.navigate(['/create-building']);
  }


  deleteBuilding(buildingId: number) {
    if (confirm('Are you sure you want to delete this building?')) {
      this.buildingService.deleteBuilding(buildingId).subscribe({
        next: () => {
          console.log('Building deleted');
          // Refresh data after deletion
          this.buildingService.getGroupedDocuments().subscribe({
            next: (data) => this.groupedDocuments = data,
            error: (err) => console.error('Failed to reload grouped documents', err)
          });
        },
        error: (err) => console.error('Failed to delete building', err)
      });
    }
  }
  
  onThemeModeChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value as ThemeMode;
    this.themeService.setMode(value);
  }

  logout() {
    this.session.logout();
    this.router.navigate(['/']);
  }




}
