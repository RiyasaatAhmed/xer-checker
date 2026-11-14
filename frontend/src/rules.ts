// What each check means to a scheduler, why it matters, and what to do when it's over the limit.
// The numbers come from the backend; these are only the words around them. Keyed by the check's ID.

export interface RuleText {
  name?: string // the problem, when the backend's name only names the topic: "No resources", not "Resources"
  short: string // one line under the rule's name
  problem?: { one: string; many: string } // what is wrong, after a count: "1 activity has …", "170 activities have …"
  impact: string // why it matters, in one line; blank when unknown
  action: string // what to do about it in P6
}

const TEXT: Record<string, RuleText> = {
  'missing-links': {
    short: 'No link before it, or none after it',
    problem: { one: 'is missing a link before or after it', many: 'are missing a link before or after them' },
    impact: 'Work with an open end can slip without moving the finish date.',
    action: 'Add the missing link in P6, then re-export.',
  },
  leads: {
    short: 'A link into it that overlaps its predecessor',
    problem: { one: 'has a lead (a negative lag) on a link into it', many: 'have a lead (a negative lag) on a link into them' },
    impact: 'A lead hides an overlap that is hard to see and track.',
    action: 'Replace each lead with a start to start link or a shorter predecessor.',
  },
  lags: {
    short: 'A link into it that adds waiting time',
    problem: { one: 'has a lag on a link into it', many: 'have a lag on a link into them' },
    impact: 'Waiting time inside a link is hard to see and track.',
    action: 'Model the wait as its own activity, so it can be seen and tracked.',
  },
  'link-types': {
    name: 'Not finish to start',
    short: 'A link into it that is not finish to start',
    problem: { one: 'has a link into it that is not finish to start', many: 'have a link into them that is not finish to start' },
    impact: 'Other link types make the critical path harder to follow.',
    action: 'Use finish to start links where the work allows it.',
  },
  'duplicate-links': {
    short: 'The same pair linked twice',
    problem: { one: 'is linked twice to the same predecessor', many: 'are linked twice to the same predecessor' },
    impact: 'The extra link is clutter that can hide the real logic.',
    action: 'Delete the extra link in P6.',
  },
  'out-of-sequence': {
    short: 'Started before its predecessor finished',
    problem: { one: 'started before a predecessor finished', many: 'started before a predecessor finished' },
    impact: 'Progress that ignores the logic makes the forecast unreliable.',
    action: 'Fix the logic or the progress, so the forecast can be trusted.',
  },
  'hard-constraints': {
    short: 'Pinned to a date that overrides the logic',
    problem: { one: 'is pinned by a hard constraint', many: 'are pinned by hard constraints' },
    impact: 'A pinned date overrides the logic, so a delay can stay hidden.',
    action: 'Replace each with logic, or a soft constraint.',
  },
  'negative-float': {
    short: 'Already late for a deadline or constraint',
    problem: { one: 'is already late for a deadline or constraint', many: 'are already late for a deadline or constraint' },
    impact: 'The plan can’t meet those dates without a recovery.',
    action: 'Find what drives each one and plan the recovery.',
  },
  'high-float': {
    short: 'More than 44 working days of spare time',
    problem: { one: 'has more than 44 working days of float', many: 'have more than 44 working days of float' },
    impact: 'That much spare time often hides a missing link.',
    action: 'Check what follows each one, and link it to its real successor.',
  },
  'long-durations': {
    short: 'More than 44 working days of work left',
    problem: { one: 'has more than 44 working days of work left', many: 'have more than 44 working days of work left' },
    impact: 'Progress on work this long is hard to measure.',
    action: 'Split each into shorter activities, so progress can be measured.',
  },
  'invalid-dates': {
    short: 'Dates that contradict the data date',
    problem: { one: 'has a date that contradicts the data date', many: 'have dates that contradict the data date' },
    impact: 'The status can’t be trusted until these dates are fixed.',
    action: 'Correct the progress dates, then recalculate.',
  },
  resources: {
    name: 'No resources',
    short: 'A day or more of work with no resource',
    problem: { one: 'has a day or more of work with no resource', many: 'have a day or more of work with no resource' },
    impact: 'Without resources, cost and crew needs can’t be planned.',
    action: 'Assign the resource, or confirm that the activity needs none.',
  },
  'missed-tasks': {
    short: 'Finished later than the baseline planned',
    problem: { one: 'missed its baseline finish', many: 'missed their baseline finish' },
    impact: 'The work is falling behind the baseline.',
    action: 'Needs a baseline. The checker does not read one yet.',
  },
  'critical-path-test': {
    short: 'A delay must move the finish date',
    impact: 'A delay on the critical path did not move the finish.',
    action: 'Needs a delay test. The checker cannot run one yet.',
  },
  cpli: {
    short: 'How realistic the finish date is',
    impact: 'The finish date is unlikely to hold.',
    action: 'Needs a baseline. The checker does not read one yet.',
  },
  bei: {
    short: 'Finished work against what was planned',
    impact: 'Work is finishing slower than the baseline planned.',
    action: 'Needs a baseline. The checker does not read one yet.',
  },
}

const FALLBACK: RuleText = { short: 'A schedule check', impact: '', action: 'Review them in P6.' }

/** The words for a check, by its ID. A new check from the backend still gets plain words. */
export function ruleText(id: string): RuleText {
  return TEXT[id] ?? FALLBACK
}

/** The name a check shows: the problem it finds, else the backend's own name. */
export function checkName(rule: { id: string; name: string }): string {
  return TEXT[rule.id]?.name ?? rule.name
}

/** What is wrong, as a sentence led by its count: { count: "170", text: "activities have more than 44 working days of float" }.
 *  A check that isn't a share of activities has no count: its name is the subject. */
export function problemText(rule: { id: string; name: string; count: number; measure: string }): { count: string; text: string } {
  if (rule.measure === 'test') return { count: '', text: `${rule.name} failed` }
  if (rule.measure !== 'percent') return { count: '', text: `${rule.name} is outside its limit` }
  const one = rule.count === 1
  const words = TEXT[rule.id]?.problem ?? { one: `is flagged by the ${rule.name} check`, many: `are flagged by the ${rule.name} check` }
  return { count: rule.count.toLocaleString(), text: `${one ? 'activity' : 'activities'} ${one ? words.one : words.many}` }
}
