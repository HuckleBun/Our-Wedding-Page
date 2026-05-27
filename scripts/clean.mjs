import { rmSync } from "fs";

try {
  rmSync(".next", { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  console.log("Removed .next cache.");
} catch (err) {
  console.error(
    "Could not remove .next. Stop the dev server (Ctrl+C), then run npm run clean again."
  );
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
