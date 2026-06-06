import { redirect } from "next/navigation";

/** /configs → permanently redirects to the default sub-route */
export default function ConfigsIndexPage() {
  redirect("/configs/operational");
}
