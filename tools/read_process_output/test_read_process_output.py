from read_process_output import read_process_output


def test_read_process_output():
    process = {
        "pid": 12345,
        "output": "Hello World\n",
        "stderr": "",
        "running": True,
        "exit_code": None,
    }

    result = read_process_output(process)

    assert result["success"] is True
    assert result["pid"] == 12345
    assert result["stdout"] == "Hello World\n"
    assert result["stderr"] == ""
    assert result["output"] == "Hello World\n"
    assert result["running"] is True
    assert result["exit_code"] is None


def test_read_process_output_with_stderr():
    process = {
        "pid": 12345,
        "output": "Application started\n",
        "stderr": "Warning: something happened\n",
        "running": True,
        "exit_code": None,
    }

    result = read_process_output(process)

    assert result["success"] is True
    assert result["stdout"] == "Application started\n"
    assert result["stderr"] == "Warning: something happened\n"


def test_read_process_output_without_stderr():
    process = {
        "pid": 12345,
        "output": "Application started\n",
        "stderr": "Warning message\n",
        "running": True,
        "exit_code": None,
    }

    result = read_process_output(
        process,
        include_stderr=False,
    )

    assert result["success"] is True
    assert result["stdout"] == "Application started\n"
    assert result["stderr"] == ""


def test_read_process_output_clear():
    process = {
        "pid": 12345,
        "output": "Hello\n",
        "stderr": "Warning\n",
        "running": True,
        "exit_code": None,
    }

    result = read_process_output(
        process,
        clear=True,
    )

    assert result["success"] is True
    assert result["stdout"] == "Hello\n"
    assert result["stderr"] == "Warning\n"

    assert process["output"] == ""
    assert process["stderr"] == ""


def test_read_empty_process_output():
    process = {
        "pid": 12345,
        "output": "",
        "stderr": "",
        "running": True,
        "exit_code": None,
    }

    result = read_process_output(process)

    assert result["success"] is True
    assert result["stdout"] == ""
    assert result["stderr"] == ""


def test_read_completed_process_output():
    process = {
        "pid": 12345,
        "output": "Build completed\n",
        "stderr": "",
        "running": False,
        "exit_code": 0,
    }

    result = read_process_output(process)

    assert result["success"] is True
    assert result["running"] is False
    assert result["exit_code"] == 0
    assert result["stdout"] == "Build completed\n"


def test_read_failed_process_output():
    process = {
        "pid": 12345,
        "output": "",
        "stderr": "Build failed\n",
        "running": False,
        "exit_code": 1,
    }

    result = read_process_output(process)

    assert result["success"] is True
    assert result["running"] is False
    assert result["exit_code"] == 1
    assert result["stderr"] == "Build failed\n"


def test_empty_process():
    result = read_process_output({})

    assert result["success"] is False
    assert "cannot be empty" in result["error"]


def test_process_without_pid():
    process = {
        "output": "Hello",
        "stderr": "",
    }

    result = read_process_output(process)

    assert result["success"] is False
    assert "pid" in result["error"]


def test_invalid_pid():
    process = {
        "pid": -1,
        "output": "",
        "stderr": "",
    }

    result = read_process_output(process)

    assert result["success"] is False
    assert "Invalid process ID" in result["error"]


def test_non_integer_pid():
    process = {
        "pid": "12345",
        "output": "",
        "stderr": "",
    }

    result = read_process_output(process)

    assert result["success"] is False
    assert "Invalid process ID" in result["error"]