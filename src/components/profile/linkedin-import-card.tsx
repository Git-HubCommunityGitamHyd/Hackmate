"use client";

import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Linkedin, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { LinkedInImport } from "@/lib/db/schema";

interface ImportResult {
  linkedinUrl: string | null;
  linkedinData: LinkedInImport | null;
  bio: string | null;
  bioFilled: boolean;
}

export function LinkedInImportCard({
  profileId,
  linkedinUrl,
  onLinkedInUrlChange,
  onImported,
}: {
  profileId: string;
  linkedinUrl: string;
  onLinkedInUrlChange: (url: string) => void;
  onImported: (result: ImportResult) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const importProfile = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.set("linkedinUrl", linkedinUrl);
      if (file) formData.set("csv", file);
      const response = await fetch("/api/profile/linkedin-import", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "LinkedIn import failed");
      return result as ImportResult;
    },
    onSuccess: async (result) => {
      onImported(result);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["me"] }),
        queryClient.invalidateQueries({ queryKey: ["profile", profileId] }),
      ]);
      toast.success("LinkedIn profile imported");
      setFile(null);
      if (fileInput.current) fileInput.current.value = "";
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Linkedin className="h-4 w-4 text-[#0A66C2]" /> Import from LinkedIn
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Add your profile URL, upload a LinkedIn data-export CSV, or provide both. Imported
          content only fills profile fields you have left blank.
        </p>
        <div className="space-y-1.5">
          <Label htmlFor="linkedin-import-url">LinkedIn profile URL</Label>
          <Input
            id="linkedin-import-url"
            type="url"
            value={linkedinUrl}
            onChange={(event) => onLinkedInUrlChange(event.target.value)}
            placeholder="https://www.linkedin.com/in/username"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="linkedin-export-csv">Data-export CSV (optional)</Label>
          <Input
            ref={fileInput}
            id="linkedin-export-csv"
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </div>
        <Button
          type="button"
          onClick={() => importProfile.mutate()}
          disabled={importProfile.isPending || (!linkedinUrl.trim() && !file)}
        >
          {importProfile.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Upload className="h-4 w-4 mr-2" />
          )}
          Import profile
        </Button>
      </CardContent>
    </Card>
  );
}
