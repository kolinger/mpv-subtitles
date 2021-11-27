import os

from babelfish import Language

cache_path = os.path.join(os.path.dirname(__file__), "cache")
cache_lifetime = 3600 * 12

# languages needs to be ISO 639-3 https://cs.wikipedia.org/wiki/Seznam_k%C3%B3d%C5%AF_ISO_639-1
# eng, ces, ...
languages = {Language("eng")}
providers = ["podnapisi", "opensubtitles", "addic7ed"]
providers_auth = {
    "opensubtitles": {"username": "user", "password": "mlask"},
    "addic7ed": {"username": "user", "password": "mlask"},
}
avoid_hearing_impaired = True
