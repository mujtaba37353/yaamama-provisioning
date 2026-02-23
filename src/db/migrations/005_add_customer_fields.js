export function up(knex) {
  return knex.schema.alterTable("stores", (t) => {
    t.string("customer_email").nullable();
    t.string("customer_name").nullable();
    t.string("store_name").nullable();
    t.string("admin_password").nullable();
  });
}

export function down(knex) {
  return knex.schema.alterTable("stores", (t) => {
    t.dropColumn("customer_email");
    t.dropColumn("customer_name");
    t.dropColumn("store_name");
    t.dropColumn("admin_password");
  });
}
