"""How far each upload has got (modules/uploads/progress.py), for the progress bar."""

from modules.uploads import progress

ID = "8f14e45f-ceea-467a-9575-6c1f2a1b0001"


def test_each_stage_moves_the_percent_forward_to_100():
    seen = []
    for stage in ("received", "read", "checked", "summarized", "saved"):
        progress.report(ID, stage)
        seen.append(progress.progress_of(ID)["percent"])
    assert seen == sorted(seen) and seen[0] == 45 and seen[-1] == 100
    assert progress.progress_of(ID)["stage"] == "Done"


def test_an_unknown_id_has_no_progress():
    assert progress.progress_of("never-sent-0000") is None


def test_an_odd_id_or_stage_is_ignored():
    progress.report("../../etc/passwd", "saved")
    progress.report("short", "saved")
    progress.report(ID + "-2", "no-such-stage")
    assert progress.progress_of("../../etc/passwd") is None and progress.progress_of(ID + "-2") is None
