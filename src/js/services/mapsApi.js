// src/js/services/mapsApi.js

export function createMapsApi({ baseUrl, fetchImpl = globalThis.fetch }) {
  if (!baseUrl) throw new Error('baseUrl required');

  // Internal ETag storage per map ID
  const etags = new Map();

  // Helper to build URLs
  const u = (path) =>
    baseUrl.replace(/\/$/, '') + (path.startsWith('/') ? path : `/${path}`);

  // Helper to make HTTP requests with error handling
  async function req(path, opts = {}) {
    const res = await fetchImpl(u(path), opts);
    const contentType = res.headers.get('Content-Type') || '';
    const isProblem = contentType.includes('application/problem+json');
    const isJson =
      contentType.includes('application/json') ||
      contentType.includes('application/problem+json');
    const json = isJson ? await res.json() : Promise.resolve(null);

    if (!res.ok) {
      const problem =
        isProblem && json
          ? json
          : { title: res.statusText, status: res.status };

      // Priority: RFC 7807 title > HTTP {status} for non-JSON > statusText for others
      let errorMessage;
      if (isProblem && json?.title) {
        errorMessage = json.title;
      } else if (!isJson) {
        errorMessage = `HTTP ${res.status}`;
      } else {
        errorMessage = problem.title || `HTTP ${res.status}`;
      }
      const err = new Error(errorMessage);
      err.problem = problem;
      err.status = res.status;
      throw err;
    }

    return { res, json };
  }

  return {
    async health() {
      const { json } = await req('/health', {});
      return json;
    },

    async createMap({ name, data }) {
      const { res, json } = await req('/maps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, data }),
      });

      const etag = res.headers.get('ETag');
      if (json?.id && etag) {
        etags.set(String(json.id), etag);
      }

      return { ...json, etag };
    },

    async getMap(id) {
      const { res, json } = await req(`/maps/${encodeURIComponent(id)}`, {});

      const etag = res.headers.get('ETag');
      if (etag) {
        etags.set(String(id), etag);
      }

      return { ...json, etag };
    },

    async updateMap(id, body, etag) {
      const match = etag || etags.get(String(id));
      const { res, json } = await req(`/maps/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(match ? { 'If-Match': match } : {}),
        },
        body: JSON.stringify(body),
      });

      const next = res.headers.get('ETag');
      if (next) {
        etags.set(String(id), next);
      }

      return { ...json, etag: next };
    },
  };
}
