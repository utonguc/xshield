import { requireMember } from "@/lib/auth";
import { AdjustForm } from "../stock-forms";

export default async function WastePage() {
  await requireMember();
  return <AdjustForm mode="waste" />;
}
