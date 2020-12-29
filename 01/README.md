# Task 01: Learning Turbofan - Google CTF 2018 Final pwn-just-in-time

## Info

* Date: 24/12/2020 - 29/12/2020

## Resources

* https://doar-e.github.io/blog/2019/01/28/introduction-to-turbofan
* https://eternalsakura13.com/2018/11/19/justintime/

## Questions

* Declaration keyword makes differences inside function but not outside?
	- let
	- var
	- nothing
* Different types of Array declaration
	- []
	- new Array
	- Array.of
* Use of %DebugPrint changes JIT code
	- Cannot use to get information of JITed array with bound check
	- Okay so no %DebugPrint inside JIT function because it's gonna affect the jitted code
* Getting to an OOB offset
	- How to craft the right range to eliminate bound check: The length of the array must include the range before AND AFTER JIT. The difference is between the real and expected range because of buggy reduction.
	- For example:
		- x + 1 + 1 + 1 is the expected range (smaller)
		- x + 3 is the real range (larger)
* WASM rwx page offset is different between versions
* Shellcode generation
	- pwntools shellcraft has execve utils but not sure why missing from latest documentation. It is on older documentation.

## Finding the correct commit from chromium version

## Differences in Array declaration (version 7.3.0 candidate)

* Layout (this is when declared globally, inside function may differ): 
	```
	arr = [1.1, 1.2, 1.3, 1.4]
	arr2 = new Array(1.2, 2, 3, 4, 5, 6);
	let arr3 = Array.of(10.1, 11, 12, 13, 14);

	pwndbg> x/40gx 0x3cff4860b2a1-1
	0x3cff4860b2a0:	0x000006ad47e81451	0x0000000400000000	=> FixedDoubleArray map | FixedDoubleArray length
	0x3cff4860b2b0:	0x3ff199999999999a	0x3ff3333333333333	=> arr[0] 				| arr[1]
	0x3cff4860b2c0:	0x3ff4cccccccccccd	0x3ff6666666666666	=> arr[2]				| arr[3]
	0x3cff4860b2d0:	0x00000b380ff02cf1	0x000006ad47e80c19  => JSArray map 			| properties
	0x3cff4860b2e0:	0x00003cff4860b2a1	0x0000000400000000	=> elements				| JSArray length


	0x3cff4860b2f0:	0x00000b380ff02cf1	0x000006ad47e80c19	=> JSArray map			| properties
	0x3cff4860b300:	0x00003cff4860b321	0x0000000600000000	=> elements				| JSArray length
	0x3cff4860b310:	0x000006ad47e85209	0x00001ca06da1dec9	=> ??					| ??
	0x3cff4860b320:	0x000006ad47e81451	0x0000000600000000	=> FixedDoubleArray map	| FixedDoubleArray length
	0x3cff4860b330:	0x3ff3333333333333	0x4000000000000000	=> arr2[0]				| arr2[1]
	0x3cff4860b340:	0x4008000000000000	0x4010000000000000	=> arr2[2]				| arr2[3]
	0x3cff4860b350:	0x4014000000000000	0x4018000000000000	=> arr2[4]				| arr2[5]


	0x3cff4860b360:	0x00000b380ff02d41	0x000006ad47e80c19	=> JSArray map			| properties
	0x3cff4860b370:	0x00003cff4860b3b9	0x0000000500000000	=> elements				| JSArray length
	0x3cff4860b380:	0x000006ad47e807a9	0x0000000500000000	=> ??					| length?
	0x3cff4860b390:	0x000006ad47e805a9	0x000006ad47e805a9	=> hole??				| ??
	0x3cff4860b3a0:	0x000006ad47e805a9	0x000006ad47e805a9	=> ??					| ??
	0x3cff4860b3b0:	0x000006ad47e805a9	0x000006ad47e81451	=> ??					| FixedDoubleArray map
	0x3cff4860b3c0:	0x0000000500000000	0x4024333333333333	=> FixedDoubleArray length | arr3[0]
	0x3cff4860b3d0:	0x4026000000000000	0x4028000000000000	=> arr3[1]				| arr3[2]
	0x3cff4860b3e0:	0x402a000000000000	0x402c000000000000	=> arr3[3]				| arr3[4]
	```

* `arr = [1.1, 1.2, 1.3, 1.4]`
	- `JSArray` is **AFTER** `FixedDoubleArray`
	- Type: **PACKED_DOUBLE_ELEMENTS**
	```DebugPrint: 0x3cff4860b2d1: [JSArray]
	- map: 0x0b380ff02cf1 <Map(PACKED_DOUBLE_ELEMENTS)> [FastProperties]
	- prototype: 0x1ca06da0fdb1 <JSArray[0]>
	- elements: 0x3cff4860b2a1 <FixedDoubleArray[4]> [PACKED_DOUBLE_ELEMENTS]
	- length: 4
	- properties: 0x06ad47e80c19 <FixedArray[0]> {
		#length: 0x1be1c90801a1 <AccessorInfo> (const accessor descriptor)
	}
	- elements: 0x3cff4860b2a1 <FixedDoubleArray[4]> {
			0: 1.1
			1: 1.2
			2: 1.3
			3: 1.4
	}
	0xb380ff02cf1: [Map]
	- type: JS_ARRAY_TYPE
	- instance size: 32
	- inobject properties: 0
	- elements kind: PACKED_DOUBLE_ELEMENTS
	- unused property fields: 0
	- enum length: invalid
	- back pointer: 0x0b380ff02ca1 <Map(HOLEY_SMI_ELEMENTS)>
	- prototype_validity cell: 0x1be1c9080601 <Cell value= 1>
	- instance descriptors #1: 0x1ca06da109f1 <DescriptorArray[1]>
	- layout descriptor: (nil)
	- transitions #1: 0x1ca06da10961 <TransitionArray[4]>Transition array #1:
		0x06ad47e84b71 <Symbol: (elements_transition_symbol)>: (transition to HOLEY_DOUBLE_ELEMENTS) -> 0x0b380ff02d41 <Map(HOLEY_DOUBLE_ELEMENTS)>

	- prototype: 0x1ca06da0fdb1 <JSArray[0]>
	- constructor: 0x1ca06da0fb79 <JSFunction Array (sfi = 0x1be1c908ab01)>
	- dependent code: 0x06ad47e802b9 <Other heap object (WEAK_FIXED_ARRAY_TYPE)>
	- construction counter: 0
	```
