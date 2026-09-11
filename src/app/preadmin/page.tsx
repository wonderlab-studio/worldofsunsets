import { cookies } from "next/headers";
import { isValidSessionToken, SESSION_COOKIE } from "@/lib/auth";
import LoginForm from "@/components/admin/LoginForm";
import ModerationList from "@/components/admin/ModerationList";

export default async function PreAdminPage() {
  const cookieStore = await cookies();
  const authed = isValidSessionToken(cookieStore.get(SESSION_COOKIE)?.value);

  return authed ? <ModerationList /> : <LoginForm />;
}
