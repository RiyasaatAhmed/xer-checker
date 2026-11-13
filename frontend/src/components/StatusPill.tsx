import { Check, Flag, Minus } from 'lucide-react'
import type { RuleStatus } from '../types'

// A status always shows an icon and words, never color alone.
const LOOK: Record<RuleStatus, { tone: string; label: string; Icon: typeof Check }> = {
  pass: { tone: 'pass', label: 'Within limit', Icon: Check },
  flag: { tone: 'flag', label: 'Over limit', Icon: Flag },
  'n/a': { tone: 'none', label: 'Nothing to check', Icon: Minus },
}

/** A rule's status as a small mono pill: ✓ Within limit, ⚑ Over limit, – Nothing to check. */
export function StatusPill({ status, label }: { status: RuleStatus; label?: string }) {
  const { tone, label: word, Icon } = LOOK[status]
  return (
    <span className={`pill ${tone}`}>
      <Icon size={12} strokeWidth={2.75} aria-hidden />
      {label ?? word}
    </span>
  )
}
