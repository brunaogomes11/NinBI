import { Controller, Get } from '@nestjs/common'
import { RequirePermission } from '../../src/auth/decorators'

/** Uma rota por permissão da matriz, só para os testes. */
@Controller('probe-permission')
export class PermissionProbeController {
  @Get('users.manage')
  @RequirePermission('users.manage')
  usersManage() {
    return { ok: true }
  }

  @Get('connections.manage')
  @RequirePermission('connections.manage')
  connectionsManage() {
    return { ok: true }
  }

  @Get('llm.manage')
  @RequirePermission('llm.manage')
  llmManage() {
    return { ok: true }
  }

  @Get('connections.read')
  @RequirePermission('connections.read')
  connectionsRead() {
    return { ok: true }
  }

  @Get('dashboards.create')
  @RequirePermission('dashboards.create')
  dashboardsCreate() {
    return { ok: true }
  }

  @Get('ai.use')
  @RequirePermission('ai.use')
  aiUse() {
    return { ok: true }
  }

  @Get('dashboards.all')
  @RequirePermission('dashboards.all')
  dashboardsAll() {
    return { ok: true }
  }

  @Get('dashboards.shared')
  @RequirePermission('dashboards.shared')
  dashboardsShared() {
    return { ok: true }
  }

  @Get('sidebar.own')
  @RequirePermission('sidebar.own')
  sidebarOwn() {
    return { ok: true }
  }
}
