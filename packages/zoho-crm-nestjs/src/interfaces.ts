import type { ModuleMetadata } from '@nestjs/common';
import type { ZohoCRMConfig } from '@yourcompany/zoho-crm';

export interface ZohoCRMModuleOptions extends ZohoCRMConfig {}

export interface ZohoCRMModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  useFactory: (...args: any[]) => Promise<ZohoCRMModuleOptions> | ZohoCRMModuleOptions;
  inject?: any[];
}
