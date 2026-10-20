import { type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|d695cf9a-6fd9-4aaf-a676-dddc216dd415.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|css|js)$).*)",
  ],
};
