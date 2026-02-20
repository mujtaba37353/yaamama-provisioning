export function up(knex) {
  return knex.schema.createTable("stores", (t) => {
    t.string("id").primary();
    t.string("store_id").unique().notNullable();
    t.string("plan_id").notNullable();
    t.string("template_id").notNullable();
    t.string("theme_id").nullable();
    t.string("status").notNullable().defaultTo("pending");
    t.string("store_url").nullable();
    t.string("custom_domain").nullable();
    t.string("store_host_id").nullable();
    t.string("slot_id").nullable();
    t.string("api_token").nullable();
    t.text("error").nullable();
    t.timestamps(true, true);
  });
}

export function down(knex) {
  return knex.schema.dropTableIfExists("stores");
}
