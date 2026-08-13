import { readFile } from "node:fs/promises";

const expectedVersion = process.argv[2];

if (!expectedVersion || !/^\d+\.\d+\.\d+$/.test(expectedVersion)) {
  console.error("Usage: node scripts/verify-release-version.mjs <major.minor.patch>");
  process.exit(1);
}

const files = [
  ["package.json", "package.json"],
  ["package-lock.json", "package-lock.json"],
  ["public/manifest.json", "public/manifest.json"]
];

const mismatches = [];

for (const [label, path] of files) {
  const contents = JSON.parse(await readFile(path, "utf8"));
  if (contents.version !== expectedVersion) {
    mismatches.push(`${label}: expected ${expectedVersion}, found ${contents.version}`);
  }
}

const packageLock = JSON.parse(await readFile("package-lock.json", "utf8"));
const workspaceVersion = packageLock.packages?.[""]?.version;
if (workspaceVersion !== expectedVersion) {
  mismatches.push(
    `package-lock.json packages[""]: expected ${expectedVersion}, found ${workspaceVersion}`
  );
}

if (mismatches.length > 0) {
  console.error(`Release version mismatch:\n${mismatches.join("\n")}`);
  process.exit(1);
}

console.log(`Release versions match ${expectedVersion}.`);
