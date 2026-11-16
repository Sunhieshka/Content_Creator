from content_creator.api.server import run
from content_creator.config.logging_setup import setup_logging
from content_creator.config.settings import validate_environment
from content_creator.services.characters import load_env


def main(index_html) -> None:
    """index_html: the page as a string, or a function returning it (called per request)."""
    load_env()
    setup_logging()
    validate_environment(include_optional_runtime=True)
    from content_creator.frontend import prebuild

    prebuild()
    run(index_html=index_html)


if __name__ == "__main__":
    raise SystemExit("Run `python app.py` so the UI layer can provide INDEX_HTML.")
