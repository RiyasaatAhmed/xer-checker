"""The WBS tree with its numbers rolled up: how many activities each group holds, how many are
flagged, and the dates they span. Feeds the schedule map, which shows where the problems are.

Pure: it takes plain records (schedule.WbsNode and anything with the fields of schedule.Activity).
"""

# ---------- Constants ----------

MAX_DEPTH = 12  # a safety stop for a tree that loops back on itself; real P6 trees are 3 to 6 deep


def structure(nodes, activities, flags, rule_count):
    """The groups that hold activities, in tree order, each with its subtree's numbers.

    flags: {activity code: set of rule numbers (0, 1, ...) that flag it}
    Returns [{id, parent_id, name, depth, checked, flagged, by_rule, start, finish}, ...].
    checked is the activities DCMA checks; flagged is how many of those any rule flags.
    """
    children = {}
    for node in sorted(nodes, key=lambda n: n.seq):
        children.setdefault(node.parent_id, []).append(node)
    own = {}  # WBS ID -> the activities directly in it
    for a in activities:
        own.setdefault(a.p6_wbs_id, []).append(a)

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
        starts = [a.start for a in subtree if a.start]
        finishes = [a.finish for a in subtree if a.finish]
        out[slot] = {
            "id": node.p6_id, "parent_id": node.parent_id, "name": node.name, "depth": depth,
            "checked": len(checked), "flagged": sum(1 for a in checked if flags.get(a.code)), "by_rule": by_rule,
            "start": min(starts) if starts else None, "finish": max(finishes) if finishes else None}
        return subtree

    for root in children.get(None, []):
        walk(root, 0)
    return [row for row in out if row is not None]
