"""Tests for club coordinate enrichment in wikidata.py."""

import json
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from worldcup.extract.wikidata import _search_club_entity, enrich_club_coords


@pytest.fixture
def mock_search_response():
    """Wikidata wbsearchentities response for a known football club."""
    return {
        "search": [
            {
                "id": "Q9616",
                "description": "association football club in London, England",
            }
        ]
    }


@pytest.fixture
def mock_entity_with_coords():
    """Wikidata entity with P625 coordinate claim."""
    return {
        "Q9616": {
            "claims": {
                "P625": [
                    {
                        "mainsnak": {
                            "datavalue": {
                                "value": {
                                    "latitude": 51.5549,
                                    "longitude": -0.1084,
                                }
                            }
                        }
                    }
                ]
            }
        }
    }


class TestEnrichClubCoordsReturnsCoordsForKnownClub:
    def test_enrich_club_coords_returns_coords_for_known_club(
        self, tmp_path, mock_entity_with_coords
    ):
        cache_path = tmp_path / "club_cache.json"

        with (
            patch("worldcup.extract.wikidata._search_club_entity") as mock_search,
            patch("worldcup.extract.wikidata._fetch_entities") as mock_fetch,
            patch("worldcup.extract.wikidata.httpx.Client") as mock_client_cls,
        ):
            mock_search.return_value = {"Arsenal F.C.": "Q9616"}
            mock_fetch.return_value = mock_entity_with_coords
            mock_client_cls.return_value.__enter__ = MagicMock(return_value=MagicMock())
            mock_client_cls.return_value.__exit__ = MagicMock(return_value=False)

            result = enrich_club_coords(["Arsenal F.C."], cache_path=cache_path)

        assert "Arsenal F.C." in result
        assert result["Arsenal F.C."]["club_lat"] == pytest.approx(51.5549)
        assert result["Arsenal F.C."]["club_lon"] == pytest.approx(-0.1084)


class TestEnrichClubCoordsReturnsNoneForUnknownClub:
    def test_enrich_club_coords_returns_none_for_unknown_club(self, tmp_path):
        cache_path = tmp_path / "club_cache.json"

        with (
            patch("worldcup.extract.wikidata._search_club_entity") as mock_search,
            patch("worldcup.extract.wikidata._fetch_entities") as mock_fetch,
            patch("worldcup.extract.wikidata.httpx.Client") as mock_client_cls,
        ):
            mock_search.return_value = {}  # no QID found
            mock_client_cls.return_value.__enter__ = MagicMock(return_value=MagicMock())
            mock_client_cls.return_value.__exit__ = MagicMock(return_value=False)

            result = enrich_club_coords(["Nonexistent FC"], cache_path=cache_path)

        assert "Nonexistent FC" in result
        assert result["Nonexistent FC"]["club_lat"] is None
        assert result["Nonexistent FC"]["club_lon"] is None
        mock_fetch.assert_not_called()


class TestEnrichClubCoordsUsesCache:
    def test_enrich_club_coords_uses_cache(self, tmp_path):
        cache_path = tmp_path / "club_cache.json"
        cached_data = {
            "Arsenal F.C.": {"club_lat": 51.5549, "club_lon": -0.1084}
        }
        cache_path.write_text(json.dumps(cached_data), encoding="utf-8")

        with (
            patch("worldcup.extract.wikidata._search_club_entity") as mock_search,
            patch("worldcup.extract.wikidata.httpx.Client") as mock_client_cls,
        ):
            result = enrich_club_coords(["Arsenal F.C."], cache_path=cache_path)

        # Should return cached data without calling search or creating a client
        assert result["Arsenal F.C."]["club_lat"] == pytest.approx(51.5549)
        assert result["Arsenal F.C."]["club_lon"] == pytest.approx(-0.1084)
        mock_search.assert_not_called()
        mock_client_cls.assert_not_called()
