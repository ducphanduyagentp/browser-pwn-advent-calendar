# Task 02: More v8 internals - 35C3 krautflare

## Questions

* Dive more into the pipeline. For this first time, I just follow some specific points of interest in the challenge. Will need to look more into each phase and what it does.

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



### Type Narrowing Reducer (type-narrowing-reducer.cc)

### Simplifed Lowering (simplified-lowering.cc)