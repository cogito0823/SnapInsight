import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, lstatSync } from 'node:fs';
import { posix as path } from 'node:path';
import { fileURLToPath } from 'node:url';

const specPaths = ['docs/governance/documentation.md', 'docs/governance/workflow.md'];
const checkerPath = 'scripts/governance/check.mjs';
const bridgePath = '.cursor/rules/project-entry.mdc';
const bridge = '---\ndescription: Read the shared repository instructions\nalwaysApply: true\n---\n\nRead and follow the repository-root AGENTS.md before project work.\n';
const entryRules = ['DOC-APPROVAL', 'DOC-CURRENT', 'FLOW-START', 'FLOW-VERIFY', 'FLOW-CLOSE'];
const buckets = ['current', 'proposed', 'records', 'historical'];
const decode = new TextDecoder('utf-8', { fatal: true });
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const excluded = (file) => file.split('/').some((part) => ['node_modules', '.git', 'dist', 'build', 'release'].includes(part));
const git = (...args) => execFileSync('git', args, { maxBuffer: 32 * 1024 * 1024 });
const gitText = (...args) => decode.decode(git(...args)).trim();
const nulEntries = (value) => decode.decode(value).split('\0').filter(Boolean);
const fileMode = (mode) => mode === '100644' || mode === '100755';

function argumentsForRun(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    if (!['--mode', '--ref'].includes(key) || !value || value.startsWith('-') || key in options) {
      throw new Error('Usage: check.mjs [--mode worktree|index|commit] [--ref <commit>]');
    }
    options[key] = value;
  }
  const mode = options['--mode'] ?? 'worktree';
  if (!['worktree', 'index', 'commit'].includes(mode) || (options['--ref'] && mode !== 'commit')) {
    throw new Error('Use --ref only with commit mode and select a valid mode.');
  }
  return { mode, ref: options['--ref'] ?? 'HEAD' };
}

function snapshot({ mode, ref }) {
  const entries = new Map();
  let name = 'mutable preview';
  let finish = () => {};
  if (mode === 'worktree') {
    for (const file of new Set(nulEntries(git('ls-files', '--cached', '--others', '--exclude-standard', '-z')))) {
      if (excluded(file)) continue;
      let info;
      try {
        info = lstatSync(file);
      } catch (error) {
        if (error.code === 'ENOENT' || error.code === 'ENOTDIR') continue;
        throw error;
      }
      if (info.isFile() || info.isSymbolicLink()) {
        // Git may still track a directory's previous parent as a symlink. Never read through it.
        const parts = file.split('/');
        const safe = info.isFile() && parts.slice(0, -1).every((_, i) => lstatSync(parts.slice(0, i + 1).join('/')).isDirectory());
        entries.set(file, { regular: safe });
      }
    }
  } else {
    if (mode === 'index') {
      const unmerged = git('ls-files', '--unmerged', '-z');
      if (unmerged.length) throw new Error('Resolve index conflicts before checking.');
    }
    const commit = mode === 'commit' ? gitText('rev-parse', '--verify', '--end-of-options', `${ref}^{commit}`) : null;
    const tree = commit ? gitText('rev-parse', `${commit}^{tree}`) : gitText('write-tree');
    if (!commit) {
      finish = () => {
        if (gitText('write-tree') !== tree) throw new Error('Index changed during verification. Run the check again.');
      };
    }
    name = commit ? `${commit} (tree ${tree})` : `tree ${tree}`;
    for (const row of nulEntries(git('ls-tree', '-r', '-z', tree))) {
      const tab = row.indexOf('\t');
      const file = row.slice(tab + 1);
      if (excluded(file)) continue;
      const [permissions, , oid] = row.slice(0, tab).split(' ');
      entries.set(file, { regular: fileMode(permissions), oid });
    }
  }
  const directories = new Set(['.']);
  for (const file of entries.keys()) {
    for (let dir = path.dirname(file); dir !== '.' && !directories.has(dir); dir = path.dirname(dir)) directories.add(dir);
  }
  const cache = new Map();
  function bytes(file) {
    const entry = entries.get(file);
    if (!entry?.regular) throw new Error(`Expected a regular file at ${file}.`);
    if (!cache.has(file)) cache.set(file, entry.oid ? git('cat-file', 'blob', entry.oid) : readFileSync(file));
    return cache.get(file);
  }
  if (mode !== 'worktree' && !bytes(checkerPath).equals(readFileSync(fileURLToPath(import.meta.url)))) {
    throw new Error('Checker differs from the selected snapshot. Run its matching checkout.');
  }
  return { entries, directories, bytes, text: (file) => decode.decode(bytes(file)), name, finish };
}

