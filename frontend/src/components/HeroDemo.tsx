import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { Check, Flag, FileUp, Minus } from 'lucide-react'
import { Badge, Bar, Collapse, Count, Meter, Stage, States, Window, type Act, type Layout, type Point } from '../kit'
import './hero-demo.css'

// The empty screen's demo, built with Stageshow from its `upload` gold example.
// A P6 export is carried in from outside the frame, already held, like a file dragged
// from the desktop. The drop area lights up. On the drop, the file's row opens under it,
// checking.
// Then the 5 headline DCMA checks arrive one by one, laid out as the home page lays them out:
// by set, in 2 columns, each set saying how many are over. The 2 over their limit keep
// their flag and color; the 3 within it step back. A set that can't run is one line.
// That result is the payoff, and it holds. The checks and the file then leave as one
// reverse stagger, and the hand goes back out for the next file: back to the start.
//
// Real words only where the story is: the file, the 2 sets, the 5 checks and their figures.
// The schedule saved before it is a placeholder row, running off the bottom. The window
// runs off the right edge; every word sits inside the crop and only the bars bleed.

type Ghost = { on: boolean; dropped: boolean; off: Point; at: Point }
type S = { up: boolean; progress: number; done: boolean; shown: number; ghost: Ghost }

const FILE = 'CSTv2.4.xer'
const NO_GHOST: Ghost = { on: false, dropped: false, off: { x: 0, y: 0 }, at: { x: 0, y: 0 } }
const initial: S = { up: false, progress: 0, done: false, shown: 0, ghost: NO_GHOST }
const poster: S = { up: true, progress: 1, done: true, shown: 6, ghost: NO_GHOST }

// The README numbers for CSTv2.4.xer: the demo shows what the app really finds, by set.
const SETS = [
  { name: 'Logic', checks: [
    { name: 'Missing links', value: 15.0, limit: 5, over: true },
    { name: 'Leads', value: 0.0, limit: 0, over: false },
    { name: 'Lags', value: 0.8, limit: 5, over: false },
  ] },
  { name: 'Float', checks: [
    { name: 'Negative float', value: 0.0, limit: 0, over: false },
    { name: 'High float', value: 58.6, limit: 5, over: true },
  ] },
]
const FIRST = [0, 3] // the place in the arriving order of each set's first check
const ROWS = 5 // the checks that arrive, Logic's then Float's; the set that can't run comes after them
const NEXT = [[104, 72], [88, 64]] // the schedules saved before: placeholder widths of a name and a badge, running off the bottom

// Corner bleed: one gutter above and left of the window, which runs off the right and bottom.
const GEO: Record<Layout, { x: number; y: number; w: number; h: number }> = {
  wide: { x: 40, y: 40, w: 720, h: 480 },
  compact: { x: 16, y: 16, w: 420, h: 360 },
}
const OUTSIDE: Point = { x: -60, y: 230 } // the hand rests past the left edge, where the next file comes from
const GRIP: Point = { x: 56, y: 26 } // where the hand holds the drag image: the middle of the icon

async function script(a: Act<S>) {
  await a.wait(900)

  // 1-2. The export comes in from past the left edge, already held, and is carried over
  //      the drop area, which lights up under it
  a.mark('drag')
  const drop = a.rect('drop')
  await a.move({ x: drop.x + drop.width * 0.36, y: drop.y + drop.height * 0.5 }, {
    duration: 1500,
    onMove: (at) => a.put({ ghost: { on: true, dropped: false, off: GRIP, at } }),
  })

  // 3. Drop: the file's row opens under the drop area, and the check runs. The hand
  //    moves off the words, to the drop area's empty end.
  a.mark('drop')
  await a.set((s) => ({ up: true, ghost: { ...s.ghost, dropped: true } }))
  void a.move({ at: 'drop', x: 0.9, y: 0.5 })
  await a.wait(400)
  for (const progress of [0.4, 0.75, 1]) {
    await a.set({ progress })
    await a.wait(420)
  }

  // 4. The result: the row says what needs attention, then the checks arrive in reading order
  a.mark('result')
  await a.set({ done: true })
  await a.wait(250)
  await a.stagger([1, 2, 3, 4, 5, 6], (n) => a.set({ shown: n }), 220)
  await a.wait(2800)

  // 5. The checks leave last first, then the file's row, while the hand goes back out
  //    for the next file: back to the start
  a.mark('reset')
  void a.move(OUTSIDE, { duration: 700 }) // lands before the reset ends, so the loop's seam is clean
  await a.stagger([5, 4, 3, 2, 1, 0], (n) => a.set({ shown: n }), 70)
  await a.set({ up: false, ghost: NO_GHOST })
  await a.wait(600)
  await a.snap({ progress: 0, done: false })
}

export function HeroDemo() {
  return (
    <Stage<S>
      width={680}
      height={420}
      compact={{ below: 560, width: 358, height: 340 }}
      initial={initial}
      poster={poster}
      script={script}
      accent="#fafafa"
      cursor={{ at: OUTSIDE }}
      className="hd"
    >
      {(s, _rect, layout) => {
        const g = GEO[layout]
        return (
          <>
            <Window
              className="hd-window"
              style={{ left: g.x, top: g.y, width: g.w, height: g.h }}
              lead={<span className="hd-heading">XER checker</span>}
              body={{ className: 'hd-body', 'data-crop': true }}
            >
              <div className="hd-page" data-compact={layout === 'compact' || undefined}>
                <div className="hd-drop" data-target="drop" data-drop>
                  <FileUp size={18} strokeWidth={2} className="hd-drop__icon" />
                  <span>Drop a .xer file to check it</span>
                </div>
                <div className="hd-label">Recent schedules</div>
                <Collapse open={s.up}>
                  <FileRow progress={s.progress} done={s.done} />
                </Collapse>
                <div className="hd-sets">
                  {SETS.map((set, k) => (
                    <div key={set.name} className="hd-set" data-side={k ? 'right' : 'left'}>
                      <Collapse open={s.shown > FIRST[k]}>
                        <div className="hd-set__name">
                          <span className="hd-set__label">{set.name}</span>
                          <span className="hd-set__over">· {set.checks.filter((c) => c.over).length} over</span>
                        </div>
                      </Collapse>
                      {set.checks.map((check, j) => (
                        <Collapse key={check.name} open={s.shown > FIRST[k] + j}>
                          <CheckRow {...check} on={s.shown > FIRST[k] + j} />
                        </Collapse>
                      ))}
                      {k === 1 && (
                        <Collapse open={s.shown > ROWS}>
                          <div className="hd-off">
                            <Minus size={14} strokeWidth={2} />
                            <span className="hd-set__label">Execution</span>
                            <span>· 4 checks can’t run</span>
                          </div>
                        </Collapse>
                      )}
                    </div>
                  ))}
                </div>
                {NEXT.map(([name, badge]) => (
                  <div key={name} className="hd-next">
                    <XerIcon small />
                    <Bar w={name} h={7} tone={3} />
                    <Bar w={badge} h={7} tone={2} />
                  </div>
                ))}
              </div>
            </Window>

            <DragImage ghost={s.ghost}>
              <XerIcon />
              <span className="hd-drag__name">{FILE}</span>
            </DragImage>
          </>
        )
      }}
    </Stage>
  )
}

/** The dropped file: checking with a bar, then what needs attention. */
function FileRow({ progress, done }: { progress: number; done: boolean }) {
  return (
    <div className="hd-file" data-done={done || undefined}>
      <XerIcon small />
      <span className="hd-file__name">{FILE}</span>
      <States
        value={done ? 'done' : 'checking'}
        align="start"
        states={{
          checking: <Meter className="hd-track" value={progress} />,
          done: (
            <Badge tone="danger" icon={<Flag size={12} strokeWidth={2.5} />}>
              2 of 5 over the limit
            </Badge>
          ),
        }}
      />
    </div>
  )
}

/** One check, as the home page draws it: its flag or tick, its name, the figure, and a bar against its limit.
 *  The bar is the share of activities checked, 0 to 100%. The tick is the limit; a limit of 0 has none. */
function CheckRow({ name, value, limit, over, on }: (typeof SETS)[number]['checks'][number] & { on: boolean }) {
  return (
    <div className="hd-check" data-over={over || undefined}>
      {over ? <Flag size={14} strokeWidth={2.5} /> : <Check size={14} strokeWidth={2.5} />}
      <span className="hd-check__name">{name}</span>
      <span className="hd-check__value">
        <Count value={on ? value : 0} duration={700} format={(n) => n.toFixed(1)} />%
      </span>
      <span className="hd-check__meter">
        {value > 0 && <span className="hd-check__fill" style={{ width: on ? `${Math.min(100, value)}%` : 0 }} />}
        {limit > 0 && <span className="hd-check__limit" style={{ left: `${Math.min(100, limit)}%` }} />}
      </span>
    </div>
  )
}

/** A page with a folded corner and an orange XER band: the P6 export. */
function XerIcon({ small }: { small?: boolean }) {
  return (
    <span className="hd-xer" data-small={small || undefined}>
      <span className="hd-xer__band">{small ? null : 'XER'}</span>
    </span>
  )
}

/** The drag image follows the cursor on the drag's own frame callback, and lights the
 *  [data-drop] under it. Copied from the `upload` gold example.
 *  data-crop: it enters from past the stage's left edge, so the edge may cut it on the way in.
 *  The script moves it, not a CSS animation, so the film can't tell it is in flight. */
function DragImage({ ghost, children }: { ghost: Ghost; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const over = useRef<HTMLElement | null>(null)
  const following = ghost.on && !ghost.dropped
  const { x: ox, y: oy } = ghost.off
  const { x, y } = ghost.at
  useLayoutEffect(() => {
    const root = ref.current?.closest<HTMLElement>('.ss-stage')
    let next: HTMLElement | null = null
    if (following && root) {
      const box = root.getBoundingClientRect()
      const scale = box.width / root.offsetWidth || 1
      const hit = document.elementFromPoint(box.left + x * scale, box.top + y * scale)?.closest<HTMLElement>('[data-drop]') ?? null
      if (hit && root.contains(hit)) next = hit
    }
    if (next !== over.current) {
      over.current?.removeAttribute('data-over')
      next?.setAttribute('data-over', '')
      over.current = next
    }
  }, [following, x, y])
  useLayoutEffect(() => () => over.current?.removeAttribute('data-over'), [])
  return (
    <div ref={ref} className="hd-drag" data-crop data-show={following || undefined} data-dropped={ghost.dropped || undefined} style={{ transform: `translate(${x - ox}px, ${y - oy}px)` }} aria-hidden>
      <div className="hd-drag__inner" style={{ transformOrigin: `${ox}px ${oy}px` }}>
        {children}
      </div>
    </div>
  )
}
