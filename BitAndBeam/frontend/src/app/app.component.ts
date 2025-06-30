import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  template: `
    <style>
      :host {
        display: block;
        height: 100vh;
        width: 100vw;
        overflow-x: hidden;
        overflow-y: auto;
        position: relative;
      }

      /* Ensure proper component visibility */
      app-upload-file,
      app-ai-assistant {
        display: block;
      }
    </style>
    <router-outlet></router-outlet>
  `,
})
export class AppComponent {
  title = 'BitAndBeam';
}
