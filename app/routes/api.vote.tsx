import type { ActionFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { requireAuth } from '~/lib/auth/require-auth.server';
import { vote } from '~/services/vote.server';
import { z } from 'zod';

const voteSchema = z.object({
  intent: z.literal('vote'),
  postUri: z.string(),
  direction: z.enum(['up', 'down']),
});

export async function action({ request }: ActionFunctionArgs) {
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

    return json({ success: true });
  } catch (error) {
    console.error('Vote error:', error);

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
