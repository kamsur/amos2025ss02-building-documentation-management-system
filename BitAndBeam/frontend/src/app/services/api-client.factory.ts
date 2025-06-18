import { Injectable } from '@angular/core';
import { Configuration } from '../../api';
import { ConfigService } from '../config.service';
import { SessionService } from './session.service';

@Injectable({ providedIn: 'root' })
export class ApiClientFactory {
  constructor(
    private configService: ConfigService,
    private session: SessionService // ✅ Inject SessionService
  ) {}

  create<T>(ApiType: new (config: Configuration) => T, token?: string): T {
    const apiUrl = this.configService.apiUrl;

    const resolvedToken = token ?? this.session.getToken();
    if (resolvedToken) {
      console.log('[ApiClientFactory] ✅ Using token:', resolvedToken);
    } else {
      console.warn('[ApiClientFactory] ⚠️ No token provided!');
    }

    const config = new Configuration({
      basePath: apiUrl,
      accessToken: resolvedToken ?? ''
    });

    return new ApiType(config);
  }
}
