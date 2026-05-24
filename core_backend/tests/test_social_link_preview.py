import requests

from app.domains.social.service import SocialService, preview_cache


def test_youtube_link_preview_decodes_url_and_uses_thumbnail_fallback(monkeypatch):
    preview_cache.clear()

    def fail_fetch(*args, **kwargs):
        raise requests.RequestException("blocked")

    monkeypatch.setattr("app.domains.social.service.requests.get", fail_fetch)

    service = SocialService(db=None)
    result = service.get_link_preview("https://www.youtube.com/watch%3Fv=Pni_hG0wDOo")

    assert result["url"] == "https://www.youtube.com/watch?v=Pni_hG0wDOo"
    assert result["title"] == "YouTube video"
    assert result["site_name"] == "YouTube"
    assert result["image_url"] == "https://img.youtube.com/vi/Pni_hG0wDOo/hqdefault.jpg"


def test_github_repo_link_preview_uses_repo_opengraph_fallback(monkeypatch):
    preview_cache.clear()

    def fail_fetch(*args, **kwargs):
        raise requests.RequestException("blocked")

    monkeypatch.setattr("app.domains.social.service.requests.get", fail_fetch)

    service = SocialService(db=None)
    result = service.get_link_preview("https://github.com/NguyenDuyHao-cheems/Smart_Travel_System_Food_Recommend")

    assert result["title"] == "NguyenDuyHao-cheems/Smart_Travel_System_Food_Recommend"
    assert result["site_name"] == "GitHub"
    assert result["image_url"] == (
        "https://opengraph.githubassets.com/wanderbite/"
        "NguyenDuyHao-cheems/Smart_Travel_System_Food_Recommend"
    )
