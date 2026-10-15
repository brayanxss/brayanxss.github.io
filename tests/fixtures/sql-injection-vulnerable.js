export async function findUserByName(db, name) {
  const query =
    `SELECT id, name FROM demo_users WHERE name = '${name}'`;

  return db.prepare(query).first();
}
