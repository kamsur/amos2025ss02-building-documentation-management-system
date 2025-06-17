import { Injectable } from '@angular/core';
import { Configuration } from '../../api';
import { ConfigService } from '../config.service';
import { SessionService } from './session.service';

@Injectable({ providedIn: 'root' })
export class ApiClientFactory {
  constructor(
    private configService: ConfigService,
    private sessionService: SessionService
  ) {}

  create<T>(ApiType: new (config: Configuration) => T): T {
    const token = this.sessionService.getToken();
    const apiUrl = this.configService.apiUrl;

    console.log('🔧 Creating API client with:', { apiUrl, token });

    if (!apiUrl) throw new Error('❌ API URL is undefined!');
    const config = new Configuration({
      basePath: apiUrl,
      accessToken: token || ''
    });

    return new ApiType(config);
  }
}
