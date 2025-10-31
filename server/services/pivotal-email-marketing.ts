import type {
  OperationId,
  OperationRequestMap,
  OperationResponseMap,
  PivotalEmailEventMap,
} from '@shared/pivotal-email-marketing';

export type OperationHandler<K extends OperationId> = (
  payload: OperationRequestMap[K],
) => Promise<OperationResponseMap[K]> | OperationResponseMap[K];

export class PivotalOperationRegistry {
  private readonly handlers = new Map<OperationId, OperationHandler<any>>();

  register<K extends OperationId>(operationId: K, handler: OperationHandler<K>): void {
    if (this.handlers.has(operationId)) {
      throw new Error(`Operation handler already registered for ${operationId}`);
    }

    // Use a typed wrapper to preserve inference at runtime.
    this.handlers.set(operationId, handler as OperationHandler<any>);
  }

  async execute<K extends OperationId>(
    operationId: K,
    payload: OperationRequestMap[K],
  ): Promise<OperationResponseMap[K]> {
    const handler = this.handlers.get(operationId);
    if (!handler) {
      throw new Error(`No handler registered for operation ${operationId}`);
    }

    return (await handler(payload)) as OperationResponseMap[K];
  }

  has(operationId: OperationId): boolean {
    return this.handlers.has(operationId);
  }

  list(): OperationId[] {
    return Array.from(this.handlers.keys()).sort();
  }
}

export type EventProducer<K extends keyof PivotalEmailEventMap> = (
  payload: PivotalEmailEventMap[K],
) => Promise<void> | void;

export type EventConsumer<K extends keyof PivotalEmailEventMap> = (
  payload: PivotalEmailEventMap[K],
) => Promise<void> | void;

export interface EventBindingHost {
  bindProducer<K extends keyof PivotalEmailEventMap>(
    eventName: K,
    producer: EventProducer<K>,
  ): void;
  bindConsumer<K extends keyof PivotalEmailEventMap>(
    eventName: K,
    consumer: EventConsumer<K>,
  ): void;
}

const EVENT_NAMES = [
  'email.delivered',
  'email.open',
  'email.click',
  'form.viewed',
  'form.submitted',
  'email.conversion',
  'qa.task.created',
  'lead.assigned',
  'ai.template.generated',
  'ai.template.approved',
] as const satisfies Array<keyof PivotalEmailEventMap>;

export function registerPivotalEmailEventBindings(host: EventBindingHost): void {
  const noop = async () => {
    /* intentionally empty */
  };

  EVENT_NAMES.forEach((eventName) => {
    host.bindProducer(eventName, noop as EventProducer<typeof eventName>);
    host.bindConsumer(eventName, noop as EventConsumer<typeof eventName>);
  });
}

export class InMemoryEventBindingHost implements EventBindingHost {
  private readonly producers = new Map<string, EventProducer<keyof PivotalEmailEventMap>>();
  private readonly consumers = new Map<string, EventConsumer<keyof PivotalEmailEventMap>>();

  bindProducer<K extends keyof PivotalEmailEventMap>(eventName: K, producer: EventProducer<K>): void {
    this.producers.set(eventName, producer as EventProducer<keyof PivotalEmailEventMap>);
  }

  bindConsumer<K extends keyof PivotalEmailEventMap>(eventName: K, consumer: EventConsumer<K>): void {
    this.consumers.set(eventName, consumer as EventConsumer<keyof PivotalEmailEventMap>);
  }

  async publish<K extends keyof PivotalEmailEventMap>(
    eventName: K,
    payload: PivotalEmailEventMap[K],
  ): Promise<void> {
    const producer = this.producers.get(eventName);
    if (producer) {
      await producer(payload);
    }
    const consumer = this.consumers.get(eventName);
    if (consumer) {
      await consumer(payload);
    }
  }
}
