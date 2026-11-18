import os, pty, time, sys
m, s = pty.openpty()
print(os.ttyname(s), flush=True)
time.sleep(3)
for i in range(6):
    os.write(m, bytes([0x02, 0x4D, 0x54, 0x52, i, 0x7F, 0x0D]) + b"HELLO NOVA\r\n")
    time.sleep(0.2)
time.sleep(4)
