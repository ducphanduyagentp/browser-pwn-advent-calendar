from pwn import *
import sys
HOST = 'outfoxed.be.ax'
PORT = 1337
if len(sys.argv) > 1:
    PORT = int(sys.argv[1])

exp_content = open('exp.js').read()
s = remote(HOST, PORT)
s.sendline(exp_content)
s.interactive()
s.close()
