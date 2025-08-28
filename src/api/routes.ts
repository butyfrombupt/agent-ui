export const APIRoutes = {
  GetPlaygroundAgents: (PlaygroundApiUrl: string) =>
    `${PlaygroundApiUrl}/v1/playground/teams`,
  AgentRun: (PlaygroundApiUrl: string) =>
    `${PlaygroundApiUrl}/v1/playground/teams/{team_id}/runs`,
  PlaygroundStatus: (PlaygroundApiUrl: string) =>
    `${PlaygroundApiUrl}/v1/playground/status`,
  GetPlaygroundSessions: (PlaygroundApiUrl: string, teamId: string) =>
    `${PlaygroundApiUrl}/v1/playground/teams/${teamId}/sessions`,
  GetPlaygroundSession: (
    PlaygroundApiUrl: string,
    teamId: string,
    sessionId: string
  ) =>
    `${PlaygroundApiUrl}/v1/playground/teams/${teamId}/sessions/${sessionId}`,

  DeletePlaygroundSession: (
    PlaygroundApiUrl: string,
    teamId: string,
    sessionId: string
  ) =>
    `${PlaygroundApiUrl}/v1/playground/teams/${teamId}/sessions/${sessionId}`
}
