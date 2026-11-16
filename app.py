"""Content Creator entry point: `python app.py`.

The UI lives in frontend/ (index.html shell, styles.css, app.jsx) and static/*.jsx.
content_creator/frontend.py turns them into the page: precompiled by
scripts/build-frontend.js (automatic, needs Node), or compiled in the browser by Babel
as a fallback. INDEX_HTML is that in-browser Babel page, kept for tools and tests.
"""
from content_creator.frontend import FRONTEND_DIR, _read, babel_page, current_page  # noqa: F401

INDEX_HTML = babel_page()

if __name__ == "__main__":
    from content_creator.main import main

    main(current_page)
