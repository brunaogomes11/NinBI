import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { LoginThrottleService } from './login-throttle.service'
import { PasswordHasher } from './password-hasher'
import { PermissionGuard } from './permission.guard'
import { SessionGuard } from './session.guard'
import { SessionService } from './session.service'

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordHasher,
    SessionService,
    LoginThrottleService,
    { provide: APP_GUARD, useClass: SessionGuard },
    { provide: APP_GUARD, useClass: PermissionGuard },
  ],
  exports: [AuthService, PasswordHasher, SessionService, LoginThrottleService],
})
export class AuthModule {}
