mpv-subtitles
-------------
This scrip allows selection and downloading subtitles from mpv.
Subtitles are sourced from multiple providers thanks to [subliminal](https://github.com/Diaoul/subliminal/).

setup
-----
1. Copy `config_example.py` as `config.py` in this directory and update what language or providers you want.
2. Copy `subtitles.js` into your `scripts` directory (like C:\Users\username\AppData\Roaming\mpv\scripts).
3. Copy `subtitles.conf` into your `script-opts` directory (like C:\Users\username\AppData\Roaming\mpv\script-opts).
5. Install Python 3 and run `pip install -r requirements.txt` in this directory.
6. Set python path in `subtitles.conf` (or virtualenv path if that floats your boat).
4. Set correct path in `subtitles.conf` for `subtitles.py`.
7. Run mpv and follow usage section

usage
-----
- `CTRL + D` triggers search (can be changed in `subtitles.conf` - `triggerShortcut=alt+d`)
- `Up/Down` selects subtitles
- `Left/Right` switches between pages
- `Enter` downloads and loads selected subtitles
- `Escape` cancels selection
