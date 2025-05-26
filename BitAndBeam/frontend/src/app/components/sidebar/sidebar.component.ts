import { Component, EventEmitter,Output  } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { FormsModule } from '@angular/forms';
import { BuildingService } from '../../services/building.service';
import { DocumentItem } from '../../services/building.service';

@Component({
  standalone: true,
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css'],
  imports: [CommonModule,FormsModule]
})
export class SidebarComponent {
  isExplorerCollapsed = false;

  constructor(
    public authService: AuthService,
    private router: Router,
    public buildingService: BuildingService

  ) {}

  toggleExplorer() {
    this.isExplorerCollapsed = !this.isExplorerCollapsed;
    console.log('Explorer collapsed:', this.isExplorerCollapsed);
  }

  addBuilding() {
    const name = prompt('Enter building name:');
    if (name) {
      this.buildingService.addBuilding(name);
    }
  }

  deleteBuilding(index: number) {
    this.buildingService.deleteBuilding(index);
  }

  viewDocument(doc: DocumentItem): void {
    if (!doc.id) {
      console.error('Document has no ID');
      return;
    }

    this.router.navigate(['/documents', doc.id]);
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/']); // redirect to home/landing
  }





}
