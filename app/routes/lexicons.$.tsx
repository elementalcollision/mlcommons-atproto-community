import { type LoaderFunctionArgs } from "@remix-run/node";
import { readFile } from "fs/promises";
import { join } from "path";

/**
 * Serve Lexicon schema files
 * GET /lexicons/mlcommons/community/definition.json
 * GET /lexicons/mlcommons/community/defs.json
 */
export async function loader({ params }: LoaderFunctionArgs) {
  const path = params["*"];

  if (!path) {
    return new Response("Not Found", { status: 404 });
  }

  // Security: only allow JSON files in public/lexicons directory
  if (!path.endsWith(".json") || path.includes("..")) {
    return new Response("Forbidden", { status: 403 });
  }

  try {
    const filePath = join(process.cwd(), "public", "lexicons", path);
    const content = await readFile(filePath, "utf-8");
    const json = JSON.parse(content);

    return new Response(JSON.stringify(json, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error(`Failed to load lexicon at ${path}:`, error);
    return new Response("Not Found", { status: 404 });
  }
}
