"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PersonCard } from "@/components/discover/person-card";
import { api, type EqualCandidateDTO } from "@/hooks/use-api";

export function FindEqualButton({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const equals = useQuery({
    queryKey: ["find-equal", userId],
    queryFn: () => api<EqualCandidateDTO[]>(`/api/find-equal?userId=${encodeURIComponent(userId)}`),
    enabled: open,
  });

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Find my equal
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Find my equal</DialogTitle>
            <DialogDescription>
              People close to your karma, ranked by skills, availability, commitment, experience, and role fit.
            </DialogDescription>
          </DialogHeader>

          {equals.isLoading && (
            <div className="space-y-3">
              <Skeleton className="h-36 w-full" />
              <Skeleton className="h-36 w-full" />
            </div>
          )}
          {equals.isError && (
            <p className="text-sm text-destructive">Could not load equals right now.</p>
          )}
          {equals.data && equals.data.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No equals yet. Earn more karma.
            </p>
          )}
          {equals.data && equals.data.length > 0 && (
            <div className="space-y-3">
              {equals.data.map((person) => (
                <PersonCard key={person.id} person={person} showMatch showKarma />
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}