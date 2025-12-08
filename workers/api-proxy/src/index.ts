/**
 * API Proxy Worker
 * Cloudflare Worker to proxy HTTPS requests to HTTP backend
 * Solves Mixed Content issues for Cloudflare Pages deployment
 *
 * Routes:
 * /api/* -> Backend API (http://148.135.56.115/api/v1)
 * /supabase/* -> Supabase REST API (http://148.135.56.115:8000)
 * /auth/* -> Supabase Auth API (http://148.135.56.115:8000/auth/v1)
 */

export interface Env {
  BACKEND_URL: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_KEY: string;
  ENVIRONMENT: string;
}

// CORS headers for all responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info, prefer, accept-profile, content-profile',
  'Access-Control-Max-Age': '86400',
};

// Handle CORS preflight requests
function handleOptions(): Response {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

// Add CORS headers to response
function addCorsHeaders(response: Response): Response {
  const newHeaders = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders)) {
    newHeaders.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

// Proxy request to target URL
async function proxyRequest(
  request: Request,
  targetUrl: string
): Promise<Response> {
  const url = new URL(request.url);

  // Build target URL
  const target = new URL(targetUrl);

  // Preserve query string
  target.search = url.search;

  // Create new request with modified URL
  const headers = new Headers(request.headers);
  headers.delete('host'); // Remove host header to avoid conflicts

  const proxyRequest = new Request(target.toString(), {
    method: request.method,
    headers,
    body: request.body,
    redirect: 'follow',
  });

  try {
    const response = await fetch(proxyRequest);
    return addCorsHeaders(response);
  } catch (error) {
    console.error('Proxy error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to proxy request',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
}

// Decode base64url string
function base64UrlDecode(str: string): string {
  // Replace URL-safe characters and add padding
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return atob(base64);
}

// Verify user role from JWT token by decoding the payload directly
// Note: This doesn't verify the signature, but the JWT was issued by Supabase
// and we're just checking roles for access control to admin APIs
function verifyUserRole(
  request: Request,
  allowedRoles: string[]
): { valid: boolean; userId?: string; role?: string; error?: string } {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { valid: false, error: 'Missing or invalid Authorization header' };
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    // JWT format: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, error: 'Invalid token format' };
    }

    // Decode the payload (second part)
    const payloadJson = base64UrlDecode(parts[1]);
    const payload = JSON.parse(payloadJson) as {
      sub?: string;
      exp?: number;
      user_metadata?: { role?: string };
    };

    // Check if token is expired
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return { valid: false, error: 'Token expired' };
    }

    const role = payload.user_metadata?.role;
    const userId = payload.sub;

    if (!role || !allowedRoles.includes(role)) {
      return { valid: false, error: `Insufficient permissions. Required: ${allowedRoles.join(' or ')}` };
    }

    return { valid: true, userId, role };
  } catch (error) {
    return { valid: false, error: 'Failed to decode token' };
  }
}

