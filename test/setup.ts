import { beforeAll } from 'vitest';
import { application } from './application';

(globalThis as any).application = application;
beforeAll(() => {
  // FIXME https://github.com/jsdom/jsdom/issues/1724
  globalThis.fetch = fetch;
  globalThis.Headers = Headers;
  globalThis.Request = Request;
  globalThis.Response = Response;
  globalThis.AbortController = AbortController;
}); 