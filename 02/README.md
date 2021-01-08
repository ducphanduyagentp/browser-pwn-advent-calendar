# Task 02: More v8 internals - 35C3 krautflare

## Questions

* Dive more into the pipeline. For this first time, I just follow some specific points of interest in the challenge. Will need to look more into each phase and what it does.

* Why does it compile twice?

    > This will print false. When running it, you’ll notice that the function is now compiled two times. You can add the --trace-deopt flag to be informed about deoptimizations. At first, foo will be interpreted. After a while, it gets compiled and optimistically optimized assuming x is a number. The first time the compiled function is called (with x as a string), we get a deoptimization:
    ```
    [...]
    ;;; deoptimize at <poc2.js:2:27>, not a Number or Oddball
    [...]
    ```
    > Feedback updated from deoptimization at <poc2.js:2:27>, not a Number or Oddball
    > It’s updating type feedback, telling Turbofan to not assume x is a number. The second time the function is compiled, Turbofan will generate a Call to the builtin. You’ll see you now have two Turbolizer traces. The most recent shows a Call node with type PlainNumber or NaN, as we expect.

    The first time compilation happens is at about 3500-ish time the function is run, even only with the string type, it compiled and the deopts right away. Then a while after that, it compiles again. **Deopt doesn't mean going back to nothing but using built-in function so it can handle more generic typess**

* Does it take the argument type into account in the first compilation?

    Still need to dig in to this, but may be it doesn't, because deopt happened.

## V8 compilation pipeline (7.3.0)

First, it starts in `src/compiler/pipeline.cc`:

```C++
class PipelineImpl final {
 public:
  explicit PipelineImpl(PipelineData* data) : data_(data) {}

  // Helpers for executing pipeline phases.
  template <typename Phase>
  void Run();
  template <typename Phase, typename Arg0>
  void Run(Arg0 arg_0);
  template <typename Phase, typename Arg0, typename Arg1>
  void Run(Arg0 arg_0, Arg1 arg_1);

  // Step A. Run the graph creation and initial optimization passes.
  bool CreateGraph();

  // B. Run the concurrent optimization passes.
  bool OptimizeGraph(Linkage* linkage);

  // Substep B.1. Produce a scheduled graph.
  void ComputeScheduledGraph();

  // Substep B.2. Select instructions from a scheduled graph.
  bool SelectInstructions(Linkage* linkage);

  // Step C. Run the code assembly pass.
  void AssembleCode(Linkage* linkage);

  // Step D. Run the code finalization pass.
  MaybeHandle<Code> FinalizeCode();

  // Step E. Install any code dependencies.
  bool CommitDependencies(Handle<Code> code);

  void VerifyGeneratedCodeIsIdempotent();
  void RunPrintAndVerify(const char* phase, bool untyped = false);
  MaybeHandle<Code> GenerateCode(CallDescriptor* call_descriptor);
  void AllocateRegisters(const RegisterConfiguration* config,
                         CallDescriptor* call_descriptor, bool run_verifier);

  OptimizedCompilationInfo* info() const;
  Isolate* isolate() const;
  CodeGenerator* code_generator() const;

 private:
  PipelineData* const data_;
};
```

There are many phases in the pipeline, but just pay attention to the template and we can recognize how each phase is organized

* Each phase is a `struct ...Phase`
* Each has a `Run` method that carries out the logic of that phase
* Each phase has many passes that will be run on the graph used in the pipeline

Then we dive into the relevant phases in the challenge.

> Afaict, the typer runs 3 times:
> * in the typer phase
> * in the TypeNarrowingReducer (load elimination phase)
> * in the simplified lowering phase
> After the first two typing runs, the ConstantFoldingReducer will run, so if we get the typer to mark the Object.is result to always be false at this point it will simply be replaced with a false constant.
> That leaves the third typing round.


### Typer (typer.cc)

TODO

### Type Narrowing Reducer (type-narrowing-reducer.cc)

TODO

### Simplifed Lowering (simplified-lowering.cc)

TODO

## Experiments

### Experiment 1: Difference in the function call node
> However, there's one more obstacle you need to overcome. Using the naive approach, there will be a FloatExpm1 node in the graph. This node outputs a float and the SameValue node wants a pointer as input, so the compiler will insert a ChangeFloat64ToTagged node for conversion. Since the type information say that the input can never be -0, it will not include special minus zero handling and our -0 will get truncated to a regular 0.
> However, it's possible to make this a Call node instead, which will return a tagged value and the conversion does not happen.
* Without deopt
    * The function is only compiled once
    * Typer phase

        ![](img/exp-1-typer.png)
        * Math.expm1 is a NumberExpm1 node of type Number, which includes -0
        * Object.is is a SameValue node of type Boolean
        * Param is NonInternal type, as an input to SpeculativeToNumber node of type Number
    * Typed Lowering phase

        ![](img/exp-1-typed-lowering.png)
        * Object.is in replaced by an ObjectIsMinusZero node of type Boolean
    * Load Elimination nothing changed
    * Simplified Lowering phase

        ![](img/exp-1-simplified-lowering.png)
        * Math.expm1 is a Float64Expm1 node of type Number
        * Object.is is replaced by a NumberIsMinusZero of type Boolean, then goes into ChangeBitToTagged
* With deopt

## Exploitation

* Goals
    * Avoid the Math.expm1 being convereted to ranges including -0, by making
    * Avoid the Object.is node to be replaced by a false constant, too soon
