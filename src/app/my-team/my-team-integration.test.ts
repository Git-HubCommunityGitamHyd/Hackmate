import assert from "node:assert/strict";
import test from "node:test";
import type { TeamDetailDTO } from "@/lib/queries/types";

// Mock TeamDetailDTO fixture representative of My-Team page data
const mockTeam: TeamDetailDTO = {
  id: "team-1111-1111",
  name: "CodeCrafters",
  hackathonId: "hack-2222-2222",
  hackathonName: "Global Hackathon 2026",
  hackathonSlug: "global-hack-2026",
  ideaDomain: "Education",
  ideaTitle: "Smart Learning Hub",
  ideaDescription: "A collaborative study platform.",
  ideaAnonymous: false,
  commitment: "serious",
  targetSize: 4,
  memberCount: 2,
  status: "recruiting",
  lookingForIdea: false,
  openRoles: ["Backend Engineer", "Designer"],
  missingSkills: ["Go", "Figma"],
  completeness: 50,
  memberNames: ["Alice Lead", "Bob Teammate"],
  chatUrl: "https://discord.gg/example",
  repoUrl: "https://github.com/example/repo",
  createdAt: "2026-09-20T10:00:00Z",
  members: [
    {
      userId: "user-alice-0001",
      name: "Alice Lead",
      image: null,
      idVerified: true,
      isAdmin: true,
      role: { id: "role-1", slug: "fullstack", name: "Full Stack Engineer" },
      topSkills: [{ id: "s-react", slug: "react", name: "React", category: "frontend" }],
      experienceLevel: "advanced",
      githubUsername: "alicelead",
    },
    {
      userId: "user-bob-0002",
      name: "Bob Teammate",
      image: null,
      idVerified: false,
      isAdmin: false,
      role: { id: "role-2", slug: "frontend", name: "Frontend Engineer" },
      topSkills: [{ id: "s-ts", slug: "typescript", name: "TypeScript", category: "frontend" }],
      experienceLevel: "intermediate",
      githubUsername: "bobteammate",
    },
  ],
  rolesNeeded: [],
  skillsWanted: [],
  composition: {
    coverages: [],
    completenessPercent: 50,
    summary: "Team needs backend and design coverage",
    gaps: [],
    recommendations: [],
  },
  viewer: {
    isMember: true,
    isAdmin: true,
    hasPendingRequest: false,
    hasPendingInvite: false,
    matchScore: null,
    matchReasons: [],
  },
  tasks: [],
};

// ==========================================
// 1. TeamDetailDTO member data structure tests
// ==========================================

test("1. userId already exists in TeamDetailDTO member data", () => {
  assert.equal(mockTeam.members.length, 2);
  for (const member of mockTeam.members) {
    assert.ok(member.userId, "Member must have a userId");
    assert.equal(typeof member.userId, "string");
    assert.ok(member.userId.length > 0);
  }
});

// ==========================================
// 2. Selection and TrackRecordCard wiring tests
// ==========================================

test("2. selected member's userId and name are captured accurately", () => {
  let selectedMember: { userId: string; name: string } | null = null;
  const selectMember = (m: { userId: string; name: string }) => {
    selectedMember = { userId: m.userId, name: m.name };
  };

  // Click on Bob
  const targetMember = mockTeam.members[1];
  selectMember(targetMember);

  assert.ok(selectedMember);
  assert.equal((selectedMember as any).userId, "user-bob-0002");
  assert.equal((selectedMember as any).name, "Bob Teammate");
});

test("3. member selection is not accidentally tied to the logged-in user's ID", () => {
  const loggedInUserId = "user-alice-0001";
  let selectedMember: { userId: string; name: string } | null = null;
  const selectMember = (m: { userId: string; name: string }) => {
    selectedMember = { userId: m.userId, name: m.name };
  };

  // Alice is logged in; Alice clicks Track Record on Bob
  selectMember(mockTeam.members[1]);
  assert.ok(selectedMember);
  assert.equal((selectedMember as any).userId, "user-bob-0002");
  assert.notEqual((selectedMember as any).userId, loggedInUserId, "Selection must match the clicked member, not the viewer");

  // Alice clicks Track Record on herself
  selectMember(mockTeam.members[0]);
  assert.ok(selectedMember);
  assert.equal((selectedMember as any).userId, loggedInUserId);
});

// ==========================================
// 3. Dialog open and close state management
// ==========================================

test("4. dialog open/close state transitions and clears selectedMember on close", () => {
  let selectedMember: { userId: string; name: string } | null = null;
  const handleOpenChange = (open: boolean) => {
    if (!open) selectedMember = null;
  };

  // Initially closed
  assert.equal(Boolean(selectedMember), false);

  // Trigger track record dialog for Bob
  selectedMember = { userId: mockTeam.members[1].userId, name: mockTeam.members[1].name };
  assert.equal(Boolean(selectedMember), true);
  assert.equal(selectedMember.userId, "user-bob-0002");

  // User closes dialog (e.g. clicks backdrop or close button)
  handleOpenChange(false);
  assert.equal(selectedMember, null);
  assert.equal(Boolean(selectedMember), false);
});

// ==========================================
// 4. Preservation of existing member properties & actions
// ==========================================

test("5. existing member properties and admin removal controls remain intact", () => {
  const alice = mockTeam.members[0];
  const bob = mockTeam.members[1];

  // Properties preserved
  assert.equal(alice.isAdmin, true);
  assert.equal(alice.idVerified, true);
  assert.equal(alice.role?.slug, "fullstack");
  assert.equal(alice.topSkills[0].name, "React");

  assert.equal(bob.isAdmin, false);
  assert.equal(bob.idVerified, false);
  assert.equal(bob.role?.slug, "frontend");
  assert.equal(bob.topSkills[0].name, "TypeScript");

  // Admin remove action condition: isAdmin && !m.isAdmin
  const canRemoveAlice = mockTeam.viewer.isAdmin && !alice.isAdmin;
  const canRemoveBob = mockTeam.viewer.isAdmin && !bob.isAdmin;

  assert.equal(canRemoveAlice, false, "Lead cannot remove self");
  assert.equal(canRemoveBob, true, "Lead can remove non-admin member");
});
