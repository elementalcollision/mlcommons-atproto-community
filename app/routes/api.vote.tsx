import type { ActionFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { requireAuth } from '~/lib/auth/require-auth.server';
import { vote } from '~/services/vote.server';
import { z } from 'zod';
import { enforceRateLimit, rateLimiters, rateLimitHeaders } from '~/lib/rate-limiter.server';
import { logger } from '~/lib/logger.server';

const voteSchema = z.object({
  intent: z.literal('vote'),
  postUri: z.string(),
  direction: z.enum(['up', 'down']),
});

export async function action({ request }: ActionFunctionArgs) {
  // Rate limit: 30 votes per minute
  const rateLimit = enforceRateLimit(request, rateLimiters.write, 'vote');

  const auth = await requireAuth(request);

  const formData = await request.formData();
  const data = {
    intent: formData.get('intent'),
    postUri: formData.get('postUri'),
    direction: formData.get('direction'),
  };

  // Validate
  try {
    const validated = voteSchema.parse(data);

    // Process vote
    await vote(
      auth.user.id,
      auth.identity!.providerUserId,
      validated.postUri,
      validated.direction
    );

    return json({ success: true }, {
      headers: rateLimitHeaders(rateLimit),
    });
  } catch (error) {
    logger.error('Vote error', error, { userId: auth.user.id });

    if (error instanceof z.ZodError) {
      return json(
        { error: 'Invalid vote data', details: error.errors },
        { status: 400 }
      );
    }

    return json(
      {
        error: error instanceof Error ? error.message : 'Failed to process vote',
      },
      { status: 500 }
    );
  }
}
