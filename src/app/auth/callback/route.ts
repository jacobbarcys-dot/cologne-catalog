import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { redirectTo } from "@/lib/redirect";

// Google sends the user back here with a one-time code; trade it for a session.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return redirectTo("/");
  }

  return redirectTo("/login?error=callback");
}
