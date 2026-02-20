export async function seed(knex) {
  await knex("warm_pool").del();

  const slots = [];
  for (let i = 1; i <= 10; i++) {
    const num = String(i).padStart(2, "0");
    slots.push({
      slot_name: `pool_${num}`,
      status: "available",
      store_host_id: "host-1",
      db_name: `wp_pool_${num}`,
    });
  }

  await knex("warm_pool").insert(slots);
}
