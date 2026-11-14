"""Find the open ends that explain a run of flagged activities.

An activity with nothing after it has float all the way to the end of the project. So does every
activity that leads only into it. One missing link can explain many flags. This finds those links.
Pure: it takes plain IDs and dicts, so it can be tested alone.
"""

# ---------- Constants ----------

MAX_SHARE = 0.5  # an open end that more than this share of linked activities lead into is the project's real end, not a gap
MIN_CLEARS = 2  # a cause is worth showing when it explains at least this many flagged activities


def lead_only_into(end, successors, predecessors):
    """The set of activities that lead only into `end`, itself included.

    An activity is in the set when it has a successor and every one of its successors is in the set.
    successors / predecessors: {activity ID: [IDs one link away]}.
    """
    inside = {end}
    waiting = {}  # activity ID -> successors not yet known to be inside
    queue = [end]
    while queue:
        current = queue.pop()
        for before in predecessors.get(current, ()):
            if before in inside:
                continue
            waiting[before] = waiting.get(before, len(set(successors.get(before, ())))) - 1
            if waiting[before] <= 0:
                inside.add(before)
                queue.append(before)
    return inside


def open_ends(checked, flagged, links):
    """The open ends worth fixing: [(activity ID, flagged activities that lead only into it)], most first.

    checked: IDs of the activities DCMA checks. flagged: IDs any check flags.
    links: [(earlier ID, later ID)], one per pair.
    """
    successors, predecessors = {}, {}
    for earlier, later in links:
        successors.setdefault(earlier, []).append(later)
        predecessors.setdefault(later, []).append(earlier)
    linked = len(set(successors) | set(predecessors)) or 1
    found = []
    for end in checked:
        if end in successors or end not in predecessors:  # it has something after it, or is not linked at all
            continue
        inside = lead_only_into(end, successors, predecessors)
        if len(inside) / linked > MAX_SHARE:
            continue
        clears = sum(1 for code in inside if code in flagged)
        if clears >= MIN_CLEARS:
            found.append((end, clears))
    return sorted(found, key=lambda pair: (-pair[1], pair[0]))  # ties by ID, so every reload shows the same list
