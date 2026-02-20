export function up(knex) {
  return knex.schema.createTable("job_steps", (t) => {
    t.increments("id").primary();
    t.string("job_id").notNullable().references("id").inTable("jobs").onDelete("CASCADE");
    t.string("step_name").notNullable();
    t.integer("step_order").notNullable();
    t.string("status").notNullable().defaultTo("pending");
    t.timestamp("started_at").nullable();
    t.timestamp("completed_at").nullable();
    t.text("error").nullable();
    t.text("metadata").nullable();
  });
}

export function down(knex) {
  return knex.schema.dropTableIfExists("job_steps");
}
