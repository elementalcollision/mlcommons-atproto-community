/**
 * Readiness Check Endpoint
 *
 * Used for Kubernetes/load balancer readiness probes.
 * Returns 200 OK if the service is ready to accept traffic.
 */

import type { LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { db } from '~/lib/db.server';
import { sql } from 'drizzle-orm';

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    // Quick database check
    await db.execute(sql`SELECT 1`);

    return json(
      { ready: true },
      {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    );
  } catch (error) {
    return json(
      {
        ready: false,
        reason: error instanceof Error ? error.message : 'Service not ready',
      },
      {
        status: 503,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    );
  }
}
