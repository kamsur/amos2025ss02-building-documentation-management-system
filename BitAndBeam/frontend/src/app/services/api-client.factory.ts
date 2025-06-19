import { Injectable } from '@angular/core';
import { Configuration } from '../../api';
import { ConfigService } from '../config.service';
import { SessionService } from './session.service';

@Injectable({ providedIn: 'root' })
export class ApiClientFactory {
  constructor(private config: ConfigService, private session: SessionService) {}


  create<T>(type: new (cfg: Configuration) => T): T {
    const config = new Configuration({
      basePath: this.config.apiUrl,

      // ✅ This injects the token as Authorization header on every request
      accessToken: () => {
        const token = this.session.getToken();
        console.log('✅ Using token in ApiClientFactory:', token);
        return token || '';
      }
    });

    return new type(config);
  }
}
