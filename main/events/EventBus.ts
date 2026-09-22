type EventHandler = (payload?: any) => void | Promise<void>;

class EventBus {
  private handlers = new Map<string, Set<EventHandler>>();

  on(event: string, handler: EventHandler): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
  }

  off(event: string, handler: EventHandler): void {
    const set = this.handlers.get(event);
    if (!set) return;
    set.delete(handler);
    if (set.size === 0) {
      this.handlers.delete(event);
    }
  }

  emit(event: string, payload?: any): void {
    const handlers = this.handlers.get(event);
    if (!handlers) return;

    for (const handler of Array.from(handlers)) {
      try {
        void Promise.resolve(handler(payload));
      } catch (error) {
        console.error(`[EventBus] Handler failed for ${event}:`, error);
      }
    }
  }
}

export const eventBus = new EventBus();
export default eventBus;