function plainObject(value, fields) {
  return value && typeof value === 'object' && !Array.isArray(value) &&
    Object.keys(value).length === fields.length && fields.every((key) => Object.hasOwn(value, key));
}

function readJson(tree, file) {
  const raw = tree.text(file);
  const value = JSON.parse(raw);
  const stack = [];
  for (const match of raw.matchAll(/"(?:[^"\\]|\\.)*"\s*:?|[{}\[\]]/gs)) {
    const token = match[0];
    if (token === '{' || token === '[') stack.push(token === '{' ? new Set() : null);
    else if (token === '}' || token === ']') stack.pop();
    else if (token.endsWith(':')) {
      const key = JSON.parse(token.slice(0, -1));
      const keys = stack.at(-1);
      if (keys.has(key)) throw new Error(`${file}: duplicate JSON key ${key}.`);
      keys.add(key);
    }
  }
  return value;
}

function repoPath(value) {
  return typeof value === 'string' && !/[\\\0\r\n]/.test(value) && value.split('/').every((part) => part && part !== '.' && part !== '..');
}

function configFor(tree) {
  const file = 'docs/governance/project.json';
  const config = readJson(tree, file);
  const fileKeys = ['entry', 'guide', 'index'];
  const rootKeys = ['formalRoots', 'referenceRoots'];
  const listFileKeys = ['formalFiles', 'referenceFiles'];
  const keys = [...fileKeys, ...rootKeys, ...listFileKeys, 'schemaVersion', 'cursorBridge'];
  if (!plainObject(config, keys) || config.schemaVersion !== 1 || config.entry !== 'AGENTS.md' || typeof config.cursorBridge !== 'boolean') {
    throw new Error(`${file}: expected project configuration schemaVersion 1.`);
  }
  for (const key of [...rootKeys, ...listFileKeys]) {
    if (!Array.isArray(config[key]) || !config[key].every((p) => repoPath(p) && !excluded(p))) throw new Error(`${file}: invalid ${key}.`);
  }
  for (const key of rootKeys) {
    for (const root of config[key]) if (!tree.directories.has(root)) throw new Error(`${file}: missing configured directory ${root}.`);
  }
  for (const p of [...fileKeys.map((key) => config[key]), ...listFileKeys.flatMap((key) => config[key])]) {
    if (!repoPath(p) || !p.endsWith('.md') || !tree.entries.get(p)?.regular) throw new Error(`${file}: expected Markdown file ${p}.`);
  }
  const expand = (roots, files) => new Set([...files, ...[...tree.entries.keys()].filter((p) => p.endsWith('.md') && roots.some((root) => p.startsWith(`${root}/`)))]);
  const formal = expand(config.formalRoots, config.formalFiles);
  const references = expand(config.referenceRoots, config.referenceFiles);
  if (formal.has(config.guide) || formal.has(config.index) || formal.has(config.entry)) throw new Error(`${file}: keep entry, index and guide outside the formal set.`);
  return { ...config, formal, references };
}

