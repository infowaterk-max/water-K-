import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const policyPath = path.resolve('deploy/release-risk-policy.json');
const policy = JSON.parse(readFileSync(policyPath, 'utf8'));

function globToRegExp(glob) {
  let out = '^';
  for (let i = 0; i < glob.length; i += 1) {
    const ch = glob[i];
    if (ch === '*') {
      const next = glob[i + 1];
      if (next === '*') {
        i += 1;
        if (glob[i + 1] === '/') {
          i += 1;
          out += '(?:.*/)?';
        } else {
          out += '.*';
        }
      } else {
        out += '[^/]*';
      }
    } else if (ch === '?') {
      out += '[^/]';
    } else if ('\\.^$+{}()|[]'.includes(ch)) {
      out += `\\${ch}`;
    } else {
      out += ch;
    }
  }
  out += '$';
  return new RegExp(out);
}

const neutralMatchers = policy.neutralPatterns.map(globToRegExp);
const subsystemMatchers = policy.subsystems.map((subsystem) => ({
  ...subsystem,
  matchers: subsystem.patterns.map(globToRegExp),
}));

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

function resolveBase() {
  const explicitSha = process.env.RELEASE_BASE_SHA?.trim();
  if (explicitSha && !/^0+$/.test(explicitSha)) {
    try {
      git(['cat-file', '-e', `${explicitSha}^{commit}`]);
      return explicitSha;
    } catch {}
  }

  const explicitRef = process.env.RELEASE_BASE_REF?.trim();
  if (explicitRef) {
    try {
      git(['cat-file', '-e', `${explicitRef}^{commit}`]);
      return explicitRef;
    } catch {}
  }

  for (const candidate of ['origin/main', 'main', 'HEAD^']) {
    try {
      git(['cat-file', '-e', `${candidate}^{commit}`]);
      return candidate;
    } catch {}
  }

  throw new Error('RELEASE_RISK_BASE_UNAVAILABLE');
}

function resolveHead() {
  const explicit = process.env.RELEASE_HEAD_SHA?.trim();
  if (explicit && !/^0+$/.test(explicit)) {
    try {
      git(['cat-file', '-e', `${explicit}^{commit}`]);
      return explicit;
    } catch {}
  }
  return git(['rev-parse', 'HEAD']);
}

const base = resolveBase();
const releaseHead = resolveHead();
let mergeBase = base;
try {
  mergeBase = git(['merge-base', releaseHead, base]);
} catch {}

const diff = git(['diff', '--name-only', '--diff-filter=ACMR', `${mergeBase}..${releaseHead}`]);
const changedFiles = diff ? diff.split('\n').filter(Boolean) : [];

const classified = [];
for (const file of changedFiles) {
  if (neutralMatchers.some((matcher) => matcher.test(file))) {
    classified.push({ file, subsystem: 'evidence-neutral', risk: 'neutral', points: 0 });
    continue;
  }

  const match = subsystemMatchers.find((subsystem) =>
    subsystem.matchers.some((matcher) => matcher.test(file)),
  );
  const risk = match?.risk ?? policy.fallback.risk;
  const subsystem = match?.name ?? policy.fallback.subsystem;
  classified.push({
    file,
    subsystem,
    risk,
    points: policy.riskWeights[risk],
  });
}

const scoredSubsystems = [...new Map(
  classified
    .filter((item) => item.points > 0)
    .map((item) => [item.subsystem, { subsystem: item.subsystem, risk: item.risk, points: item.points }]),
).values()];

const score = scoredSubsystems.reduce((sum, item) => sum + item.points, 0);
const highRisk = scoredSubsystems.filter((item) => item.risk === 'high');
const violations = [];
const head = releaseHead;
const changeImpactPath = path.resolve('artifacts/shoperation-quality/change-impact.json');
let changeImpact = null;
if (existsSync(changeImpactPath)) {
  try {
    changeImpact = JSON.parse(readFileSync(changeImpactPath, 'utf8'));
  } catch {
    violations.push('Atlas change-impact evidence is unreadable');
  }
} else {
  violations.push('Atlas change-impact evidence unavailable');
}
if (changeImpact) {
  if (changeImpact.contract !== 'shoporation.change-impact.v1') {
    violations.push(`Atlas change-impact contract invalid: ${changeImpact.contract ?? 'missing'}`);
  }
  if (changeImpact.decision !== 'PASS') {
    violations.push('Atlas change-impact decision is not PASS');
  }
  if (changeImpact.sourceCommit && changeImpact.sourceCommit !== head) {
    violations.push(`Atlas change-impact source SHA ${changeImpact.sourceCommit} does not match release HEAD ${head}`);
  }
  const expectedImpactFiles = changedFiles.filter((file) => file !== 'quality/development/active-plan.json').sort();
  const evidencedImpactFiles = [...(changeImpact.changedFiles ?? [])].sort();
  if (JSON.stringify(expectedImpactFiles) !== JSON.stringify(evidencedImpactFiles)) {
    violations.push('Atlas change-impact file set does not match the release diff');
  }
}

if (score > policy.maxPoints) {
  violations.push(`risk score ${score} exceeds maximum ${policy.maxPoints}`);
}
if (scoredSubsystems.length > policy.maxSubsystems) {
  violations.push(
    `subsystem count ${scoredSubsystems.length} exceeds maximum ${policy.maxSubsystems}`,
  );
}
if (highRisk.length > 1) {
  violations.push(`multiple high-risk subsystems in one release: ${highRisk.map((x) => x.subsystem).join(', ')}`);
}
if (highRisk.length === 1 && scoredSubsystems.length > 1) {
  violations.push(
    `high-risk subsystem ${highRisk[0].subsystem} must be isolated from other substantive subsystems`,
  );
}

const report = {
  version: 1,
  policyVersion: policy.version,
  base,
  mergeBase,
  head,
  score,
  maxPoints: policy.maxPoints,
  subsystemCount: scoredSubsystems.length,
  maxSubsystems: policy.maxSubsystems,
  subsystems: scoredSubsystems,
  changedFiles: classified,
  atlasClosure: changeImpact ? {
    contract: changeImpact.contract,
    sourceCommit: changeImpact.sourceCommit ?? null,
    directDomains: changeImpact.directDomains ?? [],
    directAuthorities: changeImpact.directAuthorities ?? [],
    domains: changeImpact.closure?.domains ?? [],
    authorities: changeImpact.closure?.authorities ?? [],
    truthKeys: changeImpact.closure?.truthKeys ?? [],
    evidenceObligations: changeImpact.closure?.evidenceObligations ?? [],
    knownFailureIds: changeImpact.closure?.knownFailureIds ?? [],
    regressionTests: changeImpact.closure?.regressionTests ?? [],
  } : null,
  decision: violations.length === 0 ? 'PASS' : 'BLOCK',
  violations,
};

mkdirSync('artifacts', { recursive: true });
writeFileSync('artifacts/release-risk-budget.json', `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.log(`Release risk budget: ${report.decision} — ${score}/${policy.maxPoints} points, ${scoredSubsystems.length}/${policy.maxSubsystems} subsystems.`);
for (const subsystem of scoredSubsystems) {
  console.log(`- ${subsystem.subsystem}: ${subsystem.risk} (${subsystem.points})`);
}
if (violations.length > 0) {
  for (const violation of violations) console.error(`RELEASE_RISK_BUDGET_FAILED: ${violation}`);
  process.exit(1);
}
