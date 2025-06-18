import { Injectable } from '@angular/core';
import { Configuration } from '../../api';
import { ConfigService } from '../config.service';

@Injectable({ providedIn: 'root' })
export class ApiClientFactory {
  constructor(private configService: ConfigService) {}

  create<T>(ApiType: new (config: Configuration) => T, token?: string): T {
    const apiUrl = this.configService.apiUrl;

    if (!apiUrl) {
      throw new Error('❌ API URL is missing in ConfigService.');
    }

    const config = new Configuration({
      basePath: apiUrl,
      accessToken: token ? `Bearer ${token}` : undefined
    });


    return new ApiType(config);
  }
}