function checkSources(tree, report) {
  const file = 'docs/governance/upstream.json';
  const manifest = readJson(tree, file);
  if (!plainObject(manifest, ['schemaVersion', 'mode', 'source', 'files']) || manifest.schemaVersion !== 1 || !Array.isArray(manifest.files)) {
    throw new Error(`${file}: expected source configuration schemaVersion 1.`);
  }
  function validSource() {
    if (manifest.mode === 'local') return manifest.source === null;
    if (manifest.mode !== 'upstream' || !plainObject(manifest.source, ['repository', 'revision', 'release'])) return false;
    const { repository, revision, release } = manifest.source;
    if (typeof repository !== 'string' || !repository.startsWith('https://') || typeof revision !== 'string' ||
        !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(revision) || (release !== null && typeof release !== 'string')) return false;
    const url = URL.parse(repository);
    return url?.protocol === 'https:' && url.hostname && !url.username && !url.password && !url.search && !url.hash;
  }
  if (!validSource()) throw new Error(`${file}: invalid mode or source revision.`);
  const targets = new Set();
  const sources = new Set();
  const inManagedArea = (p) => /^docs\/governance\/.+\.md$|^scripts\/governance\/.+\.mjs$/.test(p);
  for (const row of manifest.files) {
    if (!plainObject(row, ['sourcePath', 'targetPath', 'sha256']) || !repoPath(row.sourcePath) || !repoPath(row.targetPath) ||
        !inManagedArea(row.targetPath) || excluded(row.targetPath) || !/^[a-f0-9]{64}$/.test(row.sha256) || targets.has(row.targetPath) || sources.has(row.sourcePath)) {
      throw new Error(`${file}: invalid or duplicate managed file entry.`);
    }
    sources.add(row.sourcePath);
    targets.add(row.targetPath);
    if (!tree.entries.get(row.targetPath)?.regular || digest(tree.bytes(row.targetPath)) !== row.sha256) {
      report('SRC', row.targetPath, 0, 'Managed file is missing or differs from its SHA-256. Review its adoption or update.');
    }
  }
  for (const p of [...specPaths, checkerPath, ...[...tree.entries.keys()].filter(inManagedArea)]) {
    if (!targets.has(p)) report('SRC', p, 0, 'Register the managed file in upstream.json.');
  }
  return targets;
}

const markdownLink = /^\[([^\]\r\n]+)\]\(([^\s()]+)\)$/;
const metadataKeys = ['Type', 'Status', 'Applicability', 'Approval', 'Superseded-By'];
const allowedStates = {
  decision: { proposed: ['Draft', 'In Review'], current: ['Accepted'], historical: ['Draft', 'In Review', 'Accepted', 'Rejected', 'Superseded'] },
  reference: { proposed: ['Draft', 'In Discussion', 'In Review'], current: ['Approved', 'Implemented'], historical: ['Draft', 'In Discussion', 'In Review', 'Approved', 'Implemented', 'Superseded'] },
  record: { current: ['Draft', 'In Review', 'Approved', 'Implemented'], historical: ['Draft', 'In Review', 'Approved', 'Implemented'] },
};

