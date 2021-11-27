import hashlib
import json
import logging
import os
import pickle
import sys
from sys import argv
from time import time
from typing import Any

from subliminal import scan_video, list_subtitles, region, compute_score, download_subtitles
from subliminal.providers.addic7ed import Addic7edSubtitle
from subliminal.providers.opensubtitles import OpenSubtitlesSubtitle
from subliminal.providers.podnapisi import PodnapisiSubtitle

import config


def clear_cache():
    entries: Any = os.scandir(config.cache_path)
    for entry in entries:
        if entry.name.endswith(".cache"):
            timestamp = os.path.getmtime(entry.path)
            if timestamp < time() - config.cache_lifetime:
                os.unlink(entry.path)


def run():
    clear_cache()

    action = argv[1] if len(argv) > 1 else None

    region.configure("dogpile.cache.memory")

    if action == "search":
        path = argv[2] if len(argv) > 2 else None

        hash = hashlib.sha1(path.encode("utf-8")).hexdigest()
        cache_file = os.path.join(config.cache_path, "%s.cache" % hash)
        if os.path.exists(cache_file):
            with open(cache_file, "rb") as file:
                video, subtitles = pickle.load(file)
        else:
            video = scan_video(path)
            subtitles = list_subtitles(
                {video}, config.languages,
                providers=config.providers, provider_configs=config.providers_auth
            )
            with open(cache_file, "wb") as file:
                pickle.dump((video, subtitles), file)

        items = []
        zeros = []
        for subtitle in subtitles[video]:
            id = "%s-%s" % (subtitle.provider_name, subtitle.id)

            if isinstance(subtitle, PodnapisiSubtitle):
                name = subtitle.title
                season = subtitle.season
                episode = subtitle.episode
                year = subtitle.year
            elif isinstance(subtitle, OpenSubtitlesSubtitle):
                name = subtitle.movie_name
                season = subtitle.series_season
                episode = subtitle.series_episode
                year = subtitle.movie_year
            elif isinstance(subtitle, Addic7edSubtitle):
                name = subtitle.title
                season = subtitle.season
                episode = subtitle.episode
                year = subtitle.year
            else:
                continue

            if season and episode:
                name += " S%sE%s" % (str(season).zfill(2), str(episode).zfill(2))
            if year:
                name += " (%s)" % year

            name += " [%s]" % subtitle.language
            if subtitle.hearing_impaired:
                if config.avoid_hearing_impaired:
                    continue
                name += " [CC]"

            name += " [%s]" % subtitle.provider_name

            item = {
                "id": id,
                "name": name,
                "score": compute_score(subtitle, video),
            }

            if item["score"] <= 0:
                zeros.append(item)
            else:
                items.append(item)

        if len(items) == 0:
            items = zeros
        items = sorted(items, key=lambda item: item["score"], reverse=True)

        print(json.dumps(items, indent=True))

    elif action == "download":
        path = argv[2] if len(argv) > 2 else None
        subtitle_id = argv[3] if len(argv) > 3 else None
        provider_name, subtitle_id = subtitle_id.split("-", maxsplit=1)

        found = None
        hash = hashlib.sha1(path.encode("utf-8")).hexdigest()
        cache_file = os.path.join(config.cache_path, "%s.cache" % hash)
        if os.path.exists(cache_file):
            with open(cache_file, "rb") as file:
                video, subtitles = pickle.load(file)

            for subtitle in subtitles[video]:
                if subtitle.provider_name == provider_name and subtitle.id == subtitle_id:
                    download_subtitles([subtitle], providers=config.providers, provider_configs=config.providers_auth)
                    found = subtitle
                    break

        if found is None:
            result = {"status": "not-found"}
        else:
            subtitles_path, _ = os.path.splitext(path)
            subtitles_path += ".%s.srt" % found.language
            with open(subtitles_path, "wb") as file:
                file.write(found.content)

            result = {"status": "found", "path": subtitles_path}

        print(json.dumps(result, indent=True))


try:
    run()
except KeyboardInterrupt:
    exit(1)
except SystemExit:
    raise
except:
    logging.exception(sys.exc_info()[0])
    exit(1)