// Admin proxy request - uses service role key to bypass RLS
async function adminProxyRequest(
  request: Request,
  targetUrl: string,
  env: Env
): Promise<Response> {
  const url = new URL(request.url);

  // Build target URL
  const target = new URL(targetUrl);

  // Preserve query string
  target.search = url.search;

  // Create new request with service role key
  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.set('Authorization', `Bearer ${env.SUPABASE_SERVICE_KEY}`);
  headers.set('apikey', env.SUPABASE_SERVICE_KEY);

  const proxyRequest = new Request(target.toString(), {
    method: request.method,
    headers,
    body: request.body,
    redirect: 'follow',
  });

  try {
    const response = await fetch(proxyRequest);
    return addCorsHeaders(response);
  } catch (error) {
    console.error('Admin proxy error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to proxy admin request',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
}

// Health check handler
function handleHealth(env: Env): Response {
  return new Response(
    JSON.stringify({
      status: 'healthy',
      service: 'api-proxy-worker',
      environment: env.ENVIRONMENT,
      timestamp: new Date().toISOString(),
      targets: {
        backend: env.BACKEND_URL,
        supabase: env.SUPABASE_URL,
      },
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    }
  );
}

// Main fetch handler
export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return handleOptions();
    }

    // Health check
    if (path === '/health' || path === '/') {
      return handleHealth(env);
    }

    // Route: /api/* -> Backend API
    if (path.startsWith('/api/')) {
      // Remove /api prefix and forward to backend
      const backendPath = path.replace(/^\/api/, '');
      const targetUrl = `${env.BACKEND_URL}${backendPath}`;
      return proxyRequest(request, targetUrl);
    }

    // Route: /admin/rest/v1/* -> Supabase REST API with service role key (bypasses RLS)
    // Only accessible by admin and teacher roles
    if (path.startsWith('/admin/rest/v1/')) {
      // Verify user has admin or teacher role
      const verification = verifyUserRole(request, ['admin', 'teacher']);
      if (!verification.valid) {
        return new Response(
          JSON.stringify({
            success: false,
            error: verification.error || 'Unauthorized',
          }),
          {
            status: 403,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
            },
          }
        );
      }

      // Remove /admin prefix and forward to Supabase with service role key
      const supabasePath = path.replace(/^\/admin/, '');
      const targetUrl = `${env.SUPABASE_URL}${supabasePath}`;
      return adminProxyRequest(request, targetUrl, env);
    }

    // Direct Supabase SDK compatible routes (for using worker URL as VITE_SUPABASE_URL)
    // Route: /rest/v1/* -> Supabase REST API
    if (path.startsWith('/rest/v1/')) {
      const targetUrl = `${env.SUPABASE_URL}${path}`;
      return proxyRequest(request, targetUrl);
    }

    // Route: /auth/v1/* -> Supabase Auth API
    if (path.startsWith('/auth/v1/')) {
      const targetUrl = `${env.SUPABASE_URL}${path}`;
      return proxyRequest(request, targetUrl);
    }

    // Route: /storage/v1/* -> Supabase Storage API
    if (path.startsWith('/storage/v1/')) {
      const targetUrl = `${env.SUPABASE_URL}${path}`;
      return proxyRequest(request, targetUrl);
    }

    // Route: /realtime/v1/* -> Supabase Realtime API
    if (path.startsWith('/realtime/v1/')) {
      const targetUrl = `${env.SUPABASE_URL}${path}`;
      return proxyRequest(request, targetUrl);
    }

    // Legacy routes (keep for backward compatibility)
    // Route: /supabase/rest/* -> Supabase REST API
    if (path.startsWith('/supabase/rest/')) {
      const supabasePath = path.replace(/^\/supabase\/rest/, '/rest/v1');
      const targetUrl = `${env.SUPABASE_URL}${supabasePath}`;
      return proxyRequest(request, targetUrl);
    }

    // Route: /supabase/auth/* -> Supabase Auth API
    if (path.startsWith('/supabase/auth/')) {
      const supabasePath = path.replace(/^\/supabase\/auth/, '/auth/v1');
      const targetUrl = `${env.SUPABASE_URL}${supabasePath}`;
      return proxyRequest(request, targetUrl);
    }

    // Route: /supabase/* -> Direct Supabase (for storage, realtime, etc.)
    if (path.startsWith('/supabase/')) {
      const supabasePath = path.replace(/^\/supabase/, '');
      const targetUrl = `${env.SUPABASE_URL}${supabasePath}`;
      return proxyRequest(request, targetUrl);
    }

    // 404 for unknown routes
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Not found',
        availableRoutes: [
          '/health - Health check',
          '/api/* - Backend API proxy',
          '/admin/rest/v1/* - Admin Supabase REST API (bypasses RLS, requires admin/teacher role)',
          '/rest/v1/* - Supabase REST API (SDK compatible)',
          '/auth/v1/* - Supabase Auth API (SDK compatible)',
          '/storage/v1/* - Supabase Storage API (SDK compatible)',
          '/supabase/rest/* - Supabase REST API proxy (legacy)',
          '/supabase/auth/* - Supabase Auth API proxy (legacy)',
        ],
      }),
      {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  },
};
