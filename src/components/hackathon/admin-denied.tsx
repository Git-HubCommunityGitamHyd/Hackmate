import Link from "next/link";
import { ShieldAlert, Terminal, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

/**
 * Shown when a signed-in non-admin opens /hackathons/new or /admin.
 * Server component — no client hooks.
 */
export function AdminDenied() {
  return (
    <div className="pt-16 pb-8 flex justify-center">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            <CardTitle>Admin access required</CardTitle>
          </div>
          <CardDescription>
            Only organizers (admins) can post and manage hackathons. Here is how to get access:
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <span className="flex h-6 w-6 items-center justify-center border bg-muted/50 text-xs">1</span>
              Allow-list your email
            </div>
            <p className="text-sm text-muted-foreground">
              Add your sign-in email to <code className="font-mono text-xs bg-muted px-1.5 py-0.5">ADMIN_EMAILS</code> in
              your environment (<code className="font-mono text-xs bg-muted px-1.5 py-0.5">.env.local</code> for dev,
              Vercel → Settings → Environment Variables for prod):
            </p>
            <pre className="text-xs font-mono bg-muted/60 border p-3 overflow-x-auto"><code>{`ADMIN_EMAILS=you@college.edu,teammate@college.edu`}</code></pre>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <span className="flex h-6 w-6 items-center justify-center border bg-muted/50 text-xs">2</span>
              Sign in with that email
            </div>
            <p className="text-sm text-muted-foreground">
              GitHub OAuth (an account whose email matches) or the email magic link. HackMate promotes
              you to admin automatically at sign-in.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <span className="flex h-6 w-6 items-center justify-center border bg-muted/50 text-xs">3</span>
              Already signed in?
            </div>
            <p className="text-sm text-muted-foreground">Sign out and sign in again — promotion happens at sign-in.</p>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center gap-2 text-sm font-semibold mb-2">
              <Terminal className="h-4 w-4" /> Or promote yourself directly (SQL)
            </div>
            <pre className="text-xs font-mono bg-muted/60 border p-3 overflow-x-auto"><code>{`UPDATE "user" SET role = 'admin' WHERE email = 'you@college.edu';`}</code></pre>
            <p className="text-xs text-muted-foreground mt-2">
              Run it in the CockroachDB console (or any SQL client) — handy for promoting other
              organizers later. Demote by setting <code className="font-mono">role = 'user'</code>.
            </p>
          </div>

          <div className="flex gap-3">
            <Button asChild>
              <Link href="/login">
                <LogIn className="h-4 w-4 mr-2" /> Go to sign in
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/">Back to Discover</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
