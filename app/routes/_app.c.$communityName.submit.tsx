import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import { Form, useActionData, useLoaderData, useNavigation } from '@remix-run/react';
import { useState } from 'react';
import { requireAuth } from '~/lib/auth/require-auth.server';
import { getCommunity } from '~/services/community.server';
import { createPost } from '~/services/post.server';
import { createPostSchema, MAX_POST_IMAGES, MAX_IMAGE_SIZE } from '~/lib/validations/post';
import { z } from 'zod';

export async function loader({ request, params }: LoaderFunctionArgs) {
  // Require authentication
  const auth = await requireAuth(request);

  // Get community
  const communityName = params.communityName!;
  const community = await getCommunity(communityName, auth.user.id);

  if (!community) {
    throw new Response('Community not found', { status: 404 });
  }

  // Check post permissions
  let canPost = false;
  let permissionMessage = '';

  if (community.postPermissions === 'anyone') {
    canPost = true;
  } else if (community.postPermissions === 'approved') {
    canPost = community.isSubscribed || community.creatorDid === auth.user.id;
    permissionMessage = 'Only community members can post here. Please subscribe first.';
  } else if (community.postPermissions === 'moderators') {
    canPost = community.creatorDid === auth.user.id; // TODO: Check moderator status
    permissionMessage = 'Only moderators can post in this community.';
  }

  return json({
    community,
    canPost,
    permissionMessage,
    user: auth.user,
    identity: auth.identity,
  });
}

export async function action({ request, params }: ActionFunctionArgs) {
  const auth = await requireAuth(request);
  const communityName = params.communityName!;

  // Get community
  const community = await getCommunity(communityName, auth.user.id);
  if (!community) {
    return json({ error: 'Community not found' }, { status: 404 });
  }

  // Parse form data
  const formData = await request.formData();
  const title = formData.get('title') as string | null;
  const text = formData.get('text') as string;
  const externalUrl = formData.get('externalUrl') as string | null;
  const externalTitle = formData.get('externalTitle') as string | null;
  const externalDescription = formData.get('externalDescription') as string | null;

  // Get images
  const imageFiles: File[] = [];
  for (let i = 0; i < MAX_POST_IMAGES; i++) {
    const image = formData.get(`image${i}`) as File | null;
    if (image && image.size > 0) {
      imageFiles.push(image);
    }
  }

  // Validate
  try {
    createPostSchema.parse({
      title: title || undefined,
      text,
      communityId: community.id,
    });

    // Validate images
    for (const image of imageFiles) {
      if (image.size > MAX_IMAGE_SIZE) {
        throw new Error(`Image "${image.name}" is too large. Maximum size: 5MB`);
      }
      if (!image.type.startsWith('image/')) {
        throw new Error(`"${image.name}" is not a valid image file`);
      }
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    if (error instanceof Error) {
      return json({ error: error.message }, { status: 400 });
    }
    return json({ error: 'Validation failed' }, { status: 400 });
  }

  // Build external link embed if provided
  let externalLink;
  if (externalUrl && externalTitle) {
    externalLink = {
      url: externalUrl,
      title: externalTitle,
      description: externalDescription || '',
    };
  }

  // Create post
  try {
    const post = await createPost(auth.user.id, auth.identity!.providerUserId, {
      communityId: community.id,
      title: title || undefined,
      text,
      images: imageFiles.length > 0 ? imageFiles : undefined,
      externalLink,
    });

    // Redirect to post detail page
    return redirect(`/c/${communityName}/p/${encodeURIComponent(post.uri)}`);
  } catch (error) {
    console.error('Post creation error:', error);
    return json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to create post',
      },
      { status: 500 }
    );
  }
}