function metadata(file, content, report) {
  const lines = content.split(/\r?\n/);
  const fields = {};
  if (!/^# \S/.test(lines[0])) report('DOC', file, 1, 'Start the document with an H1.');
  for (let i = 1; i < lines.length && !/^##\s/.test(lines[i]); i++) {
    const match = /^- (Type|Status|Applicability|Approval|Superseded-By): (.+)$/.exec(lines[i]);
    if (!match) continue;
    if (match[1] in fields) report('DOC', file, i + 1, `Remove duplicate ${match[1]}.`);
    fields[match[1]] = match[2];
  }
  for (const key of metadataKeys) if (!fields[key]) report('DOC', file, 1, `Add the ${key} metadata field.`);
  const { Type: type, Status: status, Applicability: applies, Approval: approval, 'Superseded-By': replacement } = fields;
  const rfc = /^# RFC-/.test(lines[0]) || /^RFC-/.test(path.basename(file));
  const subtype = type === 'normative' ? (rfc ? 'decision' : 'reference') : type;
  const states = Object.hasOwn(allowedStates, subtype) ? allowedStates[subtype][applies] : undefined;
  if (!['normative', 'record'].includes(type) || (rfc && type === 'record') || !Array.isArray(states) || !states.includes(status)) {
    report('DOC', file, 1, 'Use a permitted Type, Status and Applicability combination.');
  }
  const evidenceRequired = (type === 'normative' && applies === 'current') || (type === 'record' && status === 'Approved');
  const evidence = markdownLink.exec(approval ?? '')?.[2];
  if ((approval !== 'none' && !evidence) || (evidenceRequired && !evidence)) report('DOC', file, 1, 'Provide the required approval reference as a Markdown link.');
  if (replacement && (status === 'Superseded' ? !markdownLink.test(replacement) : replacement !== 'none')) {
    report('DOC', file, 1, 'Set Superseded-By only for Superseded documents and link the current replacement.');
  }
  return { type, applies, status, evidence, replacement: markdownLink.exec(replacement ?? '')?.[2] };
}

function localTarget(file, raw) {
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw) || raw.startsWith('//')) return null;
  const [pathname, fragment] = raw.split('#', 2).map(decodeURIComponent);
  if (pathname.startsWith('/') || /[\\\0\r\n]/.test(pathname)) throw new Error('Use a relative path inside the repository.');
  const target = pathname ? path.normalize(path.join(path.dirname(file), pathname)).replace(/\/$/, '') : file;
  if (target === '..' || target.startsWith('../')) throw new Error('Link leaves the repository.');
  return { target, fragment };
}

function checkIndex(tree, file, formal, report) {
  const seen = new Set();
  const sections = new Set();
  let active;
  for (const [index, line] of tree.text(file).split(/\r?\n/).entries()) {
    const marker = /^<!-- governance:(current|proposed|records|historical):(start|end) -->$/.exec(line);
    if (marker) {
      const [, name, direction] = marker;
      if (direction === 'start' && !active && !sections.has(name)) {
        active = name;
        sections.add(name);
      } else if (direction === 'end' && name === active) active = undefined;
      else report('DOC', file, index + 1, 'Fix duplicate or unmatched index marker.');
      continue;
    }
    if (!active || !line.trim()) continue;
    try {
      const raw = line.startsWith('- ') && markdownLink.exec(line.slice(2))?.[2];
      const target = raw && !raw.includes('#') && localTarget(file, raw)?.target;
      const info = formal.get(target);
      if (!info || seen.has(target)) throw new Error('Link each formal document exactly once in the index.');
      const expected = info.applies === 'current' && info.type === 'record' ? 'records' : info.applies;
      if (active !== expected) report('DOC', file, index + 1, `Place ${target} in the ${expected} section.`);
      seen.add(target);
    } catch (error) {
      report('DOC', file, index + 1, error.message);
    }
  }
  if (active || sections.size !== buckets.length) report('DOC', file, 1, 'Include all four balanced index sections.');
  for (const filePath of formal.keys()) if (!seen.has(filePath)) report('DOC', filePath, 1, 'Add this formal document to the index.');
}

function proseLines(content) {
  // Keep line numbers through comments, fenced examples, and inline code.
  let fence;
  let comment = false;
  return content.split(/\r?\n/).map((original) => {
    if (!comment) {
      const boundary = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(original);
      if (fence) {
        if (boundary?.[1][0] === fence[0] && boundary[1].length >= fence.length && !boundary[2].trim()) fence = undefined;
        return '';
      }
      if (boundary) {
        fence = boundary[1];
        return '';
      }
      if (/^(?: {4}|\t)/.test(original) && !/^\s*(?:[-*+] |\[)/.test(original)) return '';
    }
    let line = '';
    let rest = original;
    while (rest) {
      if (comment) {
        const end = rest.indexOf('-->');
        if (end < 0) break;
        comment = false;
        rest = rest.slice(end + 3);
      } else {
        const token = /<!--|`+/.exec(rest);
        if (!token) { line += rest; break; }
        line += rest.slice(0, token.index);
        rest = rest.slice(token.index + token[0].length);
        if (token[0] === '<!--') comment = true;
        else {
          const end = [...rest.matchAll(/`+/g)].find((run) => run[0].length === token[0].length);
          if (end) { line += ' '; rest = rest.slice(end.index + end[0].length); }
          else line += token[0];
        }
      }
    }
    return line;
  });
}

