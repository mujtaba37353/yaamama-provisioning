export function up(knex) {
  return knex.schema.alterTable("stores", (t) => {
    t.timestamp("suspended_at").nullable();
  });
}

export function down(knex) {
  return knex.schema.alterTable("stores", (t) => {
    t.dropColumn("suspended_at");
  });
}
