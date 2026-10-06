import { MailCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function VerifyRequestPage() {
  return (
    <div className="pt-24 pb-8 flex justify-center">
      <Card className="max-w-md w-full">
        <CardContent className="p-8 text-center">
          <MailCheck className="h-12 w-12 text-primary mx-auto mb-4" />
          <h1 className="text-xl font-bold">Check your inbox</h1>
          <p className="text-sm text-muted-foreground mt-2">
            We sent a sign-in link. It expires in 24 hours and can only be used once.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
