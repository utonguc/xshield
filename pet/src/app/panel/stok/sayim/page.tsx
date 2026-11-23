import { requireMember } from "@/lib/auth";
import { AdjustForm } from "../stock-forms";

export default async function CountPage() {
  await requireMember();
  return <AdjustForm mode="count" />;
}
