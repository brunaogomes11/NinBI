import type {
  DashboardShareResolver,
  ShareLevel,
} from '../../src/dashboard-access/dashboard-share-resolver'

/** Resolvedor de compartilhamento de teste: o teste concede o acesso com `grant`. */
export class FakeShareResolver implements DashboardShareResolver {
  private readonly grants = new Map<string, Map<string, ShareLevel>>()

  grant(userId: string, dashboardId: string, level: ShareLevel): void {
    const byDashboard = this.grants.get(userId) ?? new Map<string, ShareLevel>()
    byDashboard.set(dashboardId, level)
    this.grants.set(userId, byDashboard)
  }

  accessFor(userId: string, dashboardId: string): Promise<ShareLevel | null> {
    return Promise.resolve(this.grants.get(userId)?.get(dashboardId) ?? null)
  }

  sharedDashboardIds(userId: string): Promise<string[]> {
    return Promise.resolve([...(this.grants.get(userId)?.keys() ?? [])])
  }
}
