import pytest
from pathlib import Path

from list_directory import list_directory


class TestListDirectory:

    def test_list_current_directory(self, tmp_path):
        # Arrange
        (tmp_path / "file1.txt").write_text("hello")
        (tmp_path / "file2.txt").write_text("world")
        (tmp_path / "src").mkdir()

        # Act
        result = list_directory(str(tmp_path))

        # Assert
        assert result["success"] is True
        assert result["path"] == str(tmp_path.resolve())

        names = [entry["name"] for entry in result["entries"]]

        assert "file1.txt" in names
        assert "file2.txt" in names
        assert "src" in names

    def test_identifies_files_and_directories(self, tmp_path):
        # Arrange
        (tmp_path / "test.py").write_text("print('hello')")
        (tmp_path / "src").mkdir()

        # Act
        result = list_directory(str(tmp_path))

        # Assert
        entries = {
            entry["name"]: entry["type"]
            for entry in result["entries"]
        }

        assert entries["test.py"] == "file"
        assert entries["src"] == "directory"

    def test_empty_directory(self, tmp_path):
        # Act
        result = list_directory(str(tmp_path))

        # Assert
        assert result["success"] is True
        assert result["entries"] == []

    def test_non_existing_directory(self, tmp_path):
        # Arrange
        invalid_path = tmp_path / "does-not-exist"

        # Act
        result = list_directory(str(invalid_path))

        # Assert
        assert result["success"] is False
        assert "does not exist" in result["error"]

    def test_path_is_file(self, tmp_path):
        # Arrange
        file_path = tmp_path / "test.txt"
        file_path.write_text("hello")

        # Act
        result = list_directory(str(file_path))

        # Assert
        assert result["success"] is False
        assert "not a directory" in result["error"]

    def test_home_directory_expansion(self):
        # Act
        result = list_directory("~")

        # Assert
        assert result["success"] is True
        assert Path(result["path"]).resolve() == Path.home().resolve()

    def test_directory_names_are_sorted(self, tmp_path):
        # Arrange
        (tmp_path / "zebra").mkdir()
        (tmp_path / "Apple").mkdir()
        (tmp_path / "banana.txt").write_text("hello")

        # Act
        result = list_directory(str(tmp_path))

        # Assert
        names = [entry["name"] for entry in result["entries"]]

        assert names == ["Apple", "zebra", "banana.txt"]

    def test_nested_directory(self, tmp_path):
        # Arrange
        src = tmp_path / "src"
        src.mkdir()

        (src / "main.py").write_text("print('hello')")
        (src / "utils").mkdir()
        (src / "utils" / "helper.py").write_text("def helper(): pass")

        # Act
        result = list_directory(str(src))

        # Assert
        names = [entry["name"] for entry in result["entries"]]

        assert "main.py" in names
        assert "utils" in names
        assert len(names) == 2