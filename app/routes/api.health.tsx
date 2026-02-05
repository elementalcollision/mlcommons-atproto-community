/**
 * Health Check Endpoint
 *
 * Used for monitoring and load balancer health checks.
 * Returns 200 OK if the service is healthy.
 */

import type { LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { db } from '~/lib/db.server';
import { sql } from 'drizzle-orm';

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const detailed = url.searchParams.get('detailed') === 'true';

  const startTime = Date.now();
  const checks: Record<string, { status: 'ok' | 'error'; latencyMs?: number; error?: string }> = {};

  // Check database connection
  try {
    const dbStart = Date.now();
    await db.execute(sql`SELECT 1`);
    checks.database = {
      status: 'ok',
      latencyMs: Date.now() - dbStart,
    };
  } catch (error) {
    checks.database = {
      status: 'error',
      error: error instanceof Error ? error.message : 'Database connection failed',
    };
  }

  // Overall status
  const isHealthy = Object.values(checks).every((check) => check.status === 'ok');
  const totalLatency = Date.now() - startTime;

  // Simple response for basic health checks
  if (!detailed) {
    if (!isHealthy) {
      return json(
        { status: 'unhealthy' },
        { status: 503 }
      );
    }
    return json({ status: 'healthy' });
  }

  // Detailed response
  const response = {
    status: isHealthy ? 'healthy' : 'unhealthy',
    version: process.env.npm_package_version || '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    latencyMs: totalLatency,
    checks,
    memory: {
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
    },
  };

  return json(response, {
    status: isHealthy ? 200 : 503,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}
