function foo(x) {
  //let a = [0.1, 0.2, 0.3, 0.4];
  //let o = {mz: -0};
  //let b = Object.is(Math.expm1(x), o.mz);
  //return a[b * 4];
  return Object.is(Math.expm1(x), -0);
}

foo(0);
for (var i = 0; i < 0x10000; i++) {
  foo("0");
}

console.log(foo(-0));