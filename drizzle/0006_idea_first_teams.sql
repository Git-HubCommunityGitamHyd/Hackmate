-- Idea-first discovery: teams can be posted before a hackathon is chosen.
-- hackathon_id becomes nullable so a founder can float an idea, attract
-- teammates, and attach the event later (PATCH /api/teams/:id).

ALTER TABLE "team" ALTER COLUMN "hackathon_id" DROP NOT NULL;
