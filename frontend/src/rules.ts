// What each check means to a scheduler, and what to do when it's over the limit.
// The numbers come from the backend; these are only the words around them. Keyed by the check's ID.

export interface RuleText {
  name?: string // the problem, when the backend's name only names the topic: "No resources", not "Resources"
  short: string // one line under the rule's name
  meaning: string // what a flagged activity is
  action: string // what to do about it in P6
}

const TEXT: Record<string, RuleText> = {
  'missing-links': {
    short: 'No link before it, or none after it',
    meaning: 'have no predecessor or no successor, so they can slip without moving the finish date.',
    action: 'Add the missing link in P6, then re-export.',
  },
  leads: {
    short: 'A link into it that overlaps its predecessor',
    meaning: 'have a negative lag on a link into them.',
    action: 'Replace each lead with a start to start link or a shorter predecessor.',
  },
  lags: {
    short: 'A link into it that adds waiting time',
    meaning: 'have a positive lag on a link into them.',
    action: 'Model the wait as its own activity, so it can be seen and tracked.',
  },
  'link-types': {
    name: 'Not finish to start',
    short: 'A link into it that is not finish to start',
    meaning: 'have a start to start, finish to finish or start to finish link into them.',
    action: 'Use finish to start links where the work allows it.',
  },
  'duplicate-links': {
    short: 'The same pair linked twice',
    meaning: 'sit at the end of a pair of activities that the file links twice.',
    action: 'Delete the extra link in P6.',
  },
  'out-of-sequence': {
    short: 'Started before its predecessor finished',
    meaning: 'are in progress while a finish to start predecessor is not finished.',
    action: 'Fix the logic or the progress, so the forecast can be trusted.',
  },
  'hard-constraints': {
    short: 'Pinned to a date that overrides the logic',
    meaning: 'have a must start, must finish or on or before constraint.',
    action: 'Replace each with logic, or a soft constraint.',
  },
  'negative-float': {
    short: 'Already late for a deadline or constraint',
    meaning: 'are already late for a deadline or a constraint.',
    action: 'Find what drives each one and plan the recovery.',
  },
  'high-float': {
    short: 'More than 44 working days of spare time',
    meaning: 'have more than 44 working days of float. That much spare time often hides a missing link.',
    action: 'Check what follows each one, and link it to its real successor.',
  },
  'long-durations': {
    short: 'More than 44 working days of work left',
    meaning: 'have more than 44 working days of work left in one activity.',
    action: 'Split each into shorter activities, so progress can be measured.',
  },
  'invalid-dates': {
    short: 'Dates that contradict the data date',
    meaning: 'have an actual date after the data date, or are not started with a forecast start before it.',
    action: 'Correct the progress dates, then recalculate.',
  },
  resources: {
    name: 'No resources',
    short: 'A day or more of work with no resource',
    meaning: 'last a day or more and have no resource assigned.',
    action: 'Assign the resource, or confirm that the activity needs none.',
  },
  'missed-tasks': {
    short: 'Finished later than the baseline planned',
    meaning: 'finished, or should have, later than the baseline.',
    action: 'Needs a baseline. The checker does not read one yet.',
  },
  'critical-path-test': {
    short: 'A delay must move the finish date',
    meaning: 'fail a test: a delay on the critical path did not move the finish.',
    action: 'Needs a delay test. The checker cannot run one yet.',
  },
  cpli: {
    short: 'How realistic the finish date is',
    meaning: 'sit on a critical path that is too long for the float left.',
    action: 'Needs a baseline. The checker does not read one yet.',
  },
  bei: {
    short: 'Finished work against what was planned',
    meaning: 'are behind the finish rate the baseline planned.',
    action: 'Needs a baseline. The checker does not read one yet.',
  },
}

const FALLBACK: RuleText = { short: 'A schedule check', meaning: 'break this rule.', action: 'Review them in P6.' }

/** The words for a check, by its ID. A new check from the backend still gets plain words. */
export function ruleText(id: string): RuleText {
  return TEXT[id] ?? FALLBACK
}

/** The name a check shows: the problem it finds, else the backend's own name. */
export function checkName(rule: { id: string; name: string }): string {
  return TEXT[rule.id]?.name ?? rule.name
}
