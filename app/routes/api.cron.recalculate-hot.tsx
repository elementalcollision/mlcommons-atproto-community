import type { LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { recalculateHotScores } from '~/services/post.server';

/**
 * Cron job endpoint for recalculating hot scores
 *
 * This runs every 15 minutes via Vercel Cron to ensure:
 * - Hot scores decay properly over time
 * - Posts < 7 days old get fresh scores
 *
 * Protected by CRON_SECRET environment variable
 */
export async function loader({ request }: LoaderFunctionArgs) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // In development, allow without secret
  if (process.env.NODE_ENV === 'production' && cronSecret) {
    if (authHeader !== `Bearer ${cronSecret}`) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const startTime = Date.now();

  try {
    // Recalculate hot scores for all communities
    const updatedCount = await recalculateHotScores();

    const duration = Date.now() - startTime;

    console.log(`[CRON] Hot score recalculation completed: ${updatedCount} posts updated in ${duration}ms`);

    return json({
      success: true,
      postsUpdated: updatedCount,
      durationMs: duration,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[CRON] Hot score recalculation failed:', error);

    return json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
