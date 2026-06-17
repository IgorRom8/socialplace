import { Injectable, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';

const DEFAULT_ADMIN_LOGIN = 'admin';
const DEFAULT_ADMIN_PASSWORD = 'admin123';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  login(login: string, password: string) {
    const expectedLogin = process.env.ADMIN_LOGIN?.trim() || DEFAULT_ADMIN_LOGIN;
    const expectedPassword = process.env.ADMIN_PASSWORD?.trim() || DEFAULT_ADMIN_PASSWORD;
    if (login.trim() !== expectedLogin || password !== expectedPassword) {
      return null;
    }
    const accessToken = this.jwtService.sign({ role: 'admin', login: expectedLogin });
    return { accessToken };
  }

  async deletePost(postId: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) {
      throw new NotFoundException('Пост не найден');
    }
    await this.prisma.post.delete({ where: { id: postId } });
    return { ok: true };
  }

  async deleteComment(commentId: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) {
      throw new NotFoundException('Комментарий не найден');
    }
    await this.prisma.comment.delete({ where: { id: commentId } });
    return { ok: true };
  }

  async banUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { isBanned: true },
    });
    return { ok: true };
  }

  async unbanUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { isBanned: false },
    });
    return { ok: true };
  }
}