* `arr2 = new Array(1.2, 2, 3, 4, 5, 6);`
	- `JSArray` is **BEFORE** `FixedDoubleArray`
	- Type: **PACKED_DOUBLE_ELEMENTS**
	```DebugPrint: 0x3cff4860b2f1: [JSArray]
	- map: 0x0b380ff02cf1 <Map(PACKED_DOUBLE_ELEMENTS)> [FastProperties]
	- prototype: 0x1ca06da0fdb1 <JSArray[0]>
	- elements: 0x3cff4860b321 <FixedDoubleArray[6]> [PACKED_DOUBLE_ELEMENTS]
	- length: 6
	- properties: 0x06ad47e80c19 <FixedArray[0]> {
		#length: 0x1be1c90801a1 <AccessorInfo> (const accessor descriptor)
	}
	- elements: 0x3cff4860b321 <FixedDoubleArray[6]> {
			0: 1.2
			1: 2
			2: 3
			3: 4
			4: 5
			5: 6
	}
	0xb380ff02cf1: [Map]
	- type: JS_ARRAY_TYPE
	- instance size: 32
	- inobject properties: 0
	- elements kind: PACKED_DOUBLE_ELEMENTS
	- unused property fields: 0
	- enum length: invalid
	- back pointer: 0x0b380ff02ca1 <Map(HOLEY_SMI_ELEMENTS)>
	- prototype_validity cell: 0x1be1c9080601 <Cell value= 1>
	- instance descriptors #1: 0x1ca06da109f1 <DescriptorArray[1]>
	- layout descriptor: (nil)
	- transitions #1: 0x1ca06da10961 <TransitionArray[4]>Transition array #1:
		0x06ad47e84b71 <Symbol: (elements_transition_symbol)>: (transition to HOLEY_DOUBLE_ELEMENTS) -> 0x0b380ff02d41 <Map(HOLEY_DOUBLE_ELEMENTS)>

	- prototype: 0x1ca06da0fdb1 <JSArray[0]>
	- constructor: 0x1ca06da0fb79 <JSFunction Array (sfi = 0x1be1c908ab01)>
	- dependent code: 0x06ad47e802b9 <Other heap object (WEAK_FIXED_ARRAY_TYPE)>
	- construction counter: 0
	```
* `let arr3 = Array.of(10.1, 11, 12, 13, 14);`
	- `JSArray` is **BEFORE** `FixedDoubleArray`
	- Type: **HOLEY_DOUBLE_ELEMENTS**
```DebugPrint: 0x3cff4860b361: [JSArray]
 - map: 0x0b380ff02d41 <Map(HOLEY_DOUBLE_ELEMENTS)> [FastProperties]
 - prototype: 0x1ca06da0fdb1 <JSArray[0]>
 - elements: 0x3cff4860b3b9 <FixedDoubleArray[5]> [HOLEY_DOUBLE_ELEMENTS]
 - length: 5
 - properties: 0x06ad47e80c19 <FixedArray[0]> {
    #length: 0x1be1c90801a1 <AccessorInfo> (const accessor descriptor)
 }
 - elements: 0x3cff4860b3b9 <FixedDoubleArray[5]> {
           0: 10.1
           1: 11
           2: 12
           3: 13
           4: 14
 }
0xb380ff02d41: [Map]
 - type: JS_ARRAY_TYPE
 - instance size: 32
 - inobject properties: 0
 - elements kind: HOLEY_DOUBLE_ELEMENTS
 - unused property fields: 0
 - enum length: invalid
 - back pointer: 0x0b380ff02cf1 <Map(PACKED_DOUBLE_ELEMENTS)>
 - prototype_validity cell: 0x1be1c9080601 <Cell value= 1>
 - instance descriptors #1: 0x1ca06da109f1 <DescriptorArray[1]>
 - layout descriptor: (nil)
 - transitions #1: 0x1ca06da10991 <TransitionArray[4]>Transition array #1:
     0x06ad47e84b71 <Symbol: (elements_transition_symbol)>: (transition to PACKED_ELEMENTS) -> 0x0b380ff02d91 <Map(PACKED_ELEMENTS)>

 - prototype: 0x1ca06da0fdb1 <JSArray[0]>
 - constructor: 0x1ca06da0fb79 <JSFunction Array (sfi = 0x1be1c908ab01)>
 - dependent code: 0x06ad47e802b9 <Other heap object (WEAK_FIXED_ARRAY_TYPE)>
 - construction counter: 0
```