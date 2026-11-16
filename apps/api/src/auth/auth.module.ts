import { Module } from '@nestjs/common'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { LoginThrottleService } from './login-throttle.service'
import { PasswordHasher } from './password-hasher'
import { SessionService } from './session.service'

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordHasher,
    SessionService,
    LoginThrottleService,
  ],
  exports: [AuthService, PasswordHasher, SessionService, LoginThrottleService],
})
export class AuthModule {}
