// app.config.ts
import { ApplicationConfig } from '@angular/core';
import {
  provideHttpClient,
  withInterceptorsFromDi
} from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideZoneChangeDetection } from '@angular/core';

import { routes } from './app.routes';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { AuthInterceptor } from './services/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),

    // ✅ Add HttpClient with support for interceptors
    provideHttpClient(withInterceptorsFromDi()),

    // ✅ Register the interceptor for DI
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    }
  ]
};
