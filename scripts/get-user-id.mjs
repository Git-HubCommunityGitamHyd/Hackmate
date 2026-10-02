import postgres from "postgres";
const sql = postgres("postgres://postgres@127.0.0.1:5432/hackmate");
const u = await sql`select id from users where email='dev@hackmate.local' limit 1`;
console.log(u[0]?.id ?? "none");
await sql.end();
