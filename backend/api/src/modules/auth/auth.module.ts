import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

// Validate JWT_SECRET at module load time to fail fast if not configured
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error(
    'JWT_SECRET environment variable is required. ' +
      'Please set a secure JWT secret in your .env file (minimum 32 characters). ' +
      'Generate one with: openssl rand -base64 64',
  );
}

if (jwtSecret.length < 32) {
  throw new Error(
    'JWT_SECRET must be at least 32 characters long for security. ' +
      `Current length: ${jwtSecret.length} characters.`,
  );
}

// Check for weak default values
const weakSecrets = ['change-me', 'secret', 'password', '123456', 'default'];
if (weakSecrets.some((weak) => jwtSecret.toLowerCase().includes(weak))) {
  throw new Error(
    'JWT_SECRET appears to be a weak/default value. ' +
      'Please generate a cryptographically secure random secret.',
  );
}

@Module({
  imports: [
    JwtModule.register({
      secret: jwtSecret,
      signOptions: {
        issuer: process.env.JWT_ISSUER || 'xui-saas',
        audience: process.env.JWT_AUDIENCE || 'xui-saas',
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [JwtModule, AuthService],
})
export class AuthModule {}
