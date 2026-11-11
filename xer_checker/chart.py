"""Draw the one chart: a bar per file per check, a line at each DCMA limit, and the summaries underneath."""

import textwrap  # wraps the summary points to fit under the chart

import matplotlib

matplotlib.use("Agg")  # draw straight to a file; no window
import matplotlib.pyplot as plt  # noqa: E402  (must come after matplotlib.use)

from .checks import LIMITS, percent  # noqa: E402

# ---------- Constants ----------

# Bars
CHART_SIZE = (9, 4.8)  # inches
CHART_DPI = 150  # pixels per inch, so the bars are 1350 x 720 (the summaries add height)
BAR_WIDTH = 0.35  # width of one file's group slot; each bar fills 90% of it
FILE_COLORS = ["#2a78d6", "#eb6834"]  # one per file (blue, orange), so the chart supports 2 files
LIMIT_LINE_COLOR = "#52514e"  # dark grey dashed line
LABEL_FONT_SIZE = 9  # size of the numbers on top of the bars, and of the summaries under the chart

# Summaries under the bars
CHART_WRAP = 118  # characters per line
SUMMARY_LINE_HEIGHT = 0.19  # inches per line of summary text
SQUARE_GAP = 0.022  # indent of a file's name after its square, and of each point after its bullet
NOTE_COLOR = "#52514e"  # dark grey, for who wrote each summary
SUMMARY_NOTE = "Every figure in the summaries is filled in by code. Gemini, when used, only chooses the words."


def draw_chart(results, path):
    """Save the chart to `path`: % failing per check, one bar per file, a dashed line at each DCMA limit,
    and the summaries under it."""
    names = list(LIMITS)  # the three checks, in a fixed order
    # Wrap each point first, because the number of lines sets how tall the text panel is.
    summaries = [(r.name, r.author, [textwrap.wrap(point, CHART_WRAP) for point in r.points]) for r in results]
    rows = sum(sum(map(len, points)) + 2 for _, _, points in summaries) + 1  # per file: header, points, blank row
    panel = rows * SUMMARY_LINE_HEIGHT  # height of the text panel, in inches
    # Two areas stacked: the bars on top, the summaries under them.
    fig, (ax, text_ax) = plt.subplots(2, 1, figsize=(CHART_SIZE[0], CHART_SIZE[1] + panel), dpi=CHART_DPI,
                                      height_ratios=[CHART_SIZE[1], panel])
    width = BAR_WIDTH
    for i, r in enumerate(results):  # one colour per file
        # Spread each file's bar side by side around its check (file 1 left, file 2 right).
        xs = [x + (i - (len(results) - 1) / 2) * width for x in range(len(names))]
        pcts = [percent(len(r.failures[n]), r.checked) for n in names]  # bar heights in %
        bars = ax.bar(xs, pcts, width * 0.9, label=r.name, color=FILE_COLORS[i % len(FILE_COLORS)])
        # Write "count (percent)" on top of each bar, with one decimal like the printed report.
        ax.bar_label(bars, labels=[f"{len(r.failures[n])} ({p:.1f}%)" for n, p in zip(names, pcts)], fontsize=LABEL_FONT_SIZE)
    for x, name in enumerate(names):  # a dashed line at each check's limit
        ax.hlines(LIMITS[name], x - 0.4, x + 0.4, colors=LIMIT_LINE_COLOR, linestyles="dashed",
                  label="DCMA limit" if x == 0 else None)  # label once so the legend shows it once
    # Labels, title and tidy-up.
    ax.set_xticks(range(len(names)), [f"{n}\nlimit {LIMITS[n]}%" for n in names])
    ax.set_ylabel("% of unfinished work activities")
    ax.set_title("Unfinished work activities flagged by each check", loc="left")
    ax.spines[["top", "right"]].set_visible(False)  # remove the top and right borders
    ax.legend(frameon=False)
    draw_summaries(text_ax, summaries, rows)
    fig.tight_layout()  # stop labels from being cut off
    fig.savefig(path)
    plt.close(fig)  # free the figure's memory


def draw_summaries(ax, summaries, rows):
    """Write each file's summary in the empty panel `ax`, one row per line, top to bottom."""
    ax.axis("off")  # a blank panel: no axes, ticks or border
    step = 1 / rows  # height of one row, as a share of the panel
    y = 1  # start at the top
    for i, (file_name, author, points) in enumerate(summaries):
        # Header row: a square in the file's bar colour, the file's name, and who wrote its summary.
        write(ax, 0, y, "■", color=FILE_COLORS[i % len(FILE_COLORS)])
        write(ax, SQUARE_GAP, y, file_name, fontweight="bold")
        write(ax, 1, y, f"written by {author}", color=NOTE_COLOR, ha="right")
        for point in points:  # a bullet, then the point's lines, lined up with the file's name
            for n, line in enumerate(point):
                y -= step
                if n == 0:
                    write(ax, 0, y, "•")
                write(ax, SQUARE_GAP, y, line)
        y -= 2 * step  # leave a blank row before the next file
    write(ax, 0, y, SUMMARY_NOTE, color=NOTE_COLOR)


def write(ax, x, y, text, **style):
    """One line of text in the panel, at x and y as shares of it (0 to 1). A "$" stays a dollar sign."""
    ax.text(x, y, text, transform=ax.transAxes, va="top", fontsize=LABEL_FONT_SIZE, parse_math=False,
            in_layout=False, **style)  # in_layout=False: the text never squeezes the bars
