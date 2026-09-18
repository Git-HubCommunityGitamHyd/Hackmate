import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { schema } from "@/lib/db";
import { taskSchema } from "@/lib/validations";
import { ok, fail, requireUser } from "@/lib/api";

/** GET /api/teams/:id/tasks — checklist (members only). */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  if (!user) return fail("Unauthorized", 401);
  const { id } = await params;
  if (!(await isMember(id, user.id))) return fail("Members only", 403);

  const rows = await db
    .select()
    .from(schema.tasks)
    .where(eq(schema.tasks.teamId, id))
    .orderBy(schema.tasks.position);
  return ok(rows.map((t) => ({ ...t, dueDate: t.dueDate?.toISOString() ?? null, createdAt: t.createdAt.toISOString() })));
}

/** POST /api/teams/:id/tasks — add a checklist item (members). */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  if (!user) return fail("Unauthorized", 401);
  const { id } = await params;
  if (!(await isMember(id, user.id))) return fail("Members only", 403);

  const body = await req.json();
  const parsed = taskSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid task");

  const [maxRow] = await db
    .select({ max: schema.tasks.position })
    .from(schema.tasks)
    .where(eq(schema.tasks.teamId, id));
  const nextPos = (maxRow?.max ?? -1) + 1;

  const [task] = await db
    .insert(schema.tasks)
    .values({
      teamId: id,
      title: parsed.data.title,
      category: parsed.data.category,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      position: nextPos,
      assigneeId: body.assigneeId ?? null,
    })
    .returning();

  return ok({ ...task, dueDate: task.dueDate?.toISOString() ?? null, createdAt: task.createdAt.toISOString() }, { status: 201 });
}

/** PATCH /api/teams/:id/tasks — toggle done / reassign / edit. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  if (!user) return fail("Unauthorized", 401);
  const { id } = await params;
  if (!(await isMember(id, user.id))) return fail("Members only", 403);

  const body = await req.json();
  const taskId = body.taskId as string;
  if (!taskId) return fail("taskId required");

  const patch: Record<string, unknown> = {};
  if (typeof body.done === "boolean") patch.done = body.done;
  if (typeof body.title === "string" && body.title.trim()) patch.title = body.title.trim();
  if (typeof body.assigneeId === "string" || body.assigneeId === null) patch.assigneeId = body.assigneeId;
  if (typeof body.dueDate === "string" && body.dueDate) patch.dueDate = new Date(body.dueDate);

  if (Object.keys(patch).length === 0) return fail("Nothing to update");

  const [updated] = await db
    .update(schema.tasks)
    .set(patch)
    .where(and(eq(schema.tasks.id, taskId), eq(schema.tasks.teamId, id)))
    .returning();
  if (!updated) return fail("Task not found", 404);

  return ok({ ...updated, dueDate: updated.dueDate?.toISOString() ?? null, createdAt: updated.createdAt.toISOString() });
}

async function isMember(teamId: string, userId: string) {
  const rows = await db
    .select({ userId: schema.teamMembers.userId })
    .from(schema.teamMembers)
    .where(and(eq(schema.teamMembers.teamId, teamId), eq(schema.teamMembers.userId, userId)));
  return rows.length > 0;
}
