
## Serial captures from the Nova (Oct 25, 2026)
Adapter: FTDI USB serial (`/dev/tty.usbserial-AK08P9HD`) on Ferris's Mac. No commands were sent; these captures are receive-only.
- **Capture 1 (115200 baud):** unreadable. Nearly every byte was 00/E0/FC/1C/80, and bit runs came in multiples of 3. That's the pattern of a sender running at one-third the receiver's speed, so the Nova is at about 38400 baud.
- **Capture 2 (38400 8N1, 15:30–15:32 CDT):** mostly readable, so 38400 is right.
  - Packets start with `AA`; the second byte looks like a type or address.
  - A steady cycle about every 50 ms: `AA 18 08 …` (15 bytes), `AA 18 06 00 00 12 00…` (12 bytes) and `AA 13 09 …` (9 bytes).
  - Readable text: `NOVA1`, `v5.23` (probably model and firmware), `RIA 0.23`, and a clock `00:00:SS` counting once a second (07, 08, 09 at 15:31:11–13), then held at `00:00:14`. That looks like a take's running time, then its final length. Not yet confirmed with Ferris.
  - **Bit errors:** packets that repeat show one-bit-shifted variants about 30% of the time (`0C`↔`06`, `62`↔`31`, `80`↔`C0`). The all-zero packet is always clean. This points to signal timing or levels rather than wrong settings. Suspects: an RS-232 vs RS-422 mismatch between the adapter and the Nova's port mode, an off-standard clock, or cable/ground. Needs a clean signal before decoding.
