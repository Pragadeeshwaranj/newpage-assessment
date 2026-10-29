from typing import Optional


def read_process_output(
    process: dict,
    include_stderr: bool = True,
    clear: bool = False,
) -> dict:
    """
    Read output collected from a background process.

    Args:
        process: Process information returned by spawn_background_process.
        include_stderr: Whether stderr should be included.
        clear: Whether to clear the returned output after reading.

    Returns:
        Structured process output.
    """

    if not process:
        return {
            "success": False,
            "error": "Process information cannot be empty.",
        }

    if "pid" not in process:
        return {
            "success": False,
            "error": "Process information must contain a pid.",
        }

    pid = process["pid"]

    if not isinstance(pid, int) or pid <= 0:
        return {
            "success": False,
            "error": "Invalid process ID.",
        }

    output = process.get("output", "")
    stderr = process.get("stderr", "")

    result = {
        "success": True,
        "pid": pid,
        "stdout": output,
        "stderr": stderr if include_stderr else "",
        "output": output,
        "running": process.get("running", False),
        "exit_code": process.get("exit_code"),
    }

    if clear:
        process["output"] = ""
        process["stderr"] = ""

    return result