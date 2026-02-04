import type { MetaFunction } from "@remix-run/node";
import { redirect } from "@remix-run/node";

export const meta: MetaFunction = () => {
  return [{ title: "Home - MLCommons Community" }];
};

// Redirect /app to /home
export async function loader() {
  return redirect("/home");
}

export default function AppIndex() {
  return null;
}
