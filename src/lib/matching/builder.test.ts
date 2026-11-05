import assert from "node:assert/strict";
import test from "node:test";
import type { PersonCardDTO } from "@/lib/queries/types";
import { selectBuilderCandidates } from "./builder";

function person(id: string, roles: string[], skills: { id: string; name: string; category: "frontend" | "backend" }[]): PersonCardDTO {
  return {
    id, name: id, idVerified: true, image: null, bio: null, collegeName: null,
    experienceLevel: "intermediate", commitment: "serious", recruitmentStatus: "looking",
    emergencyAvailable: false, githubUsername: null, topSkills: skills.map((skill) => ({ ...skill, slug: skill.id, level: 4 })),
    roles: roles.map((slug) => ({ id: slug, slug, name: slug })), hoursPerWeek: 20,
  };
}

test("builder greedily selects complementary role and skill coverage", () => {
  const requester = person("requester", ["frontend"], [{ id: "react", name: "React", category: "frontend" }]);
  const redundant = person("a-redundant", ["frontend"], [{ id: "react", name: "React", category: "frontend" }]);
  const complementary = person("b-backend", ["backend"], [{ id: "node", name: "Node", category: "backend" }]);
  const result = selectBuilderCandidates(requester, [redundant, complementary], 1);
  assert.equal(result.selected[0]?.candidate.id, "b-backend");
  assert.deepEqual(result.selected[0]?.coveredRoles, ["backend"]);
});

test("builder results are stable on ties", () => {
  const requester = person("requester", [], []);
  const first = person("a", ["backend"], [{ id: "node", name: "Node", category: "backend" }]);
  const second = person("b", ["backend"], [{ id: "node", name: "Node", category: "backend" }]);
  const one = selectBuilderCandidates(requester, [second, first], 2).selected.map((item) => item.candidate.id);
  const two = selectBuilderCandidates(requester, [first, second], 2).selected.map((item) => item.candidate.id);
  assert.deepEqual(one, ["a", "b"]);
  assert.deepEqual(two, ["a", "b"]);
});
