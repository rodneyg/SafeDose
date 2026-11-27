import importlib.util
import pathlib
import unittest
from unittest import mock


SCRIPT = pathlib.Path(__file__).parents[1] / "create-release.py"
spec = importlib.util.spec_from_file_location("create_release", SCRIPT)
create_release = importlib.util.module_from_spec(spec)
spec.loader.exec_module(create_release)


class ReleaseBumpTests(unittest.TestCase):
    def test_plain_title_ending_in_exclamation_is_patch(self):
        self.assertEqual(create_release.bump_kind("Polish wording!", []), "patch")

    def test_conventional_breaking_change_is_major(self):
        self.assertEqual(create_release.bump_kind("feat!: change API", []), "major")


class ExistingTagRetryTests(unittest.TestCase):
    @mock.patch.dict("os.environ", {"GITHUB_SHA": "abc123", "GITHUB_EVENT_HEAD_COMMIT_MESSAGE": "fix: correct release flow"}, clear=False)
    @mock.patch.object(create_release, "api")
    @mock.patch.object(create_release, "run")
    def test_existing_tag_creates_missing_release(self, run, api):
        run.side_effect = [
            mock.Mock(stdout="", returncode=0),  # latest_tag
            mock.Mock(stdout="v1.2.3\n", returncode=0),  # tag --points-at
        ]
        api.side_effect = [[], None, {"html_url": "https://github.com/rodneyg/SafeDose/releases/tag/v1.2.3"}]

        result = create_release.main()

        self.assertEqual(result, 0)
        self.assertEqual(api.call_args_list[1].args, ("GET", "/releases/tags/v1.2.3"))
        self.assertEqual(api.call_args_list[2].args[0:2], ("POST", "/releases"))
        self.assertEqual(api.call_args_list[2].args[2]["tag_name"], "v1.2.3")
        self.assertEqual(run.call_count, 2)

    @mock.patch.dict("os.environ", {"GITHUB_SHA": "abc123", "GITHUB_EVENT_HEAD_COMMIT_MESSAGE": "fix: correct release flow"}, clear=False)
    @mock.patch.object(create_release, "api")
    @mock.patch.object(create_release, "run")
    def test_existing_tag_with_release_is_idempotent(self, run, api):
        run.side_effect = [
            mock.Mock(stdout="", returncode=0),
            mock.Mock(stdout="v1.2.3\n", returncode=0),
        ]
        api.side_effect = [[], {"html_url": "https://github.com/rodneyg/SafeDose/releases/tag/v1.2.3"}]

        self.assertEqual(create_release.main(), 0)
        self.assertEqual(api.call_args_list, [mock.call("GET", "/commits/abc123/pulls"), mock.call("GET", "/releases/tags/v1.2.3")])


if __name__ == "__main__":
    unittest.main()
