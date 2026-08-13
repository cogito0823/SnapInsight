import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const extensionRoot = resolve(import.meta.dirname, "../..");
const repositoryRoot = resolve(extensionRoot, "..");

test("release version verifier covers every automated version source", async () => {
  const packageJson = JSON.parse(
    await readFile(join(extensionRoot, "package.json"), "utf8")
  ) as { version: string };
  const { stdout } = await execFileAsync(
    process.execPath,
    ["scripts/verify-release-version.mjs", packageJson.version],
    { cwd: extensionRoot }
  );

  assert.equal(stdout.trim(), `Release versions match ${packageJson.version}.`);

  const config = JSON.parse(
    await readFile(join(repositoryRoot, "release-please-config.json"), "utf8")
  ) as {
    draft: boolean;
    "force-tag-creation": boolean;
    packages: {
      ".": {
        "extra-files": Array<{ path: string; jsonpath?: string }>;
      };
    };
  };
  assert.equal(config.draft, true);
  assert.equal(config["force-tag-creation"], true);
  const targets = config.packages["."]["extra-files"];
  assert.deepEqual(
    targets.map(({ path, jsonpath }) => [path, jsonpath ?? null]),
    [
      ["extension/package.json", "$.version"],
      ["extension/package-lock.json", "$.version"],
      ["extension/package-lock.json", "$.packages[''].version"],
      ["extension/public/manifest.json", "$.version"],
      ["docs/product/store-listing.md", null]
    ]
  );

  const workflow = await readFile(
    join(repositoryRoot, ".github/workflows/release.yml"),
    "utf8"
  );
  assert.match(workflow, /secrets\.RELEASE_PLEASE_TOKEN/);
  assert.match(workflow, /release_created == 'true'/);
  assert.match(workflow, /--draft=false/);
});

test("release notes extractor supports Release Please and legacy headings", async () => {
  const temporaryDirectory = await mkdtemp(join(tmpdir(), "snapinsight-release-"));
  const changelogPath = join(temporaryDirectory, "CHANGELOG.md");

  try {
    await writeFile(
      changelogPath,
      [
        "# Changelog",
        "",
        "## 0.3.0 (2026-08-13)",
        "",
        "### Features",
        "",
        "* Keep the model ready.",
        "",
        "## [0.2.7] - 2026-08-13",
        "",
        "### Added",
        "",
        "- Add release automation.",
        ""
      ].join("\n"),
      "utf8"
    );

    const current = await execFileAsync(
      process.execPath,
      ["scripts/extract-release-notes.mjs", "0.3.0", changelogPath],
      { cwd: extensionRoot }
    );
    assert.match(current.stdout, /Keep the model ready/);
    assert.doesNotMatch(current.stdout, /Add release automation/);

    const legacy = await execFileAsync(
      process.execPath,
      ["scripts/extract-release-notes.mjs", "0.2.7", changelogPath],
      { cwd: extensionRoot }
    );
    assert.match(legacy.stdout, /Add release automation/);
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
});
