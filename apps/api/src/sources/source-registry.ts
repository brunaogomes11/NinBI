import { Inject, Injectable, Logger } from '@nestjs/common'
import { CONNECTION_TYPES, type ConnectionType } from '@ninbi/contracts'
import type { Source } from './source'

/** Lista das fontes instaladas, uma por tipo de conexão. */
export const SOURCES = Symbol('SOURCES')

export function driverNotFound(type: string): string {
  return `Driver não encontrado: ${type}`
}

/**
 * Escolhe a fonte pelo tipo da conexão (AD-137). Um tipo de conexão sem fonte
 * encerra a inicialização com "Driver não encontrado: <tipo>" no log (SRC-22).
 */
@Injectable()
export class SourceRegistry {
  private readonly logger = new Logger('Sources')
  private readonly byType = new Map<ConnectionType, Source>()

  constructor(@Inject(SOURCES) sources: readonly Source[]) {
    for (const source of sources) this.byType.set(source.type, source)
    for (const type of CONNECTION_TYPES) {
      if (!this.byType.has(type)) {
        const message = driverNotFound(type)
        this.logger.error(message)
        throw new Error(message)
      }
    }
  }

  for(type: ConnectionType): Source {
    const source = this.byType.get(type)
    if (!source) throw new Error(driverNotFound(type))
    return source
  }
}
