import type { ActionFunctionArgs } from "@remix-run/node";
import { destroySession } from "~/lib/auth/session.server";

export async function action({ request }: ActionFunctionArgs) {
  return destroySession(request);
}

export async function loader({ request }: ActionFunctionArgs) {
  return destroySession(request);
}
