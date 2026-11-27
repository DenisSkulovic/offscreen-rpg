import importlib.util
import pathlib
import tempfile
import unittest

MODULE_PATH = pathlib.Path(__file__).resolve().parents[1] / "resource-observation.py"
SPEC = importlib.util.spec_from_file_location("resource_observation", MODULE_PATH)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class ResourceObservationTests(unittest.TestCase):
    def test_zero_port_is_refused(self):
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaises(RuntimeError):
                MODULE.main(["resource-observation.py", directory, "snap", "ctx", "0", "a", "1", "b", "2"])

    def test_duplicate_sample_is_refused(self):
        inventory = {
            "obs-collector": {
                "uid": "pod-1",
                "node": "offscreen-dev-worker",
                "container": "collector",
            }
        }
        summary = {
            "pods": [
                {
                    "podRef": {"namespace": MODULE.NS, "uid": "pod-1"},
                    "containers": [
                        {
                            "name": "collector",
                            "memory": {"workingSetBytes": 1, "time": "t1"},
                            "cpu": {"usageNanoCores": 1, "time": "t1"},
                        }
                    ],
                },
                {
                    "podRef": {"namespace": MODULE.NS, "uid": "pod-1"},
                    "containers": [
                        {
                            "name": "collector",
                            "memory": {"workingSetBytes": 1, "time": "t1"},
                            "cpu": {"usageNanoCores": 1, "time": "t1"},
                        }
                    ],
                },
            ]
        }

        def fake_kub(*_args, **_kwargs):
            return summary

        original = MODULE.kub
        MODULE.kub = fake_kub
        try:
            with tempfile.TemporaryDirectory() as directory:
                with self.assertRaises(RuntimeError):
                    MODULE.cycle_sample_from_nodes(
                        "snap",
                        "ctx",
                        ["offscreen-dev-worker"],
                        inventory,
                        0,
                        pathlib.Path(directory),
                    )
        finally:
            MODULE.kub = original


if __name__ == "__main__":
    unittest.main()
