import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http'; // <-- add withInterceptors
import { routes } from './app.routes';
import { AuthInterceptor } from './services/auth.interceptor'; // make sure the path is correct

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([AuthInterceptor]) // <-- REGISTER INTERCEPTOR HERE
    )
  ],
};
