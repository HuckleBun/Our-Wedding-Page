import { spawn } from "child_process";
import { existsSync } from "fs";
import { join } from "path";

const root = process.cwd();
const nextBin = join(root, "node_modules", "next", "dist", "bin", "next");

if (!existsSync(nextBin)) {
  console.error("Next.js not found. Run: npm install");
  process.exit(1);
}

function openBrowser(url) {
  if (process.platform === "win32") {
    spawn("cmd.exe", ["/d", "/c", "start", "", url], {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    }).unref();
    return;
  }
  const opener = process.platform === "darwin" ? "open" : "xdg-open";
  spawn(opener, [url], { detached: true, stdio: "ignore" }).unref();
}

let opened = false;
function tryOpen(url) {
  if (opened || !url) return;
  opened = true;
  openBrowser(url);
}

const next = spawn(process.execPath, [nextBin, "dev", "--turbo"], {
  cwd: root,
  stdio: ["inherit", "pipe", "inherit"],
  env: process.env,
});

next.stdout.on("data", (chunk) => {
  process.stdout.write(chunk);
  const text = chunk.toString();
  const match = text.match(/Local:\s+(https?:\/\/\S+)/);
  if (match) tryOpen(match[1].trim());
});

next.on("exit", (code) => process.exit(code ?? 0));
process.on("SIGINT", () => next.kill("SIGINT"));
process.on("SIGTERM", () => next.kill("SIGTERM"));
