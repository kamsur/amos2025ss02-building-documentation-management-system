import { Component, EventEmitter, Output } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SessionService } from '../../services/session.service';
import { FormsModule } from '@angular/forms';
import { BuildingService, DocumentItem, Building } from '../../services/building.service';
import { SidebarRefreshService } from '../../services/sidebar-refresh.service';
import { ThemeService, ThemeMode } from '../../services/theme.service';
import { trigger, transition, style, animate, state } from '@angular/animations';

@Component({
  standalone: true,
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css'],
  imports: [CommonModule, FormsModule],
  animations: [
    trigger('dropdownAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(10px)' }),
        animate('200ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('150ms ease-in', style({ opacity: 0, transform: 'translateY(10px)' }))
      ])
    ])
  ]
})
export class SidebarComponent {
  isDarkMode = false;
  themeMode: ThemeMode = 'device';
  isExplorerCollapsed = false;
  profileMenuOpen = false;
  sidebarWidth = 260; // Default width
  isResizing = false;
  expandedBuildings: Set<number | null> = new Set();
  
  groupedDocuments: {
    buildingId: number | null;
    buildingName: string;
    documents: DocumentItem[];
    isExpanded?: boolean;
  }[] = [];
  
  // Store the initial width and mouse position
  private startX = 0;
  private startWidth = 0;


  constructor(
    public session: SessionService,
    private router: Router,
    public buildingService: BuildingService,
    private sidebarRefreshService: SidebarRefreshService,
    private themeService: ThemeService
  ) {}
  
  // Resizing methods
  startResizing(event: MouseEvent): void {
    this.isResizing = true;
    this.startX = event.clientX;
    this.startWidth = this.sidebarWidth;
    
    // Add event listeners
    document.addEventListener('mousemove', this.resize.bind(this));
    document.addEventListener('mouseup', this.stopResizing.bind(this));
    
    // Prevent text selection during resize
    document.body.style.userSelect = 'none';
  }
  
  resize(event: MouseEvent): void {
    if (!this.isResizing) return;
    
    // Calculate the new width
    const newWidth = this.startWidth + (event.clientX - this.startX);
    
    // Apply min and max constraints
    if (newWidth >= 200 && newWidth <= 400) {
      this.sidebarWidth = newWidth;
    }
  }
  
  stopResizing(): void {
    this.isResizing = false;
    document.removeEventListener('mousemove', this.resize.bind(this));
    document.removeEventListener('mouseup', this.stopResizing.bind(this));
    
    // Re-enable text selection
    document.body.style.userSelect = '';
    
    // Store the width in local storage for persistence
    localStorage.setItem('sidebarWidth', this.sidebarWidth.toString());
  }

  ngOnInit(): void {
    // Load saved sidebar width if available
    const savedWidth = localStorage.getItem('sidebarWidth');
    if (savedWidth) {
      this.sidebarWidth = parseInt(savedWidth, 10);
    }
    
    // Load expanded buildings state from localStorage
    try {
      const savedExpanded = localStorage.getItem('expandedBuildings');
      if (savedExpanded) {
        const expandedIds = JSON.parse(savedExpanded);
        this.expandedBuildings = new Set(expandedIds);
      }
    } catch (e) {
      console.error('Error loading expanded buildings state', e);
    }
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

  toggleProfileMenu() {
    this.profileMenuOpen = !this.profileMenuOpen;
  }

  openSettings() {
    // Placeholder for settings modal/page
    alert('Settings coming soon!');
  }

  logout() {
    this.session.logout();
    this.router.navigate(['/']);
  }




}
