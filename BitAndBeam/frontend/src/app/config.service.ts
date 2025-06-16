import { Injectable } from '@angular/core';

// Tell TypeScript we're using a global window variable
declare const window: any;

@Injectable({
  providedIn: 'root',
})
export class ConfigService {
  get apiUrl(): string {
    if (!window.__env?.API_URL) {
      throw new Error('API_URL is not defined in window.__env!');
    }
    else {
      // Log the API URL for debugging purposes
      console.log('Using API URL:', window.__env.API_URL);
    }
    return window.__env.API_URL;
  }
}
