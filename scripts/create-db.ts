import postgres from "postgres";

const sql = postgres("postgres://postgres@localhost:5432/postgres", { max: 1 });
const exists = await sql`SELECT datname FROM pg_database WHERE datname = 'hackmate'`;
if (exists.count === 0) {
  await sql.unsafe(`CREATE DATABASE hackmate`);
  console.log("created database hackmate");
} else {
  console.log("database hackmate already exists");
}
await sql.end();