export default function SubmitPost() {
  const { community, canPost, permissionMessage } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  const [postType, setPostType] = useState<'text' | 'link'>('text');
  const [imageCount, setImageCount] = useState(0);

  // Permission check
  if (!canPost) {
    return (
      <div className="container-custom">
        <div className="max-w-2xl mx-auto">
          <div className="card text-center py-12">
            <div className="w-16 h-16 bg-primary rounded-full mx-auto mb-4 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-dark"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-serif font-bold mb-2">
              Permission Required
            </h2>
            <p className="text-gray mb-6">{permissionMessage}</p>
            <a
              href={`/c/${community.name}`}
              className="inline-block bg-primary text-dark px-6 py-3 rounded-lg font-semibold hover:bg-primary-dark transition-smooth"
            >
              Back to c/{community.name}
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-custom">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-serif font-bold mb-2">
            Create a post in c/{community.name}
          </h1>
          <p className="text-gray">{community.displayName}</p>
        </div>

        {/* Error display */}
        {actionData?.error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <svg
                className="w-5 h-5 text-red-600 mr-3 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="text-red-800 text-sm">{actionData.error}</p>
            </div>
          </div>
        )}

        {/* Post type selector */}
        <div className="card mb-6">
          <div className="flex gap-2 mb-6">
            <button
              type="button"
              onClick={() => setPostType('text')}
              className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-smooth ${
                postType === 'text'
                  ? 'bg-primary text-dark'
                  : 'bg-gray-100 text-gray hover:bg-gray-200'
              }`}
            >
              Text Post
            </button>
            <button
              type="button"
              onClick={() => setPostType('link')}
              className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-smooth ${
                postType === 'link'
                  ? 'bg-primary text-dark'
                  : 'bg-gray-100 text-gray hover:bg-gray-200'
              }`}
            >
              Link Post
            </button>
          </div>

          <Form method="post" encType="multipart/form-data">
            {/* Title (optional) */}
            <div className="mb-4">
              <label
                htmlFor="title"
                className="block text-sm font-semibold mb-2"
              >
                Title (optional)
              </label>
              <input
                type="text"
                id="title"
                name="title"
                maxLength={300}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Give your post a title..."
                disabled={isSubmitting}
              />
            </div>

            {/* Text content */}
            <div className="mb-4">
              <label htmlFor="text" className="block text-sm font-semibold mb-2">
                Text <span className="text-red-600">*</span>
              </label>
              <textarea
                id="text"
                name="text"
                rows={12}
                maxLength={10000}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                placeholder="Write your post... (Markdown supported)"
                disabled={isSubmitting}
              />
              <p className="text-xs text-gray mt-1">
                Supports Markdown formatting
              </p>
            </div>

            {/* Link post fields */}
            {postType === 'link' && (
              <>
                <div className="mb-4">
                  <label
                    htmlFor="externalUrl"
                    className="block text-sm font-semibold mb-2"
                  >
                    Link URL
                  </label>
                  <input
                    type="url"
                    id="externalUrl"
                    name="externalUrl"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="https://example.com"
                    disabled={isSubmitting}
                  />
                </div>

                <div className="mb-4">
                  <label
                    htmlFor="externalTitle"
                    className="block text-sm font-semibold mb-2"
                  >
                    Link Title
                  </label>
                  <input
                    type="text"
                    id="externalTitle"
                    name="externalTitle"
                    maxLength={200}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Link title"
                    disabled={isSubmitting}
                  />
                </div>

                <div className="mb-4">
                  <label
                    htmlFor="externalDescription"
                    className="block text-sm font-semibold mb-2"
                  >
                    Link Description
                  </label>
                  <textarea
                    id="externalDescription"
                    name="externalDescription"
                    rows={3}
                    maxLength={500}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Brief description of the link"
                    disabled={isSubmitting}
                  />
                </div>
              </>
            )}

            {/* Image uploads (text posts only) */}
            {postType === 'text' && (
              <div className="mb-6">
                <label className="block text-sm font-semibold mb-2">
                  Images (up to 4)
                </label>
                <div className="space-y-2">
                  {Array.from({ length: Math.max(imageCount + 1, 1) }, (_, i) => (
                    <div key={i}>
                      {i < MAX_POST_IMAGES && (
                        <input
                          type="file"
                          name={`image${i}`}
                          accept="image/*"
                          onChange={(e) => {
                            if (e.target.files?.[0] && i === imageCount) {
                              setImageCount(Math.min(i + 1, MAX_POST_IMAGES - 1));
                            }
                          }}
                          className="w-full text-sm text-gray file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-dark hover:file:bg-primary-dark"
                          disabled={isSubmitting}
                        />
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray mt-1">
                  Maximum 5MB per image. Supported formats: JPEG, PNG, WebP
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-200">
              <a
                href={`/c/${community.name}`}
                className="px-6 py-2 text-gray hover:text-dark transition-smooth"
              >
                Cancel
              </a>
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-primary text-dark px-6 py-2 rounded-lg font-semibold hover:bg-primary-dark transition-smooth disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Posting...' : 'Post'}
              </button>
            </div>
          </Form>
        </div>
      </div>
    </div>
  );
}
