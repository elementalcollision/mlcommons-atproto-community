import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  MetaFunction,
} from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import {
  Form,
  useActionData,
  useNavigation,
  Link,
} from "@remix-run/react";
import { requireAuth } from "~/lib/auth/require-auth.server";
import { createCommunity } from "~/services/community.server";
import { createCommunitySchema } from "~/lib/validations/community";

export const meta: MetaFunction = () => {
  return [
    { title: "Create Community - MLCommons" },
    { name: "description", content: "Create a new community on MLCommons" },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  await requireAuth(request);
  return json({});
}

type ActionData =
  | {
      errors: {
        name?: string[];
        displayName?: string[];
        description?: string[];
        visibility?: string[];
        postPermissions?: string[];
        _form?: string[];
      };
      values: {
        name?: string;
        displayName?: string;
        description?: string;
        visibility?: string;
        postPermissions?: string;
      };
    }
  | undefined;

export async function action({ request }: ActionFunctionArgs) {
  const auth = await requireAuth(request);
  const userId = auth.user?.id;
  const userDid = auth.identity?.providerUserId;

  if (!userId || !userDid) {
    throw new Error("Authentication failed");
  }

  const formData = await request.formData();

  // Extract form fields
  const name = formData.get("name") as string;
  const displayName = formData.get("displayName") as string;
  const description = formData.get("description") as string;
  const visibility = formData.get("visibility") as string;
  const postPermissions = formData.get("postPermissions") as string;
  const avatar = formData.get("avatar") as File | null;
  const banner = formData.get("banner") as File | null;

  // Validate input
  const validation = createCommunitySchema.safeParse({
    name: name?.toLowerCase().trim(),
    displayName: displayName?.trim(),
    description: description?.trim() || undefined,
    visibility,
    postPermissions,
  });

  if (!validation.success) {
    return json(
      {
        errors: validation.error.flatten().fieldErrors,
        values: {
          name,
          displayName,
          description,
          visibility,
          postPermissions,
        },
      },
      { status: 400 }
    );
  }

  try {
    // Create community
    const community = await createCommunity(userId, userDid, {
      name: validation.data.name,
      displayName: validation.data.displayName,
      description: validation.data.description,
      avatar: avatar && avatar.size > 0 ? avatar : undefined,
      banner: banner && banner.size > 0 ? banner : undefined,
      visibility: validation.data.visibility,
      postPermissions: validation.data.postPermissions,
    });

    // Redirect to the new community
    return redirect(`/c/${community.name}`);
  } catch (error) {
    return json(
      {
        errors: {
          _form: [error instanceof Error ? error.message : "Failed to create community"],
        },
        values: {
          name,
          displayName,
          description,
          visibility,
          postPermissions,
        },
      },
      { status: 500 }
    );
  }
}

export default function CreateCommunity() {
  const actionData = useActionData<ActionData>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="container-custom">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-serif mb-2">Create a Community</h1>
          <p className="text-gray">
            Build and moderate your own space for discussion and collaboration
          </p>
        </div>

        {/* Form */}
        <div className="card">
          <Form method="post" encType="multipart/form-data" className="space-y-6">
            {/* Form-level errors */}
            {actionData?.errors?._form && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 text-sm">
                  {actionData.errors._form[0]}
                </p>
              </div>
            )}

            {/* Community Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-semibold mb-2">
                Community Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                defaultValue={actionData?.values?.name}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                  actionData?.errors?.name
                    ? "border-red-500"
                    : "border-gray-300"
                }`}
                placeholder="my-awesome-community"
                pattern="[a-z0-9-]+"
                minLength={3}
                maxLength={21}
              />
              <p className="text-sm text-gray mt-1">
                3-21 characters, lowercase letters, numbers, and hyphens only
              </p>
              {actionData?.errors?.name && (
                <p className="text-red-600 text-sm mt-1">
                  {actionData.errors.name[0]}
                </p>
              )}
            </div>

            {/* Display Name */}
            <div>
              <label
                htmlFor="displayName"
                className="block text-sm font-semibold mb-2"
              >
                Display Name *
              </label>
              <input
                type="text"
                id="displayName"
                name="displayName"
                required
                defaultValue={actionData?.values?.displayName}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                  actionData?.errors?.displayName
                    ? "border-red-500"
                    : "border-gray-300"
                }`}
                placeholder="My Awesome Community"
                maxLength={64}
              />
              <p className="text-sm text-gray mt-1">
                The friendly name shown to users (max 64 characters)
              </p>
              {actionData?.errors?.displayName && (
                <p className="text-red-600 text-sm mt-1">
                  {actionData.errors.displayName[0]}
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="description"
                className="block text-sm font-semibold mb-2"
              >
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                defaultValue={actionData?.values?.description}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                  actionData?.errors?.description
                    ? "border-red-500"
                    : "border-gray-300"
                }`}
                placeholder="What is your community about?"
                maxLength={3000}
              />
              <p className="text-sm text-gray mt-1">
                Briefly describe your community (max 3000 characters, markdown supported)
              </p>
              {actionData?.errors?.description && (
                <p className="text-red-600 text-sm mt-1">
                  {actionData.errors.description[0]}
                </p>
              )}
            </div>

            {/* Image Uploads */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Avatar */}
              <div>
                <label
                  htmlFor="avatar"
                  className="block text-sm font-semibold mb-2"
                >
                  Avatar Image
                </label>
                <input
                  type="file"
                  id="avatar"
                  name="avatar"
                  accept="image/jpeg,image/png,image/webp"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-sm text-gray mt-1">
                  Square image, max 1MB (JPG, PNG, WebP)
                </p>
              </div>

              {/* Banner */}
              <div>
                <label
                  htmlFor="banner"
                  className="block text-sm font-semibold mb-2"
                >
                  Banner Image
                </label>
                <input
                  type="file"
                  id="banner"
                  name="banner"
                  accept="image/jpeg,image/png,image/webp"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-sm text-gray mt-1">
                  Wide image, max 3MB (JPG, PNG, WebP)
                </p>
              </div>
            </div>

            {/* Visibility */}
            <div>
              <label
                htmlFor="visibility"
                className="block text-sm font-semibold mb-2"
              >
                Visibility *
              </label>
              <select
                id="visibility"
                name="visibility"
                required
                defaultValue={actionData?.values?.visibility || "public"}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="public">Public - Anyone can view</option>
                <option value="unlisted">
                  Unlisted - Only visible via direct link
                </option>
                <option value="private">Private - Members only</option>
              </select>
            </div>

            {/* Post Permissions */}
            <div>
              <label
                htmlFor="postPermissions"
                className="block text-sm font-semibold mb-2"
              >
                Who can post? *
              </label>
              <select
                id="postPermissions"
                name="postPermissions"
                required
                defaultValue={actionData?.values?.postPermissions || "anyone"}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="anyone">Anyone</option>
                <option value="approved">Approved members only</option>
                <option value="moderators">Moderators only</option>
              </select>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t">
              <Link
                to="/communities"
                className="text-secondary-blue hover:underline"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-primary text-dark px-6 py-3 rounded-lg font-semibold hover:bg-primary-dark transition-smooth disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Creating..." : "Create Community"}
              </button>
            </div>
          </Form>
        </div>

        {/* Guidelines */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-sm mb-2">Community Guidelines</h3>
          <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
            <li>Choose a descriptive, unique name</li>
            <li>Be respectful and follow MLCommons code of conduct</li>
            <li>Moderate your community actively</li>
            <li>Community names cannot be changed after creation</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
