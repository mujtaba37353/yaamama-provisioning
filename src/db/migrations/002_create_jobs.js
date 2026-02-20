export function up(knex) {
  return knex.schema.createTable("jobs", (t) => {
    t.string("id").primary();
    t.string("store_id").notNullable().references("store_id").inTable("stores");
    t.string("type").notNullable().defaultTo("provision");
    t.string("status").notNullable().defaultTo("queued");
    t.string("current_step").nullable();
    t.text("error").nullable();
    t.timestamps(true, true);
    t.timestamp("completed_at").nullable();
  });
}

export function down(knex) {
  return knex.schema.dropTableIfExists("jobs");
}
