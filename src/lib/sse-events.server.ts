type SSEClient = {
  controller: ReadableStreamDefaultController;
};

const clients = new Map<string, SSEClient>();

export function addClient(controller: ReadableStreamDefaultController): string {
  const id = crypto.randomUUID();
  clients.set(id, { controller });
  return id;
}

export function removeClient(id: string) {
  clients.delete(id);
}

export function broadcast(type: string, payload: Record<string, unknown> = {}) {
  const data = { type, ...payload, timestamp: Date.now() };
  const message = `data: ${JSON.stringify(data)}\n\n`;
  const encoder = new TextEncoder();
  const encoded = encoder.encode(message);
  for (const [id, client] of clients) {
    try {
      client.controller.enqueue(encoded);
    } catch {
      clients.delete(id);
    }
  }
}
