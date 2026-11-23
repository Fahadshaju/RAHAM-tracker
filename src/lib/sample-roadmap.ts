import type { Roadmap } from "./mizan";
// Clearly labelled illustrative course, never presented as a generated analysis.
export const SAMPLE_ROADMAP: Roadmap = {
  id: "sample-react",
  sample: true,
  sourceUrl: "",
  title: "React & TypeScript mastery",
  goal: "Build reliable, accessible applications with a strong understanding of React's mental model.",
  difficulty: "Intermediate",
  prerequisites: ["JavaScript ES6+", "HTML & CSS", "Basic Git"],
  watchMinutes: 485,
  days: 8,
  completed: ["f1", "f2"],
  schedule: [
    { day: "Days 1–2", focus: "TypeScript foundations & React mental model", hours: 6 },
    { day: "Days 3–4", focus: "State, effects & reusable architecture", hours: 6 },
    { day: "Days 5–6", focus: "Data loading, testing & accessibility", hours: 6 },
    { day: "Days 7–8", focus: "Build, review & ship your capstone", hours: 6 },
  ],
  phases: [
    {
      name: "Foundation",
      minutes: 600,
      concepts: [
        {
          id: "f1",
          name: "TypeScript's type system",
          learn: "Model your domain with unions, interfaces, generics, and safe narrowing.",
          why: "Catch invalid states before they reach production.",
          minutes: 240,
          sources: [],
        },
        {
          id: "f2",
          name: "Components & the render cycle",
          learn: "Understand JSX, composition, props, and how React updates a view.",
          why: "A clear mental model prevents unnecessary complexity.",
          minutes: 360,
          sources: [],
        },
      ],
      practice: [
        "Model a task as a discriminated union.",
        "Build an accessible task list with typed props.",
      ],
      project: "A typed task board with three workflow states.",
      questions: [
        "When should you use a union instead of optional fields?",
        "What causes a component to re-render?",
      ],
    },
    {
      name: "Core",
      minutes: 780,
      concepts: [
        {
          id: "c1",
          name: "State, effects & custom hooks",
          learn:
            "Keep state minimal, derive values during render, and isolate external synchronization.",
          why: "Correct state ownership makes features predictable.",
          minutes: 420,
          sources: [],
        },
        {
          id: "c2",
          name: "Forms & application architecture",
          learn: "Validate inputs and organize code around product domains.",
          why: "Boundaries let your application grow without tangling its logic.",
          minutes: 360,
          sources: [],
        },
      ],
      practice: ["Write a custom countdown hook.", "Validate a form and handle every error state."],
      project: "A focus tracker with session history.",
      questions: [
        "Which values should be derived instead of stored?",
        "When is an effect actually necessary?",
      ],
    },
    {
      name: "Advanced",
      minutes: 780,
      concepts: [
        {
          id: "a1",
          name: "Server state & asynchronous UX",
          learn: "Handle caching, optimistic updates, cancellation, and loading boundaries.",
          why: "Network behavior is part of the user experience.",
          minutes: 420,
          sources: [],
        },
        {
          id: "a2",
          name: "Testing & accessibility",
          learn: "Test user flows and build keyboard-friendly controls.",
          why: "Reliable behavior must hold for every user.",
          minutes: 360,
          sources: [],
        },
      ],
      practice: [
        "Test a failed mutation and successful retry.",
        "Audit an entire form using only the keyboard.",
      ],
      project: "A searchable resource library with robust loading states.",
      questions: [
        "How is server state different from local UI state?",
        "What makes an optimistic update safe?",
      ],
    },
    {
      name: "Mastery",
      minutes: 720,
      concepts: [
        {
          id: "m1",
          name: "Production performance & delivery",
          learn: "Measure before optimizing, inspect bundle boundaries, and deploy safely.",
          why: "Shipping well means balancing correctness and performance.",
          minutes: 720,
          sources: [],
        },
      ],
      practice: ["Profile a slow interaction.", "Add end-to-end tests for your critical workflow."],
      project: "Deploy and document your capstone.",
      questions: [
        "Which metric tells you the interaction feels fast?",
        "What is your rollback plan?",
      ],
    },
  ],
  glossary: [
    {
      term: "Discriminated union",
      definition: "A union whose shared literal field identifies each variant.",
    },
    {
      term: "Server state",
      definition: "Remote data with its own lifetime, caching and freshness.",
    },
    {
      term: "Composition",
      definition: "Building complex behavior from smaller independent pieces.",
    },
  ],
  mistakes: [
    "Duplicating derived state.",
    "Using effects for logic that belongs in an event handler.",
    "Optimizing without profiling.",
  ],
  capstone:
    "Build a learning dashboard with typed data, accessible forms, session tracking, error recovery, and tests. Ship it and write a short architecture review.",
};
