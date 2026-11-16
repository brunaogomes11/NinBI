export type ShareLevel = 'view' | 'edit'

/** Ponto de troca do compartilhamento: o módulo registra o `DbShareResolver` neste token. */
export const DASHBOARD_SHARE_RESOLVER = Symbol('DASHBOARD_SHARE_RESOLVER')

export interface DashboardShareResolver {
  accessFor(userId: string, dashboardId: string): Promise<ShareLevel | null>
  sharedDashboardIds(userId: string): Promise<string[]>
}
