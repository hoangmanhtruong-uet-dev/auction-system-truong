import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { verifyEmail } from "@/src/actions/profile-email-verification";

export const dynamic = "force-dynamic";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  async function confirmVerification() {
    "use server";
    if (!token) redirect("/profile?error=invalid_token");
    const result = await verifyEmail(token);
    redirect(result.success ? "/profile?email_verified=true" : "/profile?error=verify_failed");
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg items-center px-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Confirm email verification</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={confirmVerification}>
            <Button type="submit" disabled={!token}>Verify email</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
