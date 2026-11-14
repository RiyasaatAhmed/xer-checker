import { describe, expect, it } from 'vitest'
import { checkName, problemText, ruleText } from './rules'

const rule = (id: string, count: number, measure = 'percent') => ({ id, name: 'High float', count, measure })

describe('problemText', () => {
  it('leads with the count, in the singular for one activity and the plural for more', () => {
    expect(problemText(rule('high-float', 1))).toEqual({ count: '1', text: 'activity has more than 44 working days of float' })
    expect(problemText(rule('high-float', 1170))).toEqual({ count: '1,170', text: 'activities have more than 44 working days of float' })
  })
  it('still makes a sentence for a check it has no words for', () => {
    expect(problemText({ id: 'dangling', name: 'Dangling activities', count: 4, measure: 'percent' }).text).toBe('activities are flagged by the Dangling activities check')
  })
  it('makes the check the subject when it is not a share of activities', () => {
    expect(problemText({ id: 'cpli', name: 'CPLI', count: 0, measure: 'index' })).toEqual({ count: '', text: 'CPLI is outside its limit' })
    expect(problemText({ id: 'critical-path-test', name: 'Critical path test', count: 0, measure: 'test' })).toEqual({ count: '', text: 'Critical path test failed' })
  })
})

describe('ruleText and checkName', () => {
  it('says why a check matters and what to do, with plain words for a check it does not know', () => {
    expect(ruleText('high-float').impact).toBe('That much spare time often hides a missing link.')
    expect(ruleText('nope')).toEqual({ short: 'A schedule check', impact: '', action: 'Review them in P6.' })
  })
  it('names a check by the problem it finds', () => {
    expect(checkName({ id: 'resources', name: 'Resources' })).toBe('No resources')
    expect(checkName({ id: 'lags', name: 'Lags' })).toBe('Lags')
  })
})
