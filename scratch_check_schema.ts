import { query } from "./src/lib/db";

async function check() {
  const columns = await query("SHOW COLUMNS FROM resources_editors");
  console.log(JSON.stringify(columns, null, 2));
}

check();
