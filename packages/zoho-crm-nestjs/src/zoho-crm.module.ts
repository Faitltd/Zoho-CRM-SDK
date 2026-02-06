import { DynamicModule, Module, Provider } from '@nestjs/common';
import { ZohoCRM } from '@yourcompany/zoho-crm';
import { ZOHO_CRM_CLIENT, ZOHO_CRM_OPTIONS } from './constants';
import type { ZohoCRMModuleAsyncOptions, ZohoCRMModuleOptions } from './interfaces';
import { ZohoCRMService } from './zoho-crm.service';

@Module({})
export class ZohoCRMModule {
  static forRoot(options: ZohoCRMModuleOptions): DynamicModule {
    const optionsProvider: Provider = {
      provide: ZOHO_CRM_OPTIONS,
      useValue: options
    };
    const clientProvider: Provider = {
      provide: ZOHO_CRM_CLIENT,
      useFactory: (cfg: ZohoCRMModuleOptions) => new ZohoCRM(cfg),
      inject: [ZOHO_CRM_OPTIONS]
    };
    const serviceProvider: Provider = {
      provide: ZohoCRMService,
      useFactory: (client: ZohoCRM) => new ZohoCRMService(client),
      inject: [ZOHO_CRM_CLIENT]
    };

    return {
      module: ZohoCRMModule,
      providers: [optionsProvider, clientProvider, serviceProvider],
      exports: [ZOHO_CRM_CLIENT, ZohoCRMService]
    };
  }

  static forRootAsync(options: ZohoCRMModuleAsyncOptions): DynamicModule {
    const optionsProvider: Provider = {
      provide: ZOHO_CRM_OPTIONS,
      useFactory: options.useFactory,
      inject: options.inject ?? []
    };

    const clientProvider: Provider = {
      provide: ZOHO_CRM_CLIENT,
      useFactory: (cfg: ZohoCRMModuleOptions) => new ZohoCRM(cfg),
      inject: [ZOHO_CRM_OPTIONS]
    };

    const serviceProvider: Provider = {
      provide: ZohoCRMService,
      useFactory: (client: ZohoCRM) => new ZohoCRMService(client),
      inject: [ZOHO_CRM_CLIENT]
    };

    return {
      module: ZohoCRMModule,
      imports: options.imports ?? [],
      providers: [optionsProvider, clientProvider, serviceProvider],
      exports: [ZOHO_CRM_CLIENT, ZohoCRMService]
    };
  }
}
