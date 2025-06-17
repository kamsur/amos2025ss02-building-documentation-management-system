import { Injectable } from '@angular/core';
import { Configuration } from '../../api';
import { ConfigService } from '../config.service';
import { SessionService } from './session.service';
import { createAuthenticatedConfig } from '../utils/create-authenticated-config';

@Injectable({ providedIn: 'root' })
export class ApiClientFactory {
  constructor(
    private session: SessionService,
    private config: ConfigService
  ) {}

  create<T extends new (config: Configuration) => any>(ApiClass: T): InstanceType<T> {
    const token = this.session.getToken();
    const config = createAuthenticatedConfig(this.config.apiUrl, token);
    return new ApiClass(config);
  }
}
