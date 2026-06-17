import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from './prisma.service';

type AuthPayload = {
  userId: string;
  email: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(email: string, password: string, fullName: string) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new BadRequestException('Этот email уже занят');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    let user;
    try {
      user = await this.prisma.user.create({
        data: { email, passwordHash, fullName },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new BadRequestException('Этот email уже занят');
      }
      throw e;
    }

    return this.issueToken(user);
  }

  async login(email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: normalizedEmail, mode: 'insensitive' } },
          { fullName: { equals: email.trim(), mode: 'insensitive' } },
        ],
      },
    });
    if (!user) {
      throw new UnauthorizedException('Такого пользователя нет');
    }
    if (user.isBanned) {
      throw new UnauthorizedException('Аккаунт заблокирован администратором');
    }
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Неправильный логин или пароль');
    }
    return this.issueToken(user);
  }

  private issueToken(user: {
    id: string;
    email: string;
    fullName: string;
    avatarUrl: string | null;
  }) {
    const payload: AuthPayload = { userId: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload);
    return {
      accessToken,
      user: {
        userId: user.id,
        email: user.email,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
      },
    };
  }
}
