import logging
import os

from babelfish import Language

project_dir = os.path.realpath(os.path.dirname(__file__))
cache_path = os.path.join(project_dir, "cache")
cache_lifetime = 3600 * 12
log_level = logging.INFO

# languages needs to be ISO 639-3 https://cs.wikipedia.org/wiki/Seznam_k%C3%B3d%C5%AF_ISO_639-1
# eng, ces, ...
languages = {Language("eng")}
providers = [
    "podnapisi",
    "opensubtitles",
    "opensubtitlescom",
    "addic7ed",
    "gestdown",
    "tvsubtitles",
    "napiprojekt",
]
providers_auth = {
    "opensubtitles": {"username": "user", "password": "mlask"},
    "opensubtitlescom": {"username": "email", "password": "mlask"},
    "addic7ed": {"username": "user", "password": "mlask"},
}
avoid_hearing_impaired = True
