import type { ZohoCRM } from '../zoho-crm';
import { warnDeprecated } from '../deprecation';

export class ExperimentalFeatures {
  readonly aiScoring: AILeadScoring;

  constructor(private readonly client: ZohoCRM) {
    this.aiScoring = new AILeadScoring(client);
  }
}

export class AILeadScoring {
  constructor(private readonly client: ZohoCRM) {}

  /**
   * Experimental AI-powered lead scoring.
   *
   * @stability alpha
   * @since 2.1.0
   * @experimental This API may change without notice.
   */
  async scoreLeadWithAI(leadId: string): Promise<number> {
    // Opt-in telemetry: capture anonymous usage signal without PII.
    this.client.telemetry.track({
      name: 'experimental.ai_scoring.score_lead',
      properties: { enabled: true }
    });
    void leadId;
    // Placeholder for experimental feature.
    return 0;
  }

  /**
   * Old bulk export method.
   *
   * @stability deprecated
   * @deprecated Use `bulk.initRead()` instead. Will be removed in v3.0.0
   * @since 1.0.0
   */
  async exportLeads(): Promise<void> {
    warnDeprecated({
      feature: 'ExperimentalFeatures.aiScoring.exportLeads',
      message: 'This method is deprecated and will be removed in v3.0.0.',
      alternative: 'BulkModule.initRead',
      removalVersion: '3.0.0',
      reason: 'Bulk export moved to the v8 Bulk API.'
    });
  }
}
