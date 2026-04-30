import { stopImpersonation } from "../actions";

export async function POST() {
  await stopImpersonation();
}
