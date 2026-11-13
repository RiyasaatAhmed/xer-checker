// What each DCMA rule means to a scheduler, and what to do when it's over the limit.
// The numbers come from the backend; these are only the words around them.

export interface RuleText {
  short: string // one line under the rule's name
  meaning: string // what a flagged activity is
  action: string // what to do about it in P6
}

const TEXT: Record<string, RuleText> = {
  'Missing links': {
    short: 'No link before it, or none after it',
    meaning: 'have no predecessor or no successor, so they can slip without moving the finish date.',
    action: 'Add the missing link in P6, then re-export.',
  },
  'Negative float': {
    short: 'Already late for a deadline or constraint',
    meaning: 'are already late for a deadline or a constraint.',
    action: 'Find what drives each one and plan the recovery.',
  },
  'High float': {
    short: 'More than 44 working days of spare time',
    meaning: 'have more than 44 working days of float. That much spare time often hides a missing link.',
    action: 'Check what follows each one, and link it to its real successor.',
  },
}

const FALLBACK: RuleText = { short: 'A DCMA schedule check', meaning: 'break this rule.', action: 'Review them in P6.' }

/** The words for a rule, by its name. A new rule from the backend still gets plain words. */
export function ruleText(name: string): RuleText {
  return TEXT[name] ?? FALLBACK
}
