export const APPROVAL_GATES = [
  "team_proposal",
  "execution_plan",
  "final_deliverables",
] as const;

export const AGENT_STATES = [
  "idle",
  "planning",
  "researching",
  "writing",
  "meeting",
  "waiting_for_approval",
  "done",
] as const;

export const ARTIFACT_STATUSES = [
  "draft",
  "needs_review",
  "approved",
  "superseded",
] as const;

export const TASK_STATUSES = [
  "todo",
  "in_progress",
  "blocked",
  "done",
] as const;

export type ApprovalGateType = (typeof APPROVAL_GATES)[number];
export type AgentState = (typeof AGENT_STATES)[number];
export type ArtifactStatus = (typeof ARTIFACT_STATUSES)[number];
export type TaskStatus = (typeof TASK_STATUSES)[number];
export type WorkspaceStatus =
  | "drafting"
  | "awaiting_team_approval"
  | "awaiting_plan_approval"
  | "running"
  | "awaiting_final_approval"
  | "complete";

export interface UploadedFileRecord {
  id: string;
  fileName: string;
  relativePath: string;
  mimeType: string;
  size: number;
}

export interface MissionBrief {
  rawBrief: string;
  missionGoal: string;
  outputExpectations: string;
  uploadedFiles: UploadedFileRecord[];
}

export interface RoleTemplate {
  roleId: string;
  title: string;
  purpose: string;
  skills: string[];
  allowedTools: string[];
  deliverableTypes: string[];
  promptFragments: string[];
}

export interface TeamMember {
  agentId: string;
  roleId: string;
  title: string;
  displayName: string;
  responsibilities: string[];
  rationale: string;
  systemPrompt: string;
  state: AgentState;
}

export interface TeamProposal {
  name: string;
  rationale: string;
  estimatedOutputs: string[];
  roles: TeamMember[];
}

export interface TaskCard {
  id: string;
  title: string;
  ownerAgentId: string;
  status: TaskStatus;
  description: string;
  workType: Extract<
    AgentState,
    "planning" | "researching" | "writing" | "meeting"
  >;
  acceptanceCriteria: string[];
  dependencies: string[];
  linkedArtifactIds: string[];
}

export interface ArtifactVersion {
  version: number;
  createdAt: number;
  content: string;
  notes: string;
  sourceTaskIds: string[];
  citations: string[];
}

export interface ArtifactRecord {
  id: string;
  title: string;
  type: string;
  status: ArtifactStatus;
  schema: string;
  provenance: string[];
  currentVersion: number;
  versions: ArtifactVersion[];
}

export interface ApprovalGate {
  gateType: ApprovalGateType;
  status: "pending" | "approved";
  message: string;
  requestedAt: number;
  resolvedAt?: number;
}

export interface RunEventPayloadMap {
  "brief.ingested": MissionBrief;
  "brief.parsed": {
    summary: string;
    assumptions: string[];
    recommendedOutputs: string[];
  };
  "team.proposed": {
    teamProposal: TeamProposal;
  };
  "approval.requested": {
    gateType: ApprovalGateType;
    message: string;
  };
  "approval.resolved": {
    gateType: ApprovalGateType;
  };
  "task.board.created": {
    tasks: TaskCard[];
  };
  "run.started": {
    startedBy: string;
  };
  "meeting.started": {
    meetingId: string;
    title: string;
    participantAgentIds: string[];
    notesArtifactId?: string;
  };
  "meeting.ended": {
    meetingId: string;
  };
  "task.started": {
    taskId: string;
    agentId: string;
    state: TaskCard["workType"];
  };
  "task.completed": {
    taskId: string;
    agentId: string;
  };
  "artifact.updated": {
    artifact: ArtifactRecord;
  };
  "run.completed": {
    outcome: string;
  };
}

export type RunEventType = keyof RunEventPayloadMap;

export interface RunEvent<T extends RunEventType = RunEventType> {
  id: string;
  workspaceId: string;
  sequence: number;
  type: T;
  createdAt: number;
  payload: RunEventPayloadMap[T];
}

export interface WorkspaceRecord {
  id: string;
  title: string;
  providerId: string;
  status: WorkspaceStatus;
  createdAt: number;
  updatedAt: number;
}

export interface ActiveMeeting {
  meetingId: string;
  title: string;
  participantAgentIds: string[];
}

export interface WorkspaceSnapshot {
  workspace: WorkspaceRecord;
  brief?: MissionBrief;
  summary?: string;
  assumptions: string[];
  expectedOutputs: string[];
  teamProposal?: TeamProposal;
  tasks: TaskCard[];
  artifacts: ArtifactRecord[];
  approvals: ApprovalGate[];
  agents: TeamMember[];
  activeMeeting?: ActiveMeeting;
  runStatus: WorkspaceStatus;
  events: RunEvent[];
}

export interface ProviderCompletionInput {
  system: string;
  prompt: string;
}

export interface ProviderCompletionResult {
  text: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
  };
  model: string;
}

export interface ProviderAdapter {
  id: string;
  label: string;
  defaultModel?: string;
  isConfigured: () => boolean;
  complete: (
    input: ProviderCompletionInput,
  ) => Promise<ProviderCompletionResult>;
}

export interface ResearchResult {
  query: string;
  summary: string;
  citations: string[];
}

export interface ToolAdapter {
  id: string;
  label: string;
  readBriefFiles: (files: UploadedFileRecord[]) => Promise<string[]>;
  searchWeb: (query: string) => Promise<ResearchResult>;
}

export interface CreateWorkspaceInput {
  rawBrief: string;
  missionGoal: string;
  outputExpectations: string;
  providerId: string;
  uploadedFiles: UploadedFileRecord[];
}
