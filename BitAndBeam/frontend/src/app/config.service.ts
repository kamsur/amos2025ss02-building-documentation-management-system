import { Injectable } from '@angular/core';
import { environment } from '../environments/environment'; // adjust path if needed

@Injectable({
  providedIn: 'root',
})
export class ConfigService {
  get apiUrl(): string {
    return environment.apiUrl;
  }
}
