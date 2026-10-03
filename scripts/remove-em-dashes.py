#!/usr/bin/env python3
"""Remove ALL em dashes from the Hackmate project (user request, r11).

Strategy:
  1. EXACT replacements for user-visible UI strings, choosing proper
     punctuation for each (period, semicolon, colon, middle dot).
  2. Bulk fallback for code comments and docs: " - " -> " - ".
  3. Any leftover bare em dash -> "-".

Run from the repo root. Reports per-file counts; exits non-zero if any
em dash survives.
"""

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# (relative path, exact old fragment, exact new fragment)
EXACT = [
    # find-equal-button
    ("src/components/profile/find-equal-button.tsx",
     "No equals yet - earn more karma.",
     "No equals yet. Earn more karma."),
    # github-calendar
    ("src/components/profile/github-calendar.tsx",
     "Contribution graph is unavailable right now - the server",
     "Contribution graph is unavailable right now. The server"),
    # admin-hackathons-table
    ("src/components/hackathon/admin-hackathons-table.tsx",
     "You're the organizer - post the first hackathon so students can start forming teams.",
     "You're the organizer. Post the first hackathon so students can start forming teams."),
    # team-chat
    ("src/components/team/team-chat.tsx",
     "Break the ice - say what you&apos;re building this week.",
     "Break the ice. Say what you&apos;re building this week."),
    # hackathon-form
    ("src/components/hackathon/hackathon-form.tsx",
     "Free text - prizes aren&apos;t always money. Internships, goodies, credits all welcome.",
     "Free text. Prizes aren&apos;t always money. Internships, goodies, credits all welcome."),
    # admin-denied
    ("src/components/hackathon/admin-denied.tsx",
     "Sign out and sign in again - promotion happens at sign-in.",
     "Sign out and sign in again; promotion happens at sign-in."),
    ("src/components/hackathon/admin-denied.tsx",
     "(or any SQL client) - handy for promoting other",
     "(or any SQL client). Handy for promoting other"),
    # login page
    ("src/app/login/login-client.tsx",
     "For designers, PMs and pitching specialists - no",
     "For designers, PMs and pitching specialists; no"),
    ("src/app/login/login-client.tsx",
     "Quick dev sign-in - admin (local only)",
     "Quick dev sign-in · admin (local only)"),
    # join-request-dialog
    ("src/components/team/join-request-dialog.tsx",
     "I'm a backend dev - FastAPI + Postgres + AWS, available all through the event.",
     "I'm a backend dev: FastAPI + Postgres + AWS, available all through the event."),
    # looking-dialog
    ("src/components/hackathons/looking-dialog.tsx",
     "at least 10 characters - that's the teaser",
     "at least 10 characters. That's the teaser"),
    ("src/components/hackathons/looking-dialog.tsx",
     "see you in the People tab - tell",
     "see you in the People tab. Tell"),
    ("src/components/hackathons/looking-dialog.tsx",
     "works offline - looking for a backend + a designer.",
     "works offline. Looking for a backend + a designer."),
    # result-dialog
    ("src/components/team/result-dialog.tsx",
     '"Participated - no placement"',
     '"Participated · no placement"'),
    ("src/components/team/result-dialog.tsx",
     '"1st - Winner"',
     '"1st · Winner"'),
    ("src/components/team/result-dialog.tsx",
     "Result recorded - ",
     "Result recorded: "),
    ("src/components/team/result-dialog.tsx",
     "One shot - make it count.",
     "One shot, make it count."),
    # attach-event-dialog
    ("src/components/team/attach-event-dialog.tsx",
     "Event attached - the team is now part of it",
     "Event attached. The team is now part of it"),
    ("src/components/team/attach-event-dialog.tsx",
     "The idea led, the team clicked - now anchor it to a hackathon.",
     "The idea led, the team clicked. Now anchor it to a hackathon."),
    ("src/components/team/attach-event-dialog.tsx",
     "No upcoming events posted yet - check back soon.",
     "No upcoming events posted yet. Check back soon."),
    # karma-pill
    ("src/components/reputation/karma-pill.tsx",
     "No hackathon history yet - karma starts at 0.",
     "No hackathon history yet. Karma starts at 0."),
    # team-card
    ("src/components/discover/team-card.tsx",
     "event not chosen yet - the idea leads, the hackathon follows",
     "event not chosen yet; the idea leads, the hackathon follows"),
    ("src/components/discover/team-card.tsx",
     '} - request to join for details',
     '} · request to join for details'),
]

SKIP_DIRS = {"node_modules", ".next", ".git", "download", "pgbin", "pglib",
             "pgdata", "dist", "coverage"}
EXTS = {".ts", ".tsx", ".css", ".md", ".mjs", ".js", ".json", ".py",
        ".yml", ".yaml", ".sh", ".svg", ".html"}

def iter_files():
    for path in ROOT.rglob("*"):
        if not path.is_file():
            continue
        if path.suffix.lower() not in EXTS:
            continue
        if any(part in SKIP_DIRS for part in path.parts):
            continue
        yield path

def main() -> int:
    report: dict[str, int] = {}

    # Pass 1: exact replacements
    for rel, old, new in EXACT:
        path = ROOT / rel
        if not path.exists():
            print(f"MISSING FILE: {rel}")
            continue
        text = path.read_text(encoding="utf-8")
        if old not in text:
            print(f"NOT FOUND in {rel}: {old[:60]!r}")
            continue
        path.write_text(text.replace(old, new), encoding="utf-8")
        report[rel] = report.get(rel, 0) + 1

    # Pass 2: bulk fallback
    for path in iter_files():
        text = path.read_text(encoding="utf-8")
        if "-" not in text:
            continue
        new = text.replace(" - ", " - ").replace("-", "-")
        if new != text:
            path.write_text(new, encoding="utf-8")
            rel = str(path.relative_to(ROOT))
            report[rel] = report.get(rel, 0) + text.count("-")

    for rel, count in sorted(report.items()):
        print(f"{count:3d}  {rel}")

    # Final check
    leftover = []
    for path in iter_files():
        if "-" in path.read_text(encoding="utf-8"):
            leftover.append(str(path.relative_to(ROOT)))
    if leftover:
        print("LEFTOVER EM DASHES:")
        for p in leftover:
            print(f"  {p}")
        return 1
    print(f"OK: 0 em dashes remain across {len(report)} files touched.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