function checkLinks(tree, file, report) {
  const lines = proseLines(tree.text(file));
  const references = new Map();
  const labelKey = (label) => label.trim().replace(/\s+/g, ' ').toLowerCase();
  const links = new Set();
  function verify(value, line) {
    try {
      if (/^https:\/\//i.test(value)) {
        if (!URL.canParse(value)) throw new Error('Invalid HTTPS URL.');
        return;
      }
      const local = localTarget(file, value);
      if (!local) throw new Error('Use a relative repository path or an HTTPS URL.');
      const { target, fragment } = local;
      const entry = tree.entries.get(target);
      if (entry ? !entry.regular : !tree.directories.has(target)) throw new Error(`Target ${target} is missing or is not a regular file.`);
      if (fragment && (!target.endsWith('.md') || !tree.entries.get(target)?.regular ||
          !proseLines(tree.text(target)).some((row) => row.includes(`<a id="${fragment}"></a>`)))) {
        throw new Error(`Add explicit anchor ${fragment} to ${target} or remove the fragment.`);
      }
      links.add(target);
    } catch (error) {
      report('LINK', file, line, `${value}: ${error.message}`);
    }
  }
  const definitions = new Set();
  for (const [i, text] of lines.entries()) {
    const def = /^ {0,3}\[([^\]]+)\]:\s*(.*)$/.exec(text);
    if (!def) continue;
    definitions.add(i);
    const raw = /^(?:<([^>]+)>|([^\s()]+))(?:\s+"[^"]*")?\s*$/.exec(def[2]);
    const key = labelKey(def[1]);
    if (!raw || !key || references.has(key)) report('LINK', file, i + 1, 'Fix unsupported or duplicate link definition.');
    else { references.set(key, raw[1] ?? raw[2]); verify(references.get(key), i + 1); }
  }
  for (const [i, text] of lines.entries()) {
    if (definitions.has(i)) continue;
    if (/<[a-z][^>]*\b(?:href|src)\s*=/i.test(text)) report('LINK', file, i + 1, 'Use a Markdown link instead of raw HTML href/src.');
    const pattern = /(?<!\\)\[(?:[^\]\\]|\\.)+\](\(|\[)/g;
    for (const match of text.matchAll(pattern)) {
      const tail = text.slice(match.index + match[0].length);
      if (match[1] === '(') {
        const raw = /^(?:<([^>]+)>|([^\s()]+))(?:\s+"[^"]*")?\)/.exec(tail);
        if (!raw) report('LINK', file, i + 1, 'Use a supported inline link target. Encode spaces or parentheses.');
        else verify(raw[1] ?? raw[2], i + 1);
      } else {
        const ref = /^([^\]]*)\]/.exec(tail);
        const label = ref && labelKey(ref[1] || match[0].slice(1, -2));
        if (!label || !references.has(label)) report('LINK', file, i + 1, 'Provide a defined Markdown link reference.');
      }
    }
    for (const auto of text.matchAll(/<(https:\/\/[^ >]+)>/g)) verify(auto[1], i + 1);
  }
  return links;
}

