import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

// The template's sample page is no longer used.
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { redirect } = await authenticate.admin(request);
  return redirect("/app");
};

export default function Additional() {
  return null;
}
