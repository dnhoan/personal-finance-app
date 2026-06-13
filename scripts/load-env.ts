// Side-effect module: loads .env.local into process.env. Import this FIRST in
// any CLI script so dotenv runs before modules that read env at import time
// (e.g. src/lib/env.ts validates eagerly). Import hoisting evaluates this
// dependency before later imports, which the inline loadEnv() call could not.
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });
