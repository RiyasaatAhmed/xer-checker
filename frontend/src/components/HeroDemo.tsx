import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { Flag, FileUp } from 'lucide-react'
import { Badge, Bar, Collapse, Count, Meter, Stage, States, Window, type Act, type Layout, type Point } from '../kit'
import './hero-demo.css'

// The empty screen's demo, built with Stageshow from its `upload` gold example.
// A P6 export is carried in from outside the frame, already held, as a file dragged
// from the desktop is: the drop area lights up, and on the drop the file's row opens
// under it, checking.
// Then the 3 DCMA checks arrive one by one, each with its figure and its limit;
// the 2 over their limit are flagged. That result is the payoff, and it holds.
// The checks and the file then leave as one reverse stagger, and the hand goes back out
// for the next file: back to the start.
//
// Real words only where the story is: the file, the 3 checks, their figures and
// flags. The recent checks under them are placeholder bars. The window runs off the
// right edge, so every word sits on the left and only the bars bleed.

type Ghost = { on: boolean; dropped: boolean; off: Point; at: Point }
type S = { up: boolean; progress: number; done: boolean; shown: number; ghost: Ghost }

const FILE = 'CSTv2.4.xer'
const NO_GHOST: Ghost = { on: false, dropped: false, off: { x: 0, y: 0 }, at: { x: 0, y: 0 } }
const initial: S = { up: false, progress: 0, done: false, shown: 0, ghost: NO_GHOST }
const poster: S = { up: true, progress: 1, done: true, shown: 3, ghost: NO_GHOST }

// The README numbers for CSTv2.4.xer: the demo shows what the app really finds.
const CHECKS = [
  { name: 'Missing links', value: 15.0, limit: 5, over: true },
  { name: 'Negative float', value: 0.0, limit: 0, over: false },
  { name: 'High float', value: 58.6, limit: 5, over: true },
]
const RECENT = [118, 92, 136, 104, 126] // widths of the placeholder rows

// Corner bleed: one gutter above and left of the window, which runs off the right and bottom.
const GEO: Record<Layout, { x: number; y: number; w: number; h: number }> = {
  wide: { x: 40, y: 40, w: 720, h: 440 },
  compact: { x: 16, y: 16, w: 420, h: 320 },
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
  await a.stagger([1, 2, 3], (n) => a.set({ shown: n }), 220)
  await a.wait(2800)

  // 5. The checks leave last first, then the file's row, while the hand goes back out
  //    for the next file: back to the start
  a.mark('reset')
  void a.move(OUTSIDE, { duration: 700 }) // lands before the reset ends, so the loop's seam is clean
  await a.stagger([2, 1, 0], (n) => a.set({ shown: n }), 70)
  await a.set({ up: false, ghost: NO_GHOST })
  await a.wait(600)
  await a.snap({ progress: 0, done: false })
}

export function HeroDemo() {
  return (
    <Stage<S>
      width={680}
      height={400}
      compact={{ below: 560, width: 358, height: 300 }}
      initial={initial}
      poster={poster}
      script={script}
      accent="#ff5a1f"
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
                <Collapse open={s.up}>
                  <FileRow progress={s.progress} done={s.done} />
                </Collapse>
                <div className="hd-checks">
                  {CHECKS.map((check, i) => (
                    <Collapse key={check.name} open={s.shown > i}>
                      <CheckRow {...check} on={s.shown > i} />
                    </Collapse>
                  ))}
                </div>
                <div className="hd-recent">
                  <div className="hd-label">Recent checks</div>
                  {RECENT.map((w, i) => (
                    <div key={i} className="hd-recent__row">
                      <Bar w={w} h={7} tone={3} />
                      <Bar w={44} h={7} tone={2} />
                    </div>
                  ))}
                </div>
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
            <Badge tone="accent" icon={<Flag size={12} strokeWidth={2.5} />}>
              2 of 3 over the limit
            </Badge>
          ),
        }}
      />
    </div>
  )
}

/** One DCMA check: its name, a bar with the limit marked, the figure and its flag. */
function CheckRow({ name, value, limit, over, on }: (typeof CHECKS)[number] & { on: boolean }) {
  return (
    <div className="hd-check" data-over={over || undefined}>
      <span className="hd-check__name">{name}</span>
      <span className="hd-check__value">
        <Count value={on ? value : 0} duration={700} format={(n) => n.toFixed(1)} />%
      </span>
      <span className="hd-check__meter">
        <span className="hd-check__fill" style={{ width: on ? `${value}%` : 0 }} />
        <span className="hd-check__limit" style={{ left: `${limit}%` }} />
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
 *  [data-drop] under it. Copied from the `upload` gold example. */
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
    <div ref={ref} className="hd-drag" data-show={following || undefined} data-dropped={ghost.dropped || undefined} style={{ transform: `translate(${x - ox}px, ${y - oy}px)` }} aria-hidden>
      <div className="hd-drag__inner" style={{ transformOrigin: `${ox}px ${oy}px` }}>
        {children}
      </div>
    </div>
  )
}
