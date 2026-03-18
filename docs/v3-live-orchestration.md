# V3 Spec: Live Orchestration & Dynamic Teams

## Overview

V3 transforms Team Foundry from a "brief → execute → deliver" tool into a **live collaborative workspace** where the user interacts with a coordinator agent in real-time, agents ask questions, and the team scales dynamically based on mission needs.

---

## Architecture

### The Coordinator

Every workspace has a **Coordinator** agent (always the first agent created). The coordinator is NOT a domain expert — it's a project manager / team lead that:

1. **Receives user orders** via the chat interface
2. **Decomposes orders** into tasks for the right team members
3. **Routes questions** from experts back to the user
4. **Proposes new hires** when the team lacks expertise
5. **Manages task dependencies** and sequencing
6. **Synthesizes final deliverables** from individual contributions

The coordinator has a special system prompt that includes the full brief, team composition, and current task board state. It's the only agent that talks to the user directly.

### Communication Flow

```
User ←→ Coordinator ←→ Team Members
         ↕
    Task Board (shared state)
```

- User → Coordinator: orders, feedback, answers to questions
- Coordinator → User: status updates, questions from experts, hiring proposals
- Coordinator → Agent: task assignment, context sharing
- Agent → Coordinator: deliverables, questions, blockers
- Agent → Agent: NEVER direct (always via coordinator)

### Chat Protocol

Messages in the chat have types:

```typescript
type ChatMessage = {
  id: string;
  timestamp: number;
  from: "user" | "coordinator" | AgentId;
  to: "user" | "coordinator" | AgentId;
  type: "order" | "question" | "answer" | "status" | "deliverable" | "hire_request" | "hire_approved" | "hire_rejected";
  content: string;
  metadata?: {
    taskId?: string;
    agentId?: string;
    artifactId?: string;
  };
};
```

---

## Feature 1: Live Chat with Coordinator

### UI
- The "Orders" section in the sidebar becomes a **real chat interface**
- Input field at the bottom, messages scroll up
- User messages appear on the right (blue), coordinator on the left (grey)
- Agent questions appear with a colored badge showing which agent is asking

### Backend
- `POST /api/workspaces/{id}/chat` — send a message
- `GET /api/workspaces/{id}/chat` — SSE stream of messages
- When user sends a message, the coordinator agent receives it as context in its next LLM call
- The coordinator decides: execute directly, delegate to an agent, or ask a clarifying question

### Coordinator Prompt Pattern
```
You are the Team Coordinator for this mission.

Current team: [list of agents with roles]
Current tasks: [task board state]
Recent chat: [last 10 messages]

The user just said: "{user_message}"

Decide what to do:
1. If this is a new task → create a task and assign it to the right agent
2. If this is feedback → update the relevant task/artifact
3. If you need clarification → ask the user
4. If you need a new skill → propose hiring a new agent
5. If an agent asked a question → forward it to the user

Respond in JSON: { action: "delegate|ask|hire|status", ... }
```

---

## Feature 2: Expert Question Cascade

### Flow
1. Agent encounters something outside its knowledge or needs user input
2. Agent flags it in its output: `[QUESTION: What is the target market size?]`
3. Coordinator detects the question tag and routes it to the user
4. User sees a **popup notification** in the office view (speech bubble on the agent)
5. User answers in the chat
6. Coordinator forwards the answer to the agent
7. Agent resumes work with the new context

### UI
- Questions appear as **orange cards** in the sidebar with the agent's name
- Clicking answers inline
- The agent in the office view shows a ❓ bubble until answered
- Unanswered questions block that agent's task (status: `blocked`)

---

## Feature 3: Dynamic Team Scaling

### Flow
1. Coordinator analyzes a user order and determines the team lacks expertise
2. Coordinator sends a `hire_request` message:
   ```
   "I need a Data Analyst to process the revenue data you uploaded.
   They would handle: data cleaning, pivot tables, trend analysis.
   Estimated 2-3 tasks. Approve?"
   ```
3. User sees a **hire approval card** in the sidebar (green approve / red reject)
4. If approved:
   - New agent created with custom system prompt
   - New `.md` file written
   - New Paperclip agent registered
   - Agent appears in the office (walks in from the left)
   - Coordinator assigns tasks to the new agent
5. If rejected, coordinator works around it (reassigns to existing agent or adjusts scope)

### Agent Creation
```typescript
interface HireRequest {
  proposedName: string;
  proposedTitle: string;
  purpose: string;
  skills: string[];
  estimatedTasks: number;
  justification: string;
}
```

---

## Feature 4: Strict Domain Boundaries (SME Pattern)

### Rules
Each agent is a **Subject Matter Expert (SME)** with strict scope:

1. **Never goes out of scope** — if a task touches another domain, the agent flags it
2. **Requests collaboration** — "I need input from [role] on [topic] before I can complete this"
3. **The coordinator routes** — decides which agent handles the cross-domain request
4. **Deliverables are reviewed** — before surfacing to the user, the coordinator checks quality

### Implementation
- Each agent's system prompt explicitly states its domain boundaries
- The system prompt includes: "If this task requires expertise outside your domain ([list domains]), flag it with [NEEDS_COLLABORATION: domain_name, specific_question]"
- The coordinator monitors these tags and creates sub-tasks or meeting events

### Meeting Events
When two agents need to collaborate:
1. Coordinator creates a `meeting` event
2. Both agents move to the meeting room in the office
3. The coordinator synthesizes their inputs into a combined context
4. Each agent produces their part of the deliverable
5. Coordinator merges and reviews

---

## Feature 5: Workspace Save/Restore

### Auto-save (v2.1 — already implemented)
- SQLite stores all events, artifacts, team composition
- Agent `.md` files persist in `.data/workspaces/{id}/agents/`
- Resuming = replaying events from SQLite

### Manual Export (v3)
- **Export button** → downloads a `.workspace.json` file containing:
  - Mission brief
  - Team composition
  - All events
  - All artifacts (content + versions)
  - Agent system prompts
  - Chat history
- **Import** → upload a `.workspace.json` to restore
- File is self-contained — no external dependencies

### Workspace State Machine
```
draft → team_proposed → team_approved → executing → paused → executing → completed
                                            ↓
                                         blocked (waiting for user input)
```

The `paused` state is new — user can pause execution, come back later, resume.

---

## Implementation Priority

1. **Chat infrastructure** (messages, SSE stream, storage)
2. **Coordinator agent** (special system prompt, action routing)
3. **Question cascade** (detection, UI, answer flow)
4. **Dynamic hiring** (request, approval, agent creation)
5. **SME boundaries** (prompt engineering, collaboration routing)
6. **Export/import** (serialization, restore)

---

## Paperclip Integration

All of the above should leverage Paperclip:
- Chat messages → Paperclip activity log
- New agents → Paperclip agent creation API
- Tasks → Paperclip issues
- Meetings → Paperclip linked issues
- Budget tracking → Paperclip cost tracking

The coordinator is a Paperclip agent with `role: "pm"` and `permissions.canCreateAgents: true`.
