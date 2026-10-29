from unittest.mock import Mock, patch

from google_web_search import google_web_search


def test_google_web_search():
    mock_response = Mock()

    mock_response.raise_for_status.return_value = None

    mock_response.json.return_value = {
        "searchInformation": {
            "totalResults": "125000",
            "searchTime": 0.245,
        },
        "items": [
            {
                "title": "Python Documentation",
                "link": "https://docs.python.org/",
                "snippet": "Official Python documentation.",
                "displayLink": "docs.python.org",
            },
            {
                "title": "Python Tutorial",
                "link": "https://docs.python.org/tutorial/",
                "snippet": "Python tutorial.",
                "displayLink": "docs.python.org",
            },
        ],
    }

    with patch(
        "google_web_search.requests.get",
        return_value=mock_response,
    ):
        result = google_web_search(
            "Python",
            api_key="test-key",
            search_engine_id="test-engine",
        )

    assert result["success"] is True
    assert result["query"] == "Python"
    assert result["total_results"] == 2
    assert result["estimated_total_results"] == "125000"

    assert (
        result["results"][0]["title"]
        == "Python Documentation"
    )

    assert (
        result["results"][0]["url"]
        == "https://docs.python.org/"
    )


def test_empty_query():
    result = google_web_search(
        "",
        api_key="test-key",
        search_engine_id="test-engine",
    )

    assert result["success"] is False
    assert "cannot be empty" in result["error"]


def test_invalid_max_results():
    result = google_web_search(
        "Python",
        max_results=0,
        api_key="test-key",
        search_engine_id="test-engine",
    )

    assert result["success"] is False
    assert "greater than 0" in result["error"]


def test_max_results_greater_than_10():
    result = google_web_search(
        "Python",
        max_results=11,
        api_key="test-key",
        search_engine_id="test-engine",
    )

    assert result["success"] is False
    assert "greater than 10" in result["error"]


def test_missing_api_key():
    with patch.dict(
        "os.environ",
        {},
        clear=True,
    ):
        result = google_web_search(
            "Python",
            search_engine_id="test-engine",
        )

    assert result["success"] is False
    assert "API key" in result["error"]


def test_missing_search_engine_id():
    with patch.dict(
        "os.environ",
        {},
        clear=True,
    ):
        result = google_web_search(
            "Python",
            api_key="test-key",
        )

    assert result["success"] is False
    assert "Search Engine ID" in result["error"]


def test_google_search_timeout():
    with patch(
        "google_web_search.requests.get",
        side_effect=__import__("requests").Timeout(),
    ):
        result = google_web_search(
            "Python",
            api_key="test-key",
            search_engine_id="test-engine",
        )

    assert result["success"] is False
    assert "timed out" in result["error"]


def test_google_search_http_error():
    import requests

    response = Mock()
    response.status_code = 403

    error = requests.HTTPError(
        "403 Forbidden",
        response=response,
    )

    with patch(
        "google_web_search.requests.get",
        side_effect=error,
    ):
        result = google_web_search(
            "Python",
            api_key="test-key",
            search_engine_id="test-engine",
        )

    assert result["success"] is False
    assert result["status_code"] == 403


def test_google_search_request_error():
    import requests

    with patch(
        "google_web_search.requests.get",
        side_effect=requests.RequestException(
            "Connection failed"
        ),
    ):
        result = google_web_search(
            "Python",
            api_key="test-key",
            search_engine_id="test-engine",
        )

    assert result["success"] is False
    assert "failed" in result["error"]


def test_google_search_invalid_json():
    mock_response = Mock()

    mock_response.raise_for_status.return_value = None
    mock_response.json.side_effect = ValueError()

    with patch(
        "google_web_search.requests.get",
        return_value=mock_response,
    ):
        result = google_web_search(
            "Python",
            api_key="test-key",
            search_engine_id="test-engine",
        )

    assert result["success"] is False
    assert "Invalid JSON" in result["error"]