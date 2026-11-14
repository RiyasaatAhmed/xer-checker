"""The WBS tree with its numbers rolled up: how many activities each group holds, how many are
flagged, and the dates they span. Feeds the schedule map, which shows where the problems are.

Pure: it takes plain records (schedule.WbsNode and anything with the fields of schedule.Activity).
"""

# ---------- Constants ----------

MAX_DEPTH = 12  # a safety stop for a tree that loops back on itself; real P6 trees are 3 to 6 deep
MAX_MONTHS = 60  # the longest month axis the heat strip draws; later months share the last cell


def month_axis(activities):
    """["2026-06", "2026-07", ...] from the earliest start to the latest finish, one entry per month."""
    dates = [d for a in activities for d in (a.start, a.finish) if d]
    if not dates:
        return []
    first, last = min(dates), max(dates)
    count = min(MAX_MONTHS, (last.year - first.year) * 12 + last.month - first.month + 1)
    return [f"{first.year + (first.month - 1 + i) // 12}-{(first.month - 1 + i) % 12 + 1:02d}" for i in range(count)]


def structure(nodes, activities, flags, rule_count, rule_groups=(), months=()):
    """The groups that hold activities, in tree order, each with its subtree's numbers.

    flags: {activity code: set of rule numbers (0, 1, ...) that flag it}
    rule_groups: the check group of each rule number, like ["Logic", "Float", ...]
    months: the month axis from month_axis(); each activity counts in the month it starts
    Returns [{id, parent_id, name, depth, checked, flagged, by_rule, by_group, complete, total, heat, start, finish}, ...].
    checked is the activities DCMA checks; flagged is how many of those any rule flags. by_group counts the
    checked activities flagged by at least one check of each group. heat[rule][month] is the flagged
    activities starting in that month.
    """
    children = {}
    for node in sorted(nodes, key=lambda n: n.seq):
        children.setdefault(node.parent_id, []).append(node)
    own = {}  # WBS ID -> the activities directly in it
    for a in activities:
        own.setdefault(a.p6_wbs_id, []).append(a)
    slot_of = {m: i for i, m in enumerate(months)}

    def month_of(moment):
        """The index of the month a date falls in, or None with no date. A date off the axis takes the nearest end."""
        if moment is None or not months:
            return None
        key = f"{moment.year}-{moment.month:02d}"
        return slot_of.get(key, 0 if key < months[0] else len(months) - 1)

    out = []

    def walk(node, depth):
        """Add this node and its subtree after it. Returns the subtree's activities, or [] past MAX_DEPTH."""
        if depth > MAX_DEPTH:
            return []
        slot = len(out)
        out.append(None)  # this node's place, filled in once its subtree is read
        subtree = list(own.get(node.p6_id, []))
        for child in children.get(node.p6_id, []):
            subtree += walk(child, depth + 1)
        if not subtree:
            out.pop(slot)  # a group with no activity is left out, and so are its (empty) children
            return []
        checked = [a for a in subtree if a.checked]
        by_rule = [sum(1 for a in checked if i in flags.get(a.code, ())) for i in range(rule_count)]
        by_group = {g: sum(1 for a in checked if any(rule_groups[i] == g for i in flags.get(a.code, ()))) for g in dict.fromkeys(rule_groups)}
        heat = [[0] * len(months) for _ in range(rule_count)]
        for a in checked:
            at = month_of(a.start)
            for i in flags.get(a.code, ()):
                if at is not None:
                    heat[i][at] += 1
        starts = [a.start for a in subtree if a.start]
        finishes = [a.finish for a in subtree if a.finish]
        out[slot] = {
            "id": node.p6_id, "parent_id": node.parent_id, "name": node.name, "depth": depth,
            "checked": len(checked), "flagged": sum(1 for a in checked if flags.get(a.code)), "by_rule": by_rule,
            "by_group": by_group, "complete": sum(1 for a in subtree if getattr(a, "status", "") == "TK_Complete"),
            "total": len(subtree), "heat": heat,
            "start": min(starts) if starts else None, "finish": max(finishes) if finishes else None}
        return subtree

    for root in children.get(None, []):
        walk(root, 0)
    return [row for row in out if row is not None]
