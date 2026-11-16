"""Finding logic loops (xer_checker/loops.py) in small networks where the answer is known."""

from xer_checker.loops import in_loops


def test_a_chain_has_no_loop():
    assert in_loops([("A", "B"), ("B", "C")]) == set()


def test_finds_every_activity_on_a_loop_and_none_that_only_lead_into_it():
    assert in_loops([("S", "A"), ("A", "B"), ("B", "C"), ("C", "A"), ("C", "F")]) == {"A", "B", "C"}


def test_a_link_from_an_activity_to_itself_is_a_loop():
    assert in_loops([("A", "A"), ("A", "B")]) == {"A"}


def test_finds_two_loops_that_share_an_activity():
    assert in_loops([("A", "B"), ("B", "A"), ("B", "C"), ("C", "B"), ("D", "A")]) == {"A", "B", "C"}


def test_a_diamond_is_not_a_loop():
    assert in_loops([("A", "B"), ("A", "C"), ("B", "D"), ("C", "D")]) == set()


def test_a_20000_activity_loop_doesnt_hit_the_recursion_limit():
    ids = [str(i) for i in range(20_000)]
    links = list(zip(ids, ids[1:])) + [(ids[-1], ids[0])]
    assert len(in_loops(links)) == 20_000
