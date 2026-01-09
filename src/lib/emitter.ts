type Listener = (payload?: any) => void;
const listeners: Record<string, Listener[]> = {};

export function on(event: string, listener: Listener) {
  if (!listeners[event]) listeners[event] = [];
  listeners[event].push(listener);
  return () => off(event, listener);
}

export function off(event: string, listener: Listener) {
  if (!listeners[event]) return;
  listeners[event] = listeners[event].filter((l) => l !== listener);
}

export function emit(event: string, payload?: any) {
  const ls = listeners[event];
  if (!ls || ls.length === 0) return;
  // copy array to avoid mutation during iteration
  [...ls].forEach((l) => {
    try {
      l(payload);
    } catch (e) {
      // swallow listener errors
      console.warn('[emitter] listener error', e);
    }
  });
}
