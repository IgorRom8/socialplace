import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AdminController } from './admin/admin.controller';
import { AdminGuard } from './admin/admin.guard';
import { AdminService } from './admin/admin.service';
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
  controllers: [AuthController, SocialController, AdminController],
  providers: [PrismaService, AuthService, SocialService, ChatGateway, AdminService, AdminGuard],
})
export class AppModule {}
