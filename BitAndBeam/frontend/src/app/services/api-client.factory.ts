import { inject, Injectable } from '@angular/core';
import { Configuration } from '../../api';
import { ConfigService } from '../config.service';
import { SessionService } from './session.service';

@Injectable({ providedIn: 'root' })
export class ApiClientFactory {
  private configService = inject(ConfigService);
  private sessionService = inject(SessionService); // ✅ safely injected here

  create<T>(ApiType: new (config: Configuration) => T): T {
    const apiUrl = this.configService.apiUrl;
    const token = this.sessionService.getToken();

    const config = new Configuration({
      basePath: apiUrl,
      accessToken: token || ''
    });

    return new ApiType(config);
  }
}
