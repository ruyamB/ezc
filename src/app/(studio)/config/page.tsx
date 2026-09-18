import { redirect } from "next/navigation";

// Setup is a directed flow now: /config/wallet → /config/api.
// Keep /config working as an alias for step 1.
export default function ConfigIndex() {
  redirect("/config/wallet");
}
