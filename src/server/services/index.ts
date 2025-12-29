// Services layer - business logic separated from tRPC routers

export {
  ContextBuilder,
  createContextBuilder,
  buildContextForBranch,
  type ContextPack,
  type ArtifactSummary,
  type ContextBuilderOptions,
} from "./context-builder";

export {
  SummarizationService,
  createSummarizationService,
  maybeSummarizeBranch,
  type SummarizationConfig,
  type BranchSummary,
  type ProjectSummary,
} from "./summarization";
