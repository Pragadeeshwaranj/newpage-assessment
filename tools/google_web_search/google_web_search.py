import os
from typing import Optional

import requests


GOOGLE_SEARCH_URL = "https://www.googleapis.com/customsearch/v1"


def google_web_search(
    query: str,
    max_results: int = 5,
    api_key: Optional[str] = None,
    search_engine_id: Optional[str] = None,
) -> dict:
    """
    Search the web using Google's Custom Search JSON API.

    Args:
        query: Search query.
        max_results: Maximum number of results to return.
        api_key: Google API key. Defaults to GOOGLE_SEARCH_API_KEY.
        search_engine_id: Programmable Search Engine ID (cx).
            Defaults to GOOGLE_SEARCH_ENGINE_ID.

    Returns:
        Structured search result.
    """

    if not query or not query.strip():
        return {
            "success": False,
            "error": "Search query cannot be empty.",
        }

    if max_results <= 0:
        return {
            "success": False,
            "error": "max_results must be greater than 0.",
        }

    if max_results > 10:
        return {
            "success": False,
            "error": "max_results cannot be greater than 10.",
        }

    api_key = api_key or os.getenv("GOOGLE_SEARCH_API_KEY")
    search_engine_id = (
        search_engine_id
        or os.getenv("GOOGLE_SEARCH_ENGINE_ID")
    )

    if not api_key:
        return {
            "success": False,
            "error": "Google Search API key is not configured.",
        }

    if not search_engine_id:
        return {
            "success": False,
            "error": "Google Search Engine ID is not configured.",
        }

    try:
        response = requests.get(
            GOOGLE_SEARCH_URL,
            params={
                "key": api_key,
                "cx": search_engine_id,
                "q": query,
                "num": max_results,
            },
            timeout=10,
            headers={
                "User-Agent": "GeminiCLI-Agent/1.0",
            },
        )

        response.raise_for_status()

        data = response.json()

        results = []

        for item in data.get("items", []):
            results.append(
                {
                    "title": item.get("title", ""),
                    "url": item.get("link", ""),
                    "snippet": item.get("snippet", ""),
                    "display_url": item.get(
                        "displayLink",
                        "",
                    ),
                }
            )

        search_information = data.get(
            "searchInformation",
            {},
        )

        return {
            "success": True,
            "query": query,
            "total_results": len(results),
            "estimated_total_results": search_information.get(
                "totalResults"
            ),
            "search_time": search_information.get(
                "searchTime"
            ),
            "results": results,
        }

    except requests.Timeout:
        return {
            "success": False,
            "error": "Google web search timed out.",
        }

    except requests.HTTPError as exc:
        status_code = (
            exc.response.status_code
            if exc.response is not None
            else None
        )

        return {
            "success": False,
            "status_code": status_code,
            "error": f"Google web search HTTP error: {exc}",
        }

    except requests.RequestException as exc:
        return {
            "success": False,
            "error": f"Google web search failed: {exc}",
        }

    except ValueError:
        return {
            "success": False,
            "error": "Invalid JSON response from Google.",
        }