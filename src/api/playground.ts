import { toast } from 'sonner'

import { APIRoutes } from './routes'

import { Agent, ComboboxAgent, SessionEntry } from '@/types/playground'

export const getPlaygroundAgentsAPI = async (
  endpoint: string
): Promise<ComboboxAgent[]> => {
  const url = APIRoutes.GetPlaygroundAgents(endpoint)
  try {
    const response = await fetch(url, { method: 'GET' })
    if (!response.ok) {
      toast.error(`Failed to fetch playground agents: ${response.statusText}`)
      return []
    }
    const data = await response.json()
    // Transform the API response into the expected shape.
    const agents: ComboboxAgent[] = data.map((item: Agent) => ({
      value: item.team_id || '',
      label: item.name || '',
      model: item.model || '',
      storage: item.storage || false
    }))
    return agents
  } catch {
    toast.error('Error fetching playground agents')
    return []
  }
}

export const getPlaygroundStatusAPI = async (base: string): Promise<number> => {
  const response = await fetch(APIRoutes.PlaygroundStatus(base), {
    method: 'GET'
  })
  return response.status
}

export const getAllPlaygroundSessionsAPI = async (
  base: string,
  teamId: string,
  userId?: string
): Promise<SessionEntry[]> => {
  try {
    let url = APIRoutes.GetPlaygroundSessions(base, teamId);
    if (userId) {
      url = `${url}?user_id=${encodeURIComponent(userId)}`;
    }
    const response = await fetch(url, {
      method: 'GET'
    })
    if (!response.ok) {
      if (response.status === 404) {
        // Return empty array when storage is not enabled
        return []
      }
      throw new Error(`Failed to fetch sessions: ${response.statusText}`)
    }
    return response.json()
  } catch {
    return []
  }
}

export const getPlaygroundSessionAPI = async (
  base: string,
  teamId: string,
  sessionId: string
) => {
  const response = await fetch(
    APIRoutes.GetPlaygroundSession(base, teamId, sessionId),
    {
      method: 'GET'
    }
  )
  return response.json()
}

export const deletePlaygroundSessionAPI = async (
  base: string,
  teamId: string,
  sessionId: string
) => {
  const response = await fetch(
    APIRoutes.DeletePlaygroundSession(base, teamId, sessionId),
    {
      method: 'DELETE'
    }
  )
  return response
}
