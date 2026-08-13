import { readFile } from "node:fs/promises";

const version = process.argv[2];
const changelogPath = process.argv[3] ?? "CHANGELOG.md";

if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
  console.error(
    "Usage: node extension/scripts/extract-release-notes.mjs <major.minor.patch> [changelog]"
  );
  process.exit(1);
}

const changelog = await readFile(changelogPath, "utf8");
const escapedVersion = version.replaceAll(".", "\\.");
const heading = new RegExp(
  `^## (?:${escapedVersion}|\\[${escapedVersion}\\](?:\\([^\\n]+\\))?)(?: - .+| \\(.+\\))?$`,
  "m"
);
const match = heading.exec(changelog);

if (!match) {
  console.error(`CHANGELOG entry not found for ${version}.`);
  process.exit(1);
}

const bodyStart = match.index + match[0].length;
const nextHeadingOffset = changelog.slice(bodyStart).search(/^## /m);
const bodyEnd = nextHeadingOffset === -1 ? changelog.length : bodyStart + nextHeadingOffset;
const notes = changelog.slice(bodyStart, bodyEnd).trim();

if (!notes) {
  console.error(`CHANGELOG entry for ${version} is empty.`);
  process.exit(1);
}

process.stdout.write(`${notes}\n`);
