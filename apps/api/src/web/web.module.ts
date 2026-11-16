import { Module } from '@nestjs/common'
import { ServeStaticModule } from '@nestjs/serve-static'

/** Serve o build do web (`WEB_DIST_DIR`) com fallback SPA; sem a variável, não serve nada. */
@Module({
  imports: [
    ServeStaticModule.forRootAsync({
      useFactory: () => {
        const rootPath = process.env.WEB_DIST_DIR
        return rootPath ? [{ rootPath, exclude: ['/api/{*path}'] }] : []
      },
    }),
  ],
})
export class WebModule {}
