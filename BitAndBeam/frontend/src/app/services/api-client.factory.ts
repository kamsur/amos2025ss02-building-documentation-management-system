import { Injectable } from '@angular/core';
import { Configuration } from '../../api';
import { ConfigService } from '../config.service';
import { SessionService } from './session.service';

@Injectable({ providedIn: 'root' })
export class ApiClientFactory {
  constructor(private config: ConfigService, private session: SessionService) {}


  create<T>(type: new (cfg: Configuration) => T, token?: string): T {
    const authToken = token ?? this.session.getToken() ?? undefined;
    const config = new Configuration({
      basePath: this.config.apiUrl,
      accessToken: authToken
    });

    console.log('✅ Using token in ApiClientFactory:', authToken);
    return new type(config);
  }
}
