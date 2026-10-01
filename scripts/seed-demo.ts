/**
 * Demo-data seed — populates a realistic, explorable dataset on top of the
 * taxonomy seed (`bun run db:seed`). Safe to re-run: it clears demo rows
 * first, then re-inserts. The dev account (dev@hackmate.local) keeps its
 * session — you stay signed in across reseeds.
 *
 * Run: bun run db:seed:demo
 */
import { loadEnv } from "../src/lib/db/load-env";
loadEnv();

import { sql } from "drizzle-orm";

type Db = any;

async function main() {
  const mod: any = await import("../src/lib/db/index");
  const db: Db = mod.db ?? mod.default?.db;
  const schema = mod.schema ?? mod.default?.schema;

  /* ---------- Clear previous demo data (keep taxonomies + dev session) ---------- */
  console.log("· clearing demo data…");
  await db.execute(sql`
    truncate table
      notification, bookmark, hackathon_result, user_badge,
      task, message, invite, join_request, team_skill_wanted, team_role_needed,
      team_member, team, hackathon_profile, hackathon,
      compat_answers, availability, user_role, user_skill
    cascade
  `);

  /* The user table is deliberately NOT truncated (that would also wipe the
     dev account and its session). But a previous demo run leaves its 8 demo
     people behind, and re-inserting them violates user_email_unique. Delete
     exactly the demo personas (they all use the reserved @example.edu domain);
     sessions/accounts cascade with them, the dev account survives. */
  await db.execute(sql`
    delete from "user" where email like '%@example.edu'
  `);

  /* ---------- Look up taxonomies by slug ---------- */
  const skillRows = await db.select().from(schema.skills);
  const roleRows = await db.select().from(schema.roleTaxonomy);
  const badgeRows = await db.select().from(schema.badges);
  const skillId = (slug: string) => skillRows.find((s: any) => s.slug === slug)!.id;
  const roleId = (slug: string) => roleRows.find((r: any) => r.slug === slug)!.id;
  const badgeId = (slug: string) => badgeRows.find((b: any) => b.slug === slug)!.id;

  /* ---------- Users ---------- */
  console.log("· seeding demo people…");
  const day = 24 * 60 * 60 * 1000;
  const now = Date.now();

  const peopleSpec = [
    {
      email: "arjun.dev@example.edu",
      name: "Arjun Mehta",
      username: "arjunmehta",
      bio: "Backend-leaning full-stack dev. FastAPI + Postgres + AWS. Two-time SIH finalist. I ship the boring parts so you can build the fun ones.",
      githubUsername: "arjunmehta-dev",
      experienceLevel: "advanced",
      commitment: "aiming_to_win",
      recruitmentStatus: "looking",
      graduationYear: 2026,
      skills: [
        ["python", 5, true], ["fastapi", 4, true], ["postgresql", 4, false],
        ["aws", 4, false], ["docker", 3, false], ["react", 3, false],
      ] as [string, number, boolean][],
      roles: [["backend", true], ["cloud-devops", false]] as [string, boolean][],
      availability: { weekends: true, evenings: true, overnight: true, remoteOnly: false, willingToTravel: true, timezone: "Asia/Kolkata", hoursPerWeek: 35 },
      compat: { workStyle: "build_first", comfortablePresenting: false, openToIdeaSwaps: true },
      reputationScore: 180,
    },
    {
      email: "priya.ml@example.edu",
      name: "Priya Nair",
      username: "priyanair",
      bio: "ML engineer-in-training. PyTorch, computer vision, and a growing LLM-finetuning habit. Looking for a serious team for SIH.",
      githubUsername: "priyanair-ml",
      experienceLevel: "intermediate",
      commitment: "aiming_to_qualify",
      recruitmentStatus: "partially_formed",
      graduationYear: 2027,
      skills: [
        ["python", 5, true], ["pytorch", 4, true], ["computer-vision", 4, false],
        ["nlp", 3, false], ["scikit-learn", 4, false], ["pandas-numpy", 4, false],
      ] as [string, number, boolean][],
      roles: [["ai-ml", true], ["research", false]] as [string, boolean][],
      availability: { weekends: true, evenings: true, overnight: false, remoteOnly: true, willingToTravel: false, timezone: "Asia/Kolkata", hoursPerWeek: 25 },
      compat: { workStyle: "plan_first", comfortablePresenting: true, openToIdeaSwaps: false },
      reputationScore: 95,
    },
    {
      email: "sneha.design@example.edu",
      name: "Sneha Kulkarni",
      username: "snehak",
      bio: "Product designer. Figma, design systems, and judging-pitch decks that don't look like every other deck. No GitHub needed.",
      linkedinUrl: "https://linkedin.com/in/sneha-kulkarni",
      portfolioUrl: "https://sneha.design",
      experienceLevel: "intermediate",
      commitment: "serious",
      recruitmentStatus: "looking",
      graduationYear: 2026,
      skills: [
        ["figma", 5, true], ["design-systems", 4, false], ["html-css", 3, false],
        ["motion-design", 4, false],
      ] as [string, number, boolean][],
      roles: [["ui-ux-design", true], ["product", false]] as [string, boolean][],
      availability: { weekends: true, evenings: true, overnight: false, remoteOnly: false, willingToTravel: true, timezone: "Asia/Kolkata", hoursPerWeek: 20 },
      compat: { workStyle: "plan_first", comfortablePresenting: true, openToIdeaSwaps: true },
      reputationScore: 60,
    },
    {
      email: "rahul.pitch@example.edu",
      name: "Rahul Verma",
      username: "rahulv",
      bio: "I pitch. Three-time campus hackathon winner, SIH 2024 finalist. I handle the story, the demo script and the 3 AM slide rewrites.",
      experienceLevel: "advanced",
      commitment: "aiming_to_win",
      recruitmentStatus: "looking",
      graduationYear: 2025,
      skills: [
        ["pitch-decks", 5, true], ["storytelling", 4, false], ["demo-videos", 3, false],
        ["public-speaking", 4, false],
      ] as [string, number, boolean][],
      roles: [["pitching", true], ["product", false]] as [string, boolean][],
      availability: { weekends: true, evenings: true, overnight: true, remoteOnly: false, willingToTravel: true, timezone: "Asia/Kolkata", hoursPerWeek: 18 },
      compat: { workStyle: "hybrid", comfortablePresenting: true, openToIdeaSwaps: true },
      reputationScore: 210,
    },
    {
      email: "kavya.frontend@example.edu",
      name: "Kavya Reddy",
      username: "kavyareddy",
      bio: "Frontend dev who cares about 60fps and accessible components. Next.js + Tailwind, currently learning Spline.",
      githubUsername: "kavyareddy",
      experienceLevel: "intermediate",
      commitment: "serious",
      recruitmentStatus: "looking",
      graduationYear: 2027,
      skills: [
        ["react", 4, true], ["nextjs", 4, true], ["typescript", 4, false],
        ["tailwind", 4, false], ["motion-design", 3, false],
      ] as [string, number, boolean][],
      roles: [["frontend", true]] as [string, boolean][],
      availability: { weekends: true, evenings: true, overnight: false, remoteOnly: false, willingToTravel: false, timezone: "Asia/Kolkata", hoursPerWeek: 22 },
      compat: { workStyle: "build_first", comfortablePresenting: false, openToIdeaSwaps: true },
      reputationScore: 40,
    },
    {
      email: "vikram.iot@example.edu",
      name: "Vikram Singh",
      username: "vikramiot",
      bio: "Hardware hacker. ESP32, sensors, and making judges hold a physical thing. Firmware C, a bit of Python for the glue.",
      githubUsername: "vikram-iot",
      experienceLevel: "intermediate",
      commitment: "aiming_to_qualify",
      recruitmentStatus: "looking",
      graduationYear: 2026,
      skills: [
        ["arduino", 5, true], ["esp32", 4, true], ["sensors", 4, false],
        ["python", 3, false],
      ] as [string, number, boolean][],
      roles: [["hardware", true], ["backend", false]] as [string, boolean][],
      availability: { weekends: true, evenings: true, overnight: true, remoteOnly: false, willingToTravel: true, timezone: "Asia/Kolkata", hoursPerWeek: 28 },
      compat: { workStyle: "build_first", comfortablePresenting: false, openToIdeaSwaps: true },
      reputationScore: 75,
    },
    {
      email: "ananya.sec@example.edu",
      name: "Ananya Iyer",
      username: "ananyaiyer",
      bio: "Cybersecurity student. CTF player, bug-bounty curious. I break things first so nobody else gets to break them at demo time.",
      githubUsername: "ananya-sec",
      experienceLevel: "intermediate",
      commitment: "serious",
      recruitmentStatus: "not_looking",
      graduationYear: 2026,
      skills: [
        ["python", 4, true], ["linux", 4, false], ["pen-testing", 3, false],
        ["owasp", 4, false],
      ] as [string, number, boolean][],
      roles: [["cybersecurity", true], ["research", false]] as [string, boolean][],
      availability: { weekends: false, evenings: true, overnight: true, remoteOnly: true, willingToTravel: false, timezone: "Asia/Kolkata", hoursPerWeek: 15 },
      compat: { workStyle: "hybrid", comfortablePresenting: false, openToIdeaSwaps: true },
      reputationScore: 88,
    },
    {
      email: "farhan.product@example.edu",
      name: "Farhan Khan",
      username: "farhank",
      bio: "PM-track student. Scoping, user interviews, and the 90 seconds that decide whether judges care. Looking for a team with a real problem.",
      linkedinUrl: "https://linkedin.com/in/farhan-khan",
      experienceLevel: "beginner",
      commitment: "serious",
      recruitmentStatus: "looking",
      graduationYear: 2027,
      skills: [
        ["figma", 3, true], ["user-research", 4, false], ["roadmapping", 3, false],
      ] as [string, number, boolean][],
      roles: [["product", true], ["pitching", false]] as [string, boolean][],
      availability: { weekends: true, evenings: true, overnight: false, remoteOnly: false, willingToTravel: true, timezone: "Asia/Kolkata", hoursPerWeek: 16 },
      compat: { workStyle: "plan_first", comfortablePresenting: true, openToIdeaSwaps: true },
      reputationScore: 25,
    },
  ];

  const people: Record<string, string> = {};
  for (const p of peopleSpec) {
    const [row] = await db
      .insert(schema.users)
      .values({
        email: p.email,
        name: p.name,
        username: p.username,
        bio: p.bio,
        githubUsername: p.githubUsername ?? null,
        linkedinUrl: p.linkedinUrl ?? null,
        portfolioUrl: p.portfolioUrl ?? null,
        emailVerified: new Date(),
        experienceLevel: p.experienceLevel,
        commitment: p.commitment,
        recruitmentStatus: p.recruitmentStatus,
        activelyLooking: p.recruitmentStatus === "looking" || p.recruitmentStatus === "partially_formed",
        graduationYear: p.graduationYear,
        reputationScore: p.reputationScore,
        onboarded: true,
      })
      .returning();
    people[p.username] = row.id;

    await db.insert(schema.userSkills).values(
      p.skills.map(([slug, level, isPrimary]) => ({
        userId: row.id, skillId: skillId(slug), level, isPrimary,
      })),
    );
    await db.insert(schema.userRoles).values(
      p.roles.map(([slug, isPrimary]) => ({
        userId: row.id, roleId: roleId(slug), isPrimary,
      })),
    );
    await db.insert(schema.availability).values({ userId: row.id, ...p.availability });
    await db.insert(schema.compatAnswers).values({ userId: row.id, ...p.compat });
  }

  /* ---------- The dev account (created on the fly if missing) ----------
     The demo login route creates dev@hackmate.local on first sign-in, but a
     fresh machine running db:seed:demo has never signed in yet — the old code
     silently skipped promotion and then crashed on dev!.id below. Create it
     here so the seed is self-contained. */
  let [dev] = await db
    .select()
    .from(schema.users)
    .where(sql`email = 'dev@hackmate.local'`);
  if (!dev) {
    console.log("· creating the dev account (dev@hackmate.local)…");
    [dev] = await db
      .insert(schema.users)
      .values({ email: "dev@hackmate.local", name: "Dev Sharma" })
      .returning();
  }
  await db
    .update(schema.users)
    .set({
      name: "Dev Sharma",
      username: "devsharma",
      bio: "Local dev account. Building HackMate itself.",
      experienceLevel: "intermediate",
      commitment: "aiming_to_win",
      recruitmentStatus: "partially_formed",
      onboarded: true,
      githubUsername: "devsharma",
    })
    .where(sql`id = ${dev.id}`);
  await db
    .insert(schema.userSkills)
    .values([
      { userId: dev.id, skillId: skillId("nextjs"), level: 4, isPrimary: true },
      { userId: dev.id, skillId: skillId("typescript"), level: 4, isPrimary: false },
      { userId: dev.id, skillId: skillId("postgresql"), level: 3, isPrimary: false },
      { userId: dev.id, skillId: skillId("tailwind"), level: 4, isPrimary: false },
    ])
    .onConflictDoNothing();
  await db
    .insert(schema.userRoles)
    .values([
      { userId: dev.id, roleId: roleId("frontend"), isPrimary: true },
      { userId: dev.id, roleId: roleId("backend"), isPrimary: false },
    ])
    .onConflictDoNothing();

  /* ---------- Hackathons ---------- */
  console.log("· seeding hackathons…");
  const hackSpec = [
    {
      slug: "sih-2026",
      name: "Smart India Hackathon 2026",
      tagline: "India's biggest student innovation battleground",
      description:
        "36-hour national hackathon across 200+ problem statements from ministries. Teams of up to 6, college-level round first, then nationals. Bring your problem statement or find one with a team here.",
      organizer: "Ministry of Education, Government of India",
      startsAt: new Date(now + 21 * day),
      endsAt: new Date(now + 22 * day),
      registrationDeadline: new Date(now + 9 * day),
      teamSizeMin: 3,
      teamSizeMax: 6,
      prizePool: "₹1,00,000 per winning team + national finals",
      mode: "hybrid",
      location: "College round: campus, then Nationals: New Delhi",
      themes: ["FinTech", "HealthTech", "AgriTech", "Smart Education", "Clean & Green Tech", "Blockchain", "Smart Vehicles", "Travel & Tourism"],
      status: "upcoming",
    },
    {
      slug: "hackgitam-2025",
      name: "hackGITAM 2025",
      tagline: "Our own 24-hour campus showdown",
      description:
        "24 hours, one campus, 40 teams. Categories: AI for social good, developer tooling, and open innovation. Free registration, free chai at 3 AM.",
      organizer: "GITAM Coding Club",
      startsAt: new Date(now - 6 * day),
      endsAt: new Date(now - 5 * day),
      registrationDeadline: new Date(now - 20 * day),
      teamSizeMin: 2,
      teamSizeMax: 4,
      prizePool: "₹50,000 pool",
      mode: "offline",
      location: "GITAM Hyderabad Campus",
      themes: ["AI for Social Good", "Dev Tools", "Open Innovation"],
      status: "completed",
    },
    {
      slug: "code-sprint-ai-2025",
      name: "CodeSprint AI 2025",
      tagline: "48 hours, one model, zero boilerplate",
      description:
        "Fully online AI hackathon. Build anything on top of the provided LLM credits. Judged on originality, working demo and the story. Teams of 1-4.",
      organizer: "CodeSprint Foundation",
      startsAt: new Date(now + 2 * day),
      endsAt: new Date(now + 4 * day),
      registrationDeadline: new Date(now + 1 * day),
      teamSizeMin: 1,
      teamSizeMax: 4,
      prizePool: "$5,000 in credits",
      mode: "online",
      location: "Online (Discord)",
      themes: ["LLM Apps", "Agents", "RAG", "Multimodal"],
      status: "upcoming",
    },
  ];

  const hackIds: Record<string, string> = {};
  for (const h of hackSpec) {
    const [row] = await db
      .insert(schema.hackathons)
      .values({ ...h, createdBy: dev?.id ?? null })
      .returning();
    hackIds[h.slug] = row.id;
  }

  /* ---------- Teams ---------- */
  console.log("· seeding teams…");
  const teamSpec = [
    {
      key: "medisync",
      hackathon: "sih-2026",
      name: "MediSync",
      ideaTitle: "Offline-first clinic records for rural PHCs",
      ideaDomain: "HealthTech",
      ideaDescription:
        "Most Primary Health Centres lose patient history whenever connectivity drops. We are building an offline-first sync layer (CRDT-based) over a dead-simple tablet UI, with a state-level dashboard that reconciles when the network returns. Problem statement SIH-1592.",
      ideaAnonymous: false,
      commitment: "aiming_to_win",
      targetSize: 5,
      status: "recruiting",
      members: [
        { u: "priyanair", role: "ai-ml", isAdmin: true },
        { u: "kavyareddy", role: "frontend", isAdmin: false },
      ],
      rolesNeeded: [["backend", "must"], ["ui-ux-design", "nice"], ["pitching", "nice"]],
      skillsWanted: ["fastapi", "postgresql", "figma"],
    },
    {
      key: "cropwatch",
      hackathon: "sih-2026",
      name: "CropWatch",
      ideaTitle: null,
      ideaDomain: "AgriTech",
      ideaDescription: null,
      ideaAnonymous: true,
      commitment: "aiming_to_qualify",
      targetSize: 4,
      status: "recruiting",
      members: [{ u: "vikramiot", role: "hardware", isAdmin: true }],
      rolesNeeded: [["ai-ml", "must"], ["backend", "must"], ["frontend", "nice"]],
      skillsWanted: ["pytorch", "computer-vision", "fastapi"],
    },
    {
      key: "devtools-team",
      hackathon: "code-sprint-ai-2025",
      name: "rubber-duck.ai",
      ideaTitle: "A voice rubber duck that actually reads your code",
      ideaDomain: "LLM Apps",
      ideaDescription:
        "Pair-programming is hard to schedule. We are building an always-on voice companion that indexes your repo, follows your cursor, and asks the annoying questions a senior dev would before your demo breaks.",
      ideaAnonymous: false,
      commitment: "serious",
      targetSize: 4,
      status: "recruiting",
      members: [
        { u: "arjunmehta", role: "backend", isAdmin: true },
        { u: "kavyareddy", role: "frontend", isAdmin: false },
      ],
      rolesNeeded: [["ai-ml", "must"], ["ui-ux-design", "nice"]],
      skillsWanted: ["llm-finetuning", "nlp", "figma"],
    },
    {
      key: "orphan-idea",
      hackathon: "sih-2026",
      name: "Need 2 members for SIH (Idea locked)",
      ideaTitle: null,
      ideaDomain: "FinTech",
      ideaDescription: null,
      ideaAnonymous: true,
      commitment: "aiming_to_qualify",
      targetSize: 4,
      status: "recruiting",
      members: [{ u: "farhank", role: "product", isAdmin: true }],
      rolesNeeded: [["frontend", "must"], ["backend", "must"]],
      skillsWanted: ["react", "nodejs"],
    },
    {
      key: "devteam",
      hackathon: "sih-2026",
      name: "HackMate itself (dogfooding)",
      ideaTitle: "The team finder we wish existed",
      ideaDomain: "Dev Tools",
      ideaDescription:
        "We are entering SIH with HackMate itself: team composition intelligence, natural-language team search, and honest match explanations instead of fake percentages.",
      ideaAnonymous: false,
      commitment: "aiming_to_win",
      targetSize: 4,
      status: "recruiting",
      members: [
        { u: "devsharma", role: "frontend", isAdmin: true },
        { u: "ananyaiyer", role: "cybersecurity", isAdmin: false },
      ],
      rolesNeeded: [["ai-ml", "must"], ["backend", "nice"]],
      skillsWanted: ["pytorch", "llm-finetuning", "fastapi"],
    },
  ];

  const teamIds: Record<string, string> = {};
  for (const t of teamSpec) {
    const [row] = await db
      .insert(schema.teams)
      .values({
        hackathonId: hackIds[t.hackathon],
        name: t.name,
        ideaTitle: t.ideaTitle,
        ideaDomain: t.ideaDomain,
        ideaDescription: t.ideaDescription,
        ideaAnonymous: t.ideaAnonymous,
        commitment: t.commitment,
        targetSize: t.targetSize,
        status: t.status,
      })
      .returning();
    teamIds[t.key] = row.id;

    await db.insert(schema.teamMembers).values(
      t.members.map((m) => {
        const uid = m.u === "devsharma" ? dev!.id : people[m.u];
        return { teamId: row.id, userId: uid, roleId: roleId(m.role), isAdmin: m.isAdmin };
      }),
    );
    if (t.rolesNeeded.length) {
      await db.insert(schema.teamRolesNeeded).values(
        t.rolesNeeded.map(([slug, priority]) => ({
          teamId: row.id, roleId: roleId(slug), priority,
        })),
      );
    }
    if (t.skillsWanted.length) {
      await db.insert(schema.teamSkillsWanted).values(
        t.skillsWanted.map((slug) => ({ teamId: row.id, skillId: skillId(slug) })),
      );
    }
  }

  /* ---------- Join requests + invites ---------- */
  console.log("· seeding join requests…");
  await db.insert(schema.joinRequests).values([
    {
      teamId: teamIds.devteam,
      userId: people.arjunmehta,
      roleId: roleId("backend"),
      message: "I built the search + match scoring for two campus tools before. I can own the API layer and the Postgres schema. Also fully free on the SIH weekend.",
      status: "pending",
    },
    {
      teamId: teamIds.devteam,
      userId: people.priyanair,
      roleId: roleId("ai-ml"),
      message: "The natural-language parser is the interesting bit, happy to take it. I'm in a partially formed team so I'd be joining as the ML lead if that works.",
      status: "pending",
    },
    {
      teamId: teamIds.medisync,
      userId: people.rahulv,
      roleId: roleId("pitching"),
      message: "Won the campus round twice with health projects. I have the 3-minute story for offline-first clinics already half-written in my head.",
      status: "pending",
    },
  ]);

  /* ---------- Team workspace: messages + tasks (dev user's team) ---------- */
  console.log("· seeding team workspace…");
  const chat = [
    { u: "devsharma", t: now - 3 * day, c: "Team, SIH registration closes in 9 days. I locked our problem statement draft: composition-aware team matching." },
    { u: "ananyaiyer", t: now - 3 * day + 3600_000, c: "Nice. I'll do the security review before we submit, last year a team got disqualified for scraping the judge portal lol" },
    { u: "devsharma", t: now - 2 * day, c: "Demo plan: 90 second pitch, 2 minute live search for 'need a backend dev who knows FastAPI', show the gap analysis card." },
    { u: "ananyaiyer", t: now - 1 * day, c: "Can I suggest we also show the emergency substitute mode? Judges love the honest stuff." },
  ];
  await db.insert(schema.messages).values(
    chat.map((m) => ({
      teamId: teamIds.devteam,
      userId: m.u === "devsharma" ? dev!.id : people[m.u],
      content: m.c,
      createdAt: new Date(m.t),
    })),
  );

  await db.insert(schema.tasks).values([
    { teamId: teamIds.devteam, title: "Register on SIH portal (all 4 members)", category: "registration", done: true, position: 0, dueDate: new Date(now + 8 * day) },
    { teamId: teamIds.devteam, title: "Lock problem statement write-up", category: "ppt", done: true, position: 1 },
    { teamId: teamIds.devteam, title: "Idea anonymization toggle", category: "prototype", done: false, position: 2, assigneeId: dev!.id },
    { teamId: teamIds.devteam, title: "Natural-language search parser", category: "prototype", done: false, position: 3 },
    { teamId: teamIds.devteam, title: "2-minute demo video", category: "video", done: false, position: 4 },
    { teamId: teamIds.devteam, title: "Final pitch deck", category: "pitch", done: false, position: 5 },
    { teamId: teamIds.devteam, title: "Push repo + README screenshots", category: "repo", done: false, position: 6 },
  ]);

  /* ---------- Bookmarks + notifications (dev user) ---------- */
  console.log("· seeding bookmarks + notifications…");
  await db.insert(schema.bookmarks).values([
    { userId: dev!.id, targetType: "team", targetId: teamIds.medisync },
    { userId: dev!.id, targetType: "team", targetId: teamIds["devtools-team"] },
    { userId: dev!.id, targetType: "hackathon", targetId: hackIds["code-sprint-ai-2025"] },
    { userId: dev!.id, targetType: "person", targetId: people.arjunmehta },
  ]);

  await db.insert(schema.notifications).values([
    {
      userId: dev!.id, type: "join_request",
      title: "Arjun Mehta wants to join HackMate itself",
      body: "\"I built the search + match scoring for two campus tools before. I can own the API layer.\"",
      link: "/my-team",
    },
    {
      userId: dev!.id, type: "join_request",
      title: "Priya Nair wants to join HackMate itself",
      body: "\"The natural-language parser is the interesting bit, happy to take it.\"",
      link: "/my-team",
    },
    {
      userId: dev!.id, type: "deadline",
      title: "SIH 2026 registration closes in 9 days",
      body: "Your team 'HackMate itself (dogfooding)' is still missing an AI/ML member.",
      link: "/teams",
    },
    {
      userId: dev!.id, type: "system",
      title: "Welcome to HackMate",
      body: "Complete your profile so teams can find you — skills, availability and commitment take 2 minutes.",
      link: "/profile/edit",
    },
  ]);

  /* ---------- Reputation: results + badges ---------- */
  console.log("· seeding reputation…");
  await db.insert(schema.hackathonResults).values([
    {
      userId: people.arjunmehta, hackathonId: hackIds["hackgitam-2025"], teamId: null,
      projectName: "AutoGrader CLI", placement: 1,
      projectUrl: "https://devpost.com/software/autograder-cli",
      repoUrl: "https://github.com/arjunmehta-dev/autograder-cli",
      technologies: ["python", "fastapi", "postgresql"],
    },
    {
      userId: people.rahulv, hackathonId: hackIds["hackgitam-2025"], teamId: null,
      projectName: "AutoGrader CLI", placement: 1,
      projectUrl: "https://devpost.com/software/autograder-cli",
      technologies: ["pitching", "product"],
    },
    {
      userId: people.priyanair, hackathonId: hackIds["hackgitam-2025"], teamId: null,
      projectName: "CropDisease Scanner", placement: 3,
      repoUrl: "https://github.com/priyanair-ml/cropdisease",
      technologies: ["python", "pytorch", "computer-vision"],
    },
  ]);

  await db.insert(schema.userBadges).values([
    { userId: people.arjunmehta, badgeId: badgeId("winner"), hackathonId: hackIds["hackgitam-2025"] },
    { userId: people.rahulv, badgeId: badgeId("winner"), hackathonId: hackIds["hackgitam-2025"] },
    { userId: people.priyanair, badgeId: badgeId("built-project"), hackathonId: hackIds["hackgitam-2025"] },
    { userId: people.vikramiot, badgeId: badgeId("completed-hackathon") },
  ]);

  console.log("✔ Demo data seeded:");
  console.log("  · 8 people + upgraded dev account");
  console.log("  · 3 hackathons (upcoming / ongoing-week / completed)");
  console.log("  · 5 teams (recruiting, anonymous + open ideas)");
  console.log("  · 3 pending join requests, chat + task list for your team");
  console.log("  · bookmarks, notifications, results, badges");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("✗ demo seed failed:", err);
    process.exit(1);
  });
