import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ChatGateway } from './chat.gateway';
import { PrismaService } from './prisma.service';
import { SocialController } from './social.controller';
import { SocialService } from './social.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'dev_secret',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [AuthController, SocialController],
  providers: [PrismaService, AuthService, SocialService, ChatGateway],
})
export class AppModule {}
