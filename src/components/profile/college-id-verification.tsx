"use client";

import { useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { VerifiedBadge } from "@/components/shared/verified-badge";
import { COLLEGE_ID_MAX_BYTES, ALLOWED_IMAGE_TYPES } from "@/lib/verification/constants";
import type { ProfileDTO } from "@/lib/queries/types";

interface VerificationResponse {
  status: ProfileDTO["idVerificationStatus"];
  idVerified: boolean;
  message: string;
}

export function CollegeIdVerification({
  profile,
}: {
  profile: ProfileDTO;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  useEffect(() => {
    if (profile.idVerificationStatus !== "PROCESSING") return;
    const interval = setInterval(() => {
      void queryClient.refetchQueries({ queryKey: ["me"], exact: true });
    }, 5000);
    return () => clearInterval(interval);
  }, [profile.idVerificationStatus, queryClient]);

  const verification = useMutation({
    mutationFn: async (file: File): Promise<VerificationResponse> => {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/verification", {
        method: "POST",
        body: form,
      });
      const body = (await response.json()) as VerificationResponse | { error?: string };
      if (!response.ok) {
        throw new Error("error" in body ? body.error : "Unable to verify this ID.");
      }
      return body as VerificationResponse;
    },
    onSuccess: async (result) => {
      queryClient.setQueryData<ProfileDTO>(["me"], (current) =>
        current
          ? {
              ...current,
              idVerified: result.idVerified,
              idVerificationStatus: result.status,
            }
          : current,
      );
      queryClient.setQueryData<ProfileDTO>(["profile", profile.id], (current) =>
        current
          ? {
              ...current,
              idVerified: result.idVerified,
              idVerificationStatus: result.status,
            }
          : current,
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["me"] }),
        queryClient.invalidateQueries({ queryKey: ["profile", profile.id] }),
        queryClient.invalidateQueries({ queryKey: ["people"] }),
      ]);
      if (result.status === "VERIFIED") toast.success(result.message);
      else if (result.status === "NEEDS_REVIEW") toast.info(result.message);
      else toast.error(result.message);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function submitFile(file: File | undefined) {
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      toast.error("Choose a JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size > COLLEGE_ID_MAX_BYTES) {
      toast.error("College ID images must be 4 MB or smaller.");
      return;
    }
    verification.mutate(file);
  }

  const status = profile.idVerificationStatus ?? "NOT_VERIFIED";
  const verified = status === "VERIFIED";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <BadgeCheck className="h-4 w-4 text-primary" />
          Verify your ID
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {verified ? (
          <div className="flex items-center gap-2">
            <VerifiedBadge compact={false} />
            <p className="text-sm text-muted-foreground">
              Your college ID has been successfully verified.
            </p>
          </div>
        ) : verification.isPending || status === "PROCESSING" ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status" aria-live="polite">
            <Loader2 className="h-4 w-4 animate-spin" />
            {verification.isPending
              ? "Uploading and reading your ID…"
              : "Your ID is being verified…"}
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Upload a clear photo of your college ID to receive an ID verified badge.
            </p>
            {status === "NEEDS_REVIEW" && (
              <p className="text-sm text-amber-500">
                Your ID needs additional verification. You can upload another photo.
              </p>
            )}
            {status === "REJECTED" && (
              <p className="text-sm text-destructive">
                We couldn’t verify this ID. Please upload a clearer photo.
              </p>
            )}
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              aria-label="Choose a photo of your college ID"
              onChange={(event) => {
                submitFile(event.currentTarget.files?.[0]);
                event.currentTarget.value = "";
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload college ID
            </Button>
            <p className="text-xs text-muted-foreground">
              JPEG, PNG, or WebP · 4 MB maximum. Your document is stored privately.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
