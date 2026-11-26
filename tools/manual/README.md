# The manual PDF (from 0.6.12)

The manual is the Claude Doc "Nova Relay User Manual". Its pictures can't come through the Doc's own PDF export, so the
shipped `nova-remote/Nova Relay User Manual.pdf` (and `public/manual.pdf`) is made here:

1. Export the Doc's tab as HTML.
2. `node tools/manual/render.js <that.html> "nova-remote/Nova Relay User Manual.pdf"`
   - pictures: `images/`, matched to the Doc's blob ids in `images.json` (a picture added to the Doc needs its file and a line here);
   - fonts: the app's own (Saira Condensed, Barlow, Martian Mono; SIL Open Font License, texts in `fonts/`).

Retaking the pictures: the app's fonts must be installed (fc-list), then `cd tools/manual/shots && node shoot.js`
(prototype with its sample setup, wireless/presets/warnings and faders off, "prototype" label hidden, fixed levels,
numbered callouts on the main screen and the strip). It writes PNGs; convert to JPEG (quality 88) into `images/`,
upload them to the Doc and update `images.json` if the blob ids change.
