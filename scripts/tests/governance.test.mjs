import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const root = fileURLToPath(new URL('../../', import.meta.url));
const checker = 'scripts/governance/check.mjs';
const record = '# Task log\n\n- Type: record\n- Status: Draft\n- Applicability: current\n- Approval: none\n- Superseded-By: none\n';
const reference = '# Current reference\n\n- Type: normative\n- Status: Approved\n- Applicability: current\n- Approval: [Receipt](log.md)\n- Superseded-By: none\n';
const blocks = (section, contents) => `<!-- governance:${section}:start -->\n${contents}<!-- governance:${section}:end -->\n`;

function setup(t) {
  const repo = mkdtempSync(join(tmpdir(), 'snapinsight-governance-'));
  t.after(() => rmSync(repo, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', args, { cwd: repo, stdio: 'pipe', encoding: 'utf8' }).trim();
  const put = (file, text) => {
    const target = join(repo, file);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, text);
  };
  const read = (file) => readFileSync(join(repo, file), 'utf8');
  git('init', '-q');
  git('config', 'user.name', 'Governance test');
  git('config', 'user.email', 'governance@example.invalid');
  git('config', 'core.autocrlf', 'false');
  for (const file of [checker, 'AGENTS.md', 'docs/governance/documentation.md', 'docs/governance/workflow.md', 'docs/governance/upstream.json']) {
    mkdirSync(dirname(join(repo, file)), { recursive: true });
    copyFileSync(join(root, file), join(repo, file));
  }
  const adjustConfig = (update) => {
    const file = 'docs/governance/project.json';
    const config = JSON.parse(read(file));
    update(config);
    put(file, JSON.stringify(config));
  };
  put('docs/governance/project.json', JSON.stringify({
    schemaVersion: 1, entry: 'AGENTS.md', guide: 'docs/contributing.md', index: 'docs/README.md',
    formalRoots: ['docs/decisions'], formalFiles: [], referenceRoots: [], referenceFiles: [], cursorBridge: false,
  }));
  put('docs/contributing.md', '# Generic project\n\n## Verification\n\nInspect the output.\n\n## Exceptions\n\nNone.\n');
  put('docs/decisions/log.md', record);
  put('docs/decisions/current.md', reference);
  const index = '# Navigation\n\n' + blocks('current', '- [Reference](decisions/current.md)\n') + blocks('proposed', '') +
    blocks('records', '- [Log](decisions/log.md)\n') + blocks('historical', '');
  put('docs/README.md', index);
  git('add', '.');
  git('-c', 'commit.gpgsign=false', 'commit', '--no-verify', '-qm', 'Fixture');
  function check(code, expected, ...args) {
    const result = spawnSync(process.execPath, [checker, ...args], { cwd: repo, encoding: 'utf8' });
    if (result.error) throw result.error;
    const output = result.stdout + result.stderr;
    assert.equal(result.status, code, output);
    if (expected) assert.match(output, expected);
    return output;
  }
  return { repo, git, put, read, index, adjustConfig, check };
}

test('generic offline project passes worktree, index and commit checks', (t) => {
  const { check, git } = setup(t);
  check(0, /worktree.*mutable preview/);
  check(0, /index.*tree [a-f\d]+/, '--mode', 'index');
  const revision = git('rev-parse', 'HEAD');
  check(0, new RegExp(revision), '--mode', 'commit', '--ref', revision);
});

test('partial staging checks the actual intended snapshot', (t) => {
  const { check, git, put } = setup(t);
  put('docs/decisions/current.md', reference.replace('Approved', 'Draft'));
  git('add', 'docs/decisions/current.md');
  put('docs/decisions/current.md', reference);
  check(0, /worktree/);
  check(1, /DOC.*combination/, '--mode', 'index');
  check(0, /commit/, '--mode', 'commit');
});

test('new and renamed documents are checked in their selected snapshot', (t) => {
  const { check, git, put, repo } = setup(t);
  put('docs/decisions/new.md', record);
  check(1, /new\.md.*Add this formal document/);
  check(0, /index/, '--mode', 'index');
  rmSync(join(repo, 'docs/decisions/new.md'));
  renameSync(join(repo, 'docs/decisions/log.md'), join(repo, 'docs/decisions/renamed.md'));
  git('add', '-A');
  check(1, /LINK.*log\.md.*missing/, '--mode', 'index');
});

test('source manifest detects managed-file drift and unknown schema', (t) => {
  const { read, put, check, adjustConfig } = setup(t);
  const file = 'docs/governance/workflow.md';
  put(file, read(file) + '\nEdited.\n');
  check(1, /SRC.*SHA-256/);
  adjustConfig((config) => { config.schemaVersion = 2; });
  check(2, /CFG.*schemaVersion/);
});

test('an upstream receipt fixes the local rule bytes to a selected revision', (t) => {
  const { read, put, check } = setup(t);
  const file = 'docs/governance/upstream.json';
  const data = JSON.parse(read(file));
  data.mode = 'upstream';
  data.source = { repository: 'https://example.invalid/governance', revision: 'a'.repeat(40), release: 'fixture' };
  put(file, JSON.stringify(data));
  check(0, /passed/);
  data.source.revision = 'latest';
  put(file, JSON.stringify(data));
  check(2, /CFG.*source revision/);
});

test('a proposal and an approved reference cannot share the current bucket', (t) => {
  const { check, put } = setup(t);
  put('docs/decisions/current.md', reference.replace('Approved', 'In Review').replace('current\n- Approval', 'proposed\n- Approval'));
  check(1, /Place docs\/decisions\/current\.md in the proposed section/);
  put('docs/decisions/current.md', reference.replace('[Receipt](log.md)', 'none'));
  check(1, /approval reference/);
});

test('only working formal approval evidence and non-cyclic replacements are accepted', (t) => {
  const { put, index, check } = setup(t);
  const prior = '# Historical contract\n\n- Type: normative\n- Status: Superseded\n- Applicability: historical\n- Approval: none\n';
  put('docs/README.md', index.replace(blocks('historical', ''), blocks('historical', '- [A](decisions/a.md)\n- [B](decisions/b.md)\n')));
  put('docs/decisions/a.md', prior + '- Superseded-By: [Replacement](current.md)\n');
  put('docs/decisions/b.md', prior + '- Superseded-By: [Replacement](current.md)\n');
  check(0, /passed/);
  put('docs/decisions/a.md', prior + '- Superseded-By: [B](b.md)\n');
  put('docs/decisions/b.md', prior + '- Superseded-By: [A](a.md)\n');
  check(1, /current normative replacement/);
  put('docs/decisions/current.md', reference.replace('[Receipt](log.md)', '[Self](current.md)'));
  check(1, /local approval evidence.*formal record/);
});

test('links preserve code examples and reject unsafe or unsupported targets', (t) => {
  const { put, check, repo } = setup(t);
  const example = record + '\n~~~md\n[example](missing.md)\n~~~\n\n`[example](missing.md)`\n\n[Reference][current]\n\n[current]: current.md\n';
  put('docs/decisions/log.md', example);
  check(0, /passed/);
  symlinkSync('current.md', join(repo, 'docs/decisions/alias.txt'));
  put('docs/decisions/log.md', example + '\n[Escape](../../../other)\n[Symlink](alias.txt)\n[Unknown][other]\n');
  const output = check(1, /Link leaves the repository/);
  assert.match(output, /alias\.txt.*not a regular file/);
  assert.match(output, /defined Markdown link reference/);
});

test('additional instruction files and non-template bridge text are rejected', (t) => {
  const { put, check, adjustConfig, repo } = setup(t);
  put('docs/AGENTS.override.md', '# Extra rule\n');
  check(1, /ENTRY.*AGENTS\.override\.md/);
  rmSync(join(repo, 'docs/AGENTS.override.md'));
  adjustConfig((config) => { config.cursorBridge = true; });
  const bridge = '---\ndescription: Read the shared repository instructions\nalwaysApply: true\n---\n\nRead and follow the repository-root AGENTS.md before project work.\n';
  const file = '.cursor/rules/project-entry.mdc';
  put(file, bridge);
  check(0, /passed/);
  put(file, bridge + '\nExtra rule.\n');
  check(1, /ENTRY.*fixed compatibility bridge/);
});

test('duplicate keys and checkout-checker mismatch fail explicitly', (t) => {
  const { put, read, check } = setup(t);
  const file = 'docs/governance/project.json';
  put(file, read(file).replace('{', '{"schemaVersion":1,'));
  check(2, /duplicate JSON key schemaVersion/);
  put(checker, read(checker) + '\n// Local rewrite.\n');
  check(2, /Checker differs/, '--mode', 'commit');
});
