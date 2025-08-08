import { beforeAll } from 'vitest';
import { application } from './application';

(global as any).application = application;
beforeAll(() => {
  // FIXME https://github.com/jsdom/jsdom/issues/1724
  global.fetch = fetch;
  global.Headers = Headers;
  global.Request = Request;
  global.Response = Response;
  global.AbortController = AbortController;
}); 