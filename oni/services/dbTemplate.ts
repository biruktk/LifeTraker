export const DB_TEMPLATE = {
  meta: {
    version: "1.0",
    appName: "Life Tracker"
  },
  users: [] as any[],
  appDataTemplate: {
    goals: {
      main: "Build my Empire",
      weekly: "Complete the MVP"
    },
    user: {
      name: "User",
      profileImage: ""
    },
    nonNegotiables: [
      { id: "nn1", title: "Deep Work (4h)" },
      { id: "nn2", title: "No Sugar" }
    ],
    milestones: [
      { id: "m1", title: "System Setup", date: "2024-01-01", completed: true, description: "Initialize the Life Tracker database." }
    ],
    socialQueue: [],
    nonNegotiableLogs: {},
    todos: [],
    habits: [
      { id: "h1", name: "Read 10 pages", logs: {} }
    ],
    journal: [],
    expenses: []
  }
};