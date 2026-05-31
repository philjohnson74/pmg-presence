import type { PushPort } from '../../domain/ports.js';

export class LoggingPushService implements PushPort {
  async notifyMarshals(payload: { fireEventId: string; triggeredAt: string }): Promise<void> {
    console.log(
      `[PushService] Marshal push — fire ${payload.fireEventId} triggered at ${payload.triggeredAt}`,
    );
  }
}
