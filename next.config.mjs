/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable built-in gzip compression so SSE (text/event-stream) responses
  // are streamed to the browser without buffering.  In dev mode the
  // compression middleware buffers the entire ReadableStream before sending
  // it, which prevents EventSource clients from receiving events in
  // real-time.  Production deployments should rely on the reverse-proxy
  // (e.g. Vercel, Nginx) for compression instead.
  compress: false,
};

export default nextConfig;
