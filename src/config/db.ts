import dns from "dns";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { env } from "./env";

let memoryServer: MongoMemoryServer | null = null;

/** Windows often fails SRV lookups via the default resolver; add public DNS fallbacks. */
function configureDnsForAtlas(uri: string) {
  if (!uri.startsWith("mongodb+srv://")) return;
  const fallbacks = ["8.8.8.8", "8.8.4.4", "1.1.1.1"];
  dns.setServers([...new Set([...dns.getServers(), ...fallbacks])]);
}

export async function connectDB() {
  let uri = env.mongoUri;
  configureDnsForAtlas(uri);

  if (env.useMemoryDb) {
    memoryServer = await MongoMemoryServer.create();
    uri = memoryServer.getUri();
    console.log("Using in-memory MongoDB (USE_MEMORY_DB=true)");
  }

  try {
    await mongoose.connect(uri);
    console.log("MongoDB connected");
  } catch (err) {
    console.error("\n❌ MongoDB connection failed:", (err as Error).message);
    console.error("\nFix options:");
    console.error("  1. Memory DB: set USE_MEMORY_DB=true in .env (no install needed)");
    console.error("  2. Docker:    docker compose up -d");
    console.error("  3. Atlas:     set MONGODB_URI in .env to your Atlas connection string\n");
    throw err;
  }
}

export async function disconnectDB() {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
}
