from read_file import read_file


def create_test_file(tmp_path):
    file = tmp_path / "example.txt"

    file.write_text(
        "\n".join(
            [
                "line 1",
                "line 2",
                "line 3",
                "line 4",
                "line 5",
                "line 6",
                "line 7",
                "line 8",
                "line 9",
                "line 10",
            ]
        ),
        encoding="utf-8",
    )

    return file


def test_read_file(tmp_path):
    file = create_test_file(tmp_path)

    result = read_file(str(file))

    assert result["success"] is True
    assert result["total_lines"] == 10
    assert result["lines_read"] == 10

    assert result["content"] == "\n".join(
        [
            "line 1",
            "line 2",
            "line 3",
            "line 4",
            "line 5",
            "line 6",
            "line 7",
            "line 8",
            "line 9",
            "line 10",
        ]
    )


def test_read_specific_line_range(tmp_path):
    file = create_test_file(tmp_path)

    result = read_file(
        str(file),
        start_line=3,
        end_line=5,
    )

    assert result["success"] is True
    assert result["start_line"] == 3
    assert result["end_line"] == 5
    assert result["lines_read"] == 3

    assert result["content"] == "\n".join(
        [
            "line 3",
            "line 4",
            "line 5",
        ]
    )


def test_read_from_start_line(tmp_path):
    file = create_test_file(tmp_path)

    result = read_file(
        str(file),
        start_line=8,
    )

    assert result["success"] is True
    assert result["start_line"] == 8
    assert result["end_line"] == 10

    assert result["content"] == "\n".join(
        [
            "line 8",
            "line 9",
            "line 10",
        ]
    )


def test_read_until_end_line(tmp_path):
    file = create_test_file(tmp_path)

    result = read_file(
        str(file),
        end_line=3,
    )

    assert result["success"] is True
    assert result["start_line"] == 1
    assert result["end_line"] == 3

    assert result["content"] == "\n".join(
        [
            "line 1",
            "line 2",
            "line 3",
        ]
    )


def test_max_lines(tmp_path):
    file = create_test_file(tmp_path)

    result = read_file(
        str(file),
        max_lines=3,
    )

    assert result["success"] is True
    assert result["lines_read"] == 3
    assert result["truncated"] is True

    assert result["content"] == "\n".join(
        [
            "line 1",
            "line 2",
            "line 3",
        ]
    )


def test_max_lines_with_range(tmp_path):
    file = create_test_file(tmp_path)

    result = read_file(
        str(file),
        start_line=4,
        end_line=10,
        max_lines=2,
    )

    assert result["success"] is True
    assert result["start_line"] == 4
    assert result["end_line"] == 5
    assert result["lines_read"] == 2
    assert result["truncated"] is True

    assert result["content"] == "\n".join(
        [
            "line 4",
            "line 5",
        ]
    )


def test_file_does_not_exist(tmp_path):
    file = tmp_path / "does_not_exist.txt"

    result = read_file(str(file))

    assert result["success"] is False
    assert "does not exist" in result["error"]


def test_path_is_directory(tmp_path):
    folder = tmp_path / "folder"
    folder.mkdir()

    result = read_file(str(folder))

    assert result["success"] is False
    assert "not a file" in result["error"]


def test_empty_path():
    result = read_file("")

    assert result["success"] is False
    assert "cannot be empty" in result["error"]


def test_invalid_start_line(tmp_path):
    file = create_test_file(tmp_path)

    result = read_file(
        str(file),
        start_line=0,
    )

    assert result["success"] is False
    assert "start_line" in result["error"]


def test_invalid_end_line(tmp_path):
    file = create_test_file(tmp_path)

    result = read_file(
        str(file),
        end_line=0,
    )

    assert result["success"] is False
    assert "end_line" in result["error"]


def test_start_after_end(tmp_path):
    file = create_test_file(tmp_path)

    result = read_file(
        str(file),
        start_line=8,
        end_line=3,
    )

    assert result["success"] is False
    assert "start_line cannot be greater" in result["error"]


def test_invalid_max_lines(tmp_path):
    file = create_test_file(tmp_path)

    result = read_file(
        str(file),
        max_lines=0,
    )

    assert result["success"] is False
    assert "max_lines" in result["error"]


def test_read_line_beyond_file(tmp_path):
    file = create_test_file(tmp_path)

    result = read_file(
        str(file),
        start_line=100,
    )

    assert result["success"] is True
    assert result["lines_read"] == 0
    assert result["content"] == ""