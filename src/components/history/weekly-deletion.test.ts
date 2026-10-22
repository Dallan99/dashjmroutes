import { afterEach, beforeEach, expect, test } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";

let db: PGlite;
const id = (number: number) => `00000000-0000-0000-0000-${String(number).padStart(12, "0")}`;
const migration = readFileSync(new URL("../../../drizzle/migrations/0000_delete_weekly_import_safely.sql", import.meta.url), "utf8");
beforeEach(async () => {
  db = new PGlite();
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE TABLE weekly_imports (id uuid PRIMARY KEY, file_name text, year integer, week_number integer, status text, is_current boolean, imported_at timestamptz, superseded_by uuid REFERENCES weekly_imports(id), superseded_at timestamptz);
    CREATE UNIQUE INDEX one_current ON weekly_imports(year,week_number) WHERE status='completed' AND is_current;
    CREATE TABLE weekly_items (id integer PRIMARY KEY, import_id uuid REFERENCES weekly_imports(id) ON DELETE CASCADE);
    CREATE TABLE week_notes (id integer PRIMARY KEY, import_id uuid REFERENCES weekly_imports(id) ON DELETE CASCADE);
    INSERT INTO weekly_imports VALUES
      ('${id(1)}','old.xlsx',2026,38,'completed',false,'2026-09-01',null,null),
      ('${id(2)}','new.xlsx',2026,38,'completed',true,'2026-09-15',null,null),
      ('${id(3)}','other.xlsx',2026,37,'completed',true,'2026-09-12',null,null);
    UPDATE weekly_imports SET superseded_by='${id(2)}' WHERE id='${id(1)}';
    INSERT INTO weekly_items VALUES (1,'${id(1)}'),(2,'${id(2)}'),(3,'${id(2)}'),(4,'${id(3)}');
    INSERT INTO week_notes VALUES (1,'${id(2)}');
  `);
  await db.exec(migration);
});
afterEach(async () => { await db.close(); });
const remove = (items = 2) => db.query(`SELECT delete_weekly_import_safely('${id(2)}','new.xlsx',2026,38,${items},1) AS result`);
const rows = async (table: string) => (await db.query(`SELECT * FROM ${table} ORDER BY id`)).rows;

test("deletes only the confirmed import and its items/notes, preserving W37", async () => {
  await remove();
  expect((await rows("weekly_imports")).map((r: any) => r.id)).toEqual([id(1), id(3)]);
  expect((await rows("weekly_items")).map((r: any) => r.id)).toEqual([1,4]);
  expect(await rows("week_notes")).toHaveLength(0);
});
test("promotes the newest completed remaining version, not a processing version", async () => {
  await db.exec(`INSERT INTO weekly_imports VALUES ('${id(4)}','newer.xlsx',2026,38,'completed',false,'2026-09-14', '${id(2)}',now()),('${id(5)}','processing.xlsx',2026,38,'processing',false,'2026-09-20',null,null)`);
  await remove();
  const current = (await rows("weekly_imports")).filter((r: any) => r.is_current && r.week_number === 38);
  expect(current).toHaveLength(1);
  expect(current[0]).toMatchObject({ id: id(4), superseded_by: null, superseded_at: null });
});
test("deleting a non-current version leaves the current import unchanged", async () => {
  await db.query(`SELECT delete_weekly_import_safely('${id(1)}','old.xlsx',2026,38,1,0)`);
  expect((await rows("weekly_imports")).find((r: any) => r.id === id(2))).toMatchObject({ is_current: true });
});
test("count or metadata changes reject deletion without losing any rows", async () => {
  await expect(remove(1)).rejects.toThrow("quantidade de registros mudou");
  await expect(db.query(`SELECT delete_weekly_import_safely('${id(2)}','wrong.xlsx',2026,38,2,1)`)).rejects.toThrow("importação mudou");
  expect(await rows("weekly_items")).toHaveLength(4);
  expect(await rows("weekly_imports")).toHaveLength(3);
});
test("a denied header deletion rolls back the earlier item and note deletions", async () => {
  await db.exec(`GRANT SELECT,INSERT,UPDATE,DELETE ON weekly_imports,weekly_items,week_notes TO authenticated;
    ALTER TABLE weekly_imports ENABLE ROW LEVEL SECURITY;
    CREATE POLICY read_headers ON weekly_imports FOR SELECT TO authenticated USING (true);
    CREATE POLICY update_headers ON weekly_imports FOR UPDATE TO authenticated USING (true);
    SET ROLE authenticated;`);
  await expect(remove()).rejects.toThrow("Sem permissão para excluir a importação");
  await db.exec("RESET ROLE");
  expect(await rows("weekly_items")).toHaveLength(4);
  expect(await rows("week_notes")).toHaveLength(1);
  expect((await rows("weekly_imports")).find((r: any) => r.id === id(1))).toMatchObject({ superseded_by: id(2) });
});
test("no remaining completed version leaves no current version for that week", async () => {
  await db.exec(`DELETE FROM weekly_items WHERE import_id='${id(1)}'; DELETE FROM weekly_imports WHERE id='${id(1)}';`);
  await remove();
  expect((await rows("weekly_imports")).filter((r: any) => r.week_number === 38)).toHaveLength(0);
});
test("anonymous callers with execute cannot bypass existing table permissions", async () => {
  await db.exec("GRANT EXECUTE ON FUNCTION delete_weekly_import_safely(uuid,text,integer,integer,integer,integer) TO anon; SET ROLE anon");
  await expect(remove()).rejects.toThrow("permission denied");
  await db.exec("RESET ROLE");
  expect(await rows("weekly_items")).toHaveLength(4);
});
test("processing imports cannot be removed", async () => {
  await db.exec(`UPDATE weekly_imports SET status='processing' WHERE id='${id(2)}'`);
  await expect(remove()).rejects.toThrow("término do processamento");
  expect(await rows("weekly_items")).toHaveLength(4);
});
test("repeated deletion returns an error, not false success", async () => {
  await remove();
  await expect(remove()).rejects.toThrow("Importação não encontrada");
  expect(await rows("weekly_imports")).toHaveLength(2);
});