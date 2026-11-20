import {
  Client,
  SdkHttpError,
  StreamableHTTPClientTransport,
  UnauthorizedError,
} from '@modelcontextprotocol/client'
import { Inject, Injectable } from '@nestjs/common'
import { AppError } from '../common/app-error'

export const MCP_TIMEOUT = Symbol('MCP_TIMEOUT')
const MAX_RESPONSE_BYTES = 8 * 1024 * 1024

@Injectable()
export class McpClientService {
  constructor(@Inject(MCP_TIMEOUT) private readonly timeoutMs: number) {}

  async listTools(endpoint: string) {
    return this.run(
      endpoint,
      async (client) => (await client.listTools()).tools,
    )
  }

  async run<T>(
    endpoint: string,
    operation: (client: Client) => Promise<T>,
  ): Promise<T> {
    const signal = AbortSignal.timeout(this.timeoutMs)
    const client = new Client({ name: 'NinBI', version: '1.0.0' })
    const transport = new StreamableHTTPClientTransport(new URL(endpoint), {
      requestInit: { redirect: 'error' },
      fetch: async (input, init) => {
        const response = await fetch(input, {
          ...init,
          signal: init?.signal
            ? AbortSignal.any([signal, init.signal])
            : signal,
          redirect: 'error',
        })
        if (!response.body) return response
        let bytes = 0
        return new Response(
          response.body.pipeThrough(
            new TransformStream<Uint8Array, Uint8Array>({
              transform(chunk, stream) {
                bytes += chunk.byteLength
                if (bytes > MAX_RESPONSE_BYTES) {
                  stream.error(
                    new Error('Resposta MCP excede o limite de tamanho'),
                  )
                } else {
                  stream.enqueue(chunk)
                }
              },
            }),
          ),
          response,
        )
      },
    })
    const abort = () => {
      void client.close().catch(() => {})
    }
    signal.addEventListener('abort', abort, { once: true })
    try {
      await client.connect(transport, { signal, timeout: this.timeoutMs })
      return await operation(client)
    } catch (error) {
      if (signal.aborted)
        throw new AppError(
          504,
          'QUERY_TIMEOUT',
          'A chamada MCP excedeu o tempo limite.',
        )
      if (error instanceof AppError) throw error
      if (
        error instanceof UnauthorizedError ||
        (error instanceof SdkHttpError && [401, 403].includes(error.status))
      ) {
        throw new AppError(
          422,
          'MCP_AUTH_REQUIRED',
          'O servidor MCP exige autorização.',
        )
      }
      throw new AppError(
        502,
        'SOURCE_UNAVAILABLE',
        'Não foi possível concluir a chamada ao servidor MCP.',
      )
    } finally {
      signal.removeEventListener('abort', abort)
      if (transport.sessionId && !signal.aborted)
        await transport.terminateSession().catch(() => {})
      await client.close().catch(() => {})
    }
  }
}
