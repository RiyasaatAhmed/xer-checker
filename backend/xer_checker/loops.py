"""Logic loops: the activities on a circular chain of links, like A -> B -> C -> A.

P6 can't schedule a loop: no activity in it can start until another one in it finishes.
The search is Tarjan's strongly connected components, without recursion, so a file of 20,000
activities can't hit Python's recursion limit.
"""


def in_loops(links):
    """The IDs of every activity on a loop. links: [(earlier ID, later ID)]. A link from an activity to itself is a loop."""
    after, looped = {}, set()
    for earlier, later in links:
        after.setdefault(earlier, []).append(later)
        after.setdefault(later, [])
        if earlier == later:
            looped.add(earlier)
    order, low, on_stack, stack, count = {}, {}, set(), [], 0
    for root in after:
        if root in order:
            continue
        work = [(root, 0)]  # (activity, how many of its links are done)
        while work:
            node, done = work.pop()
            if done == 0:  # first visit
                order[node] = low[node] = count
                count += 1
                stack.append(node)
                on_stack.add(node)
            nexts = after[node]
            if done < len(nexts):
                work.append((node, done + 1))  # come back for the next link
                child = nexts[done]
                if child not in order:
                    work.append((child, 0))
                elif child in on_stack:
                    low[node] = min(low[node], order[child])
                continue
            for child in nexts:  # all links done: take the lowest link from the children it reached
                if child in on_stack:
                    low[node] = min(low[node], low[child])
            if low[node] == order[node]:  # node heads a group of activities that all reach each other
                group = []
                while True:
                    member = stack.pop()
                    on_stack.discard(member)
                    group.append(member)
                    if member == node:
                        break
                if len(group) > 1:
                    looped.update(group)
    return looped