function run() {
  const options = argumentsForRun(process.argv.slice(2));
  if (gitText('rev-parse', '--show-prefix') !== '') throw new Error('Run the checker from the repository root.');
  const tree = snapshot(options);
  const issues = new Map();
  function report(rule, file, line, message) {
    const issue = { rule, file, line, message };
    issues.set(JSON.stringify(issue), issue);
  }
  const config = configFor(tree);
  const managed = checkSources(tree, report);
  for (const p of tree.entries.keys()) {
    const name = path.basename(p);
    const isExtraInstruction = /^AGENTS(?:\.override)?\.md$/i.test(name) && p !== config.entry;
    const isCursorRule = /(?:^|\/)\.cursor\/rules\/.+\.mdc$/i.test(p);
    if (isExtraInstruction || (isCursorRule && (!config.cursorBridge || p !== bridgePath))) {
      report('ENTRY', p, 1, 'Remove the extra instruction entry. Use the shared root entry.');
    }
  }
  if (config.cursorBridge && (!tree.entries.get(bridgePath)?.regular || tree.text(bridgePath).replaceAll('\r\n', '\n') !== bridge)) {
    report('ENTRY', bridgePath, 1, 'Use the fixed compatibility bridge template.');
  }
  for (const id of entryRules) {
    if (!tree.text(config.entry).includes(id) || !specPaths.some((p) => tree.entries.get(p)?.regular && proseLines(tree.text(p)).some((line) => line.includes(`<a id="${id}"></a>`)))) {
      report('ENTRY', config.entry, 1, `Reference ${id} and define its explicit anchor in the common rules.`);
    }
  }
  for (const section of ['Verification', 'Exceptions']) {
    if (!proseLines(tree.text(config.guide)).includes(`## ${section}`)) report('ENTRY', config.guide, 1, `Add the ${section} section.`);
  }
  const formal = new Map();
  for (const file of config.formal) {
    if (!tree.entries.get(file)?.regular) report('DOC', file, 1, 'Formal documents must be regular files.');
    else if (managed.has(file)) report('DOC', file, 1, 'Keep vendor rules outside the formal document set.');
    else formal.set(file, metadata(file, tree.text(file), report));
  }
  for (const [file, doc] of formal) {
    if (doc.evidence) {
      try {
        const evidence = localTarget(file, doc.evidence);
        if (evidence && formal.get(evidence.target)?.type !== 'record') {
          report('DOC', file, 1, 'Link local approval evidence to a formal record.');
        }
      } catch { /* The link check reports the malformed target. */ }
    }
    if (!doc.replacement) continue;
    let replacement;
    try {
      const link = localTarget(file, doc.replacement);
      if (!link?.fragment) replacement = formal.get(link?.target);
    } catch { /* The link check reports the specific invalid target. */ }
    if (replacement?.type !== 'normative' || replacement.applies !== 'current') report('DOC', file, 1, 'Link to a current normative replacement.');
  }
  checkIndex(tree, config.index, formal, report);
  const inputs = new Set([...config.formal, ...config.references, ...specPaths, config.entry, config.guide, config.index]);
  for (const file of inputs) {
    if (!tree.entries.get(file)?.regular) { report('LINK', file, 1, 'Expected a regular Markdown input.'); continue; }
    const links = checkLinks(tree, file, report);
    if (file === config.entry) for (const required of [...specPaths, config.guide, config.index]) {
      if (!links.has(required)) report('ENTRY', file, 1, `Link to ${required}.`);
    }
  }
  tree.finish();
  console.log(`Project governance · ${options.mode} · ${tree.name}`);
  const ordered = [...issues.values()].sort((a, b) => a.file.localeCompare(b.file, 'en') || a.line - b.line || a.rule.localeCompare(b.rule, 'en') || a.message.localeCompare(b.message, 'en'));
  for (const { rule, file, line, message } of ordered) console.error(`${rule} ${file}${line ? `:${line}` : ''} ${message}`);
  if (ordered.length) {
    console.error(`${ordered.length} issue(s) across ${inputs.size} Markdown inputs.`);
    return 1;
  }
  console.log(`${formal.size} formal documents, ${inputs.size} Markdown inputs and ${managed.size} managed files passed.`);
  return 0;
}

try {
  process.exitCode = run();
} catch (error) {
  console.error(`CFG ${error.message}`);
  process.exitCode = 2;
}
