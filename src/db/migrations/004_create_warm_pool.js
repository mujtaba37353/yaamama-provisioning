export function up(knex) {
  return knex.schema.createTable("warm_pool", (t) => {
    t.increments("id").primary();
    t.string("slot_name").unique().notNullable();
    t.string("status").notNullable().defaultTo("available");
    t.string("store_host_id").defaultTo("host-1");
    t.string("db_name").notNullable();
    t.string("reserved_by_job_id").nullable().references("id").inTable("jobs").onDelete("SET NULL");
    t.timestamps(true, true);
    t.timestamp("reserved_at").nullable();
  });
}

export function down(knex) {
  return knex.schema.dropTableIfExists("warm_pool");
}
