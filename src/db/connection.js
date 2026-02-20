import knex from "knex";
import knexConfig from "./knexfile.js";
import config from "../config/index.js";

const env = config.nodeEnv === "production" ? "production" : "development";
const db = knex(knexConfig[env]);

export default db;
