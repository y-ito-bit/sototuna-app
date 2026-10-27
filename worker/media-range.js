// Serves /assets/news/* (update videos) with byte-range support. iPhone Safari only plays <video>
// when the server answers Range requests with 206; the static asset handler always returns the whole file.
// Every other path is served by the asset handler directly (see run_worker_first in wrangler.jsonc).
export function rangeResponse(full, rangeHeader) {
  const size = full.body.byteLength;
  const headers = new Headers(full.headers);
  headers.set('Accept-Ranges', 'bytes');
  const m = /^bytes=(\d*)-(\d*)$/.exec(String(rangeHeader || '').trim());
  if (!m || (m[1] === '' && m[2] === '')) return { status: 200, headers, body: full.body };
  let start, end;
  if (m[1] === '') { start = Math.max(0, size - Number(m[2])); end = size - 1; }
  else { start = Number(m[1]); end = m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1); }
  if (start >= size || end < start) {
    headers.set('Content-Range', `bytes */${size}`);
    return { status: 416, headers, body: new ArrayBuffer(0) };
  }
  headers.set('Content-Range', `bytes ${start}-${end}/${size}`);
  headers.set('Content-Length', String(end - start + 1));
  return { status: 206, headers, body: full.body.slice(start, end + 1) };
}

export default {
  async fetch(request, env) {
    const asset = await env.ASSETS.fetch(new Request(request.url, { method: 'GET' }));
    if (asset.status !== 200) return asset;
    const out = rangeResponse({ headers: asset.headers, body: await asset.arrayBuffer() }, request.headers.get('Range'));
    return new Response(request.method === 'HEAD' ? null : out.body, { status: out.status, headers: out.headers });
  },
};
