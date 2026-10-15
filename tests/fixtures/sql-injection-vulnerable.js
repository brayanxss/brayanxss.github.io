export async function findUserByName(db, name) {
  return db
    .prepare("SELECT id, name FROM demo_users WHERE name = ?")
    .bind(name)
    .first();
}
