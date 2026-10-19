#!/usr/bin/env node
// [nocturne] Production dependency licence gate.
//
// Usage: node bin/ci/check-licenses.js <dir> [<dir> ...]
//
// Runs `pnpm licenses list --prod --json` in every directory, prints a summary,
// writes ci-logs/licenses.json and appends a Markdown table to the GitHub step
// summary. Fails when a production dependency is under a strong copyleft or
// source-available licence that is incompatible with MIT distribution.
'use strict';

const {execFileSync} = require('child_process');
const fs = require('fs');
const path = require('path');

const DENY = [/\bAGPL/i, /(^|[^L])GPL/i, /\bSSPL/i, /\bBUSL/i, /Commons[- ]Clause/i];
const REVIEW = [/\bLGPL/i, /\bMPL/i, /\bEPL/i, /\bCDDL/i, /UNKNOWN/i, /UNLICENSED/i, /SEE LICENSE/i];

function classify(expression) {
  const license = String(expression || 'UNKNOWN');
  // A disjunction is acceptable when at least one alternative is acceptable.
  const alternatives = license
    .replace(/[()]/g, '')
    .split(/\s+OR\s+/i)
    .map((s) => s.trim());
  const verdicts = alternatives.map((alt) => {
    if (DENY.some((re) => re.test(alt))) return 'deny';
    if (REVIEW.some((re) => re.test(alt))) return 'review';
    return 'ok';
  });
  if (verdicts.includes('ok')) return 'ok';
  if (verdicts.includes('review')) return 'review';
  return 'deny';
}

function listLicenses(dir) {
  const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
  const out = execFileSync(pnpm, ['licenses', 'list', '--prod', '--json'], {
    cwd: dir,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024
  });
  const parsed = JSON.parse(out || '{}');
  const rows = [];
  for (const [license, packages] of Object.entries(parsed)) {
    for (const pkg of packages) {
      const versions = pkg.versions || (pkg.version ? [pkg.version] : []);
      rows.push({dir, name: pkg.name, versions, license: pkg.license || license});
    }
  }
  return rows;
}

function main() {
  const dirs = process.argv.slice(2);
  if (dirs.length === 0) dirs.push('.');

  const rows = dirs.flatMap((dir) => listLicenses(path.resolve(dir)));
  const byVerdict = {ok: [], review: [], deny: []};
  for (const row of rows) byVerdict[classify(row.license)].push(row);

  const counts = {};
  for (const row of rows) counts[row.license] = (counts[row.license] || 0) + 1;

  fs.mkdirSync('ci-logs', {recursive: true});
  fs.writeFileSync('ci-logs/licenses.json', JSON.stringify({counts, rows}, null, 2));

  const lines = ['### Production dependency licences', '', '| Licence | Packages |', '| --- | ---: |'];
  for (const [license, count] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
    lines.push(`| ${license} | ${count} |`);
  }
  const describe = (row) => `- \`${row.name}@${row.versions.join(', ')}\` — ${row.license}`;
  if (byVerdict.review.length) {
    lines.push('', '#### Needs review (not blocking)', ...byVerdict.review.map(describe));
  }
  if (byVerdict.deny.length) {
    lines.push('', '#### Blocked', ...byVerdict.deny.map(describe));
  }
  const summary = lines.join('\n') + '\n';
  console.log(summary);
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
  }

  for (const row of byVerdict.review) {
    console.log(`::warning title=Licence needs review::${row.name}@${row.versions.join(', ')} is ${row.license}`);
  }
  if (byVerdict.deny.length) {
    for (const row of byVerdict.deny) {
      console.log(`::error title=Incompatible licence::${row.name}@${row.versions.join(', ')} is ${row.license}`);
    }
    process.exit(1);
  }
  console.log(`Checked ${rows.length} production packages in ${dirs.join(', ')}.`);
}

main();
