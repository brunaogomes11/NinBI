import { Injectable } from '@nestjs/common'

export type ShareLevel = 'view' | 'edit'

/** Ponto de troca do compartilhamento: a feature `compartilhamento` registra outro provider neste token. */
export const DASHBOARD_SHARE_RESOLVER = Symbol('DASHBOARD_SHARE_RESOLVER')

export interface DashboardShareResolver {
  accessFor(userId: string, dashboardId: string): Promise<ShareLevel | null>
  sharedDashboardIds(userId: string): Promise<string[]>
}

/** Provider padrão: nenhum dashboard é compartilhado. */
@Injectable()
export class NoSharesResolver implements DashboardShareResolver {
  accessFor(): Promise<ShareLevel | null> {
    return Promise.resolve(null)
  }

  sharedDashboardIds(): Promise<string[]> {
    return Promise.resolve([])
  }
}
