import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { PrismaService } from './prisma.service';
import {
  UPLOADS_ROOT,
  USER_AVATARS_DIR,
  publicPathForUserAvatar,
} from './upload.constants';

type CreatePostInput = {
  authorId: string;
  content: string;
  images: string[];
  music: { title: string; artist: string; audioUrl: string }[];
};

@Injectable()
export class SocialService {
  constructor(private readonly prisma: PrismaService) {}

  async getFriends(userId: string) {
    const rows = await this.prisma.friendRequest.findMany({
      where: {
        status: 'accepted',
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      include: {
        sender: { select: { id: true, fullName: true, email: true } },
        receiver: { select: { id: true, fullName: true, email: true } },
      },
    });
    const friends = rows.map((r) => (r.senderId === userId ? r.receiver : r.sender));
    const seen = new Set<string>();
    return friends.filter((f) => {
      if (seen.has(f.id)) return false;
      seen.add(f.id);
      return true;
    });
  }

  async getDialogPeers(userId: string) {
    const dialogs = await this.prisma.directMessage.findMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      include: {
        sender: { select: { id: true, fullName: true, email: true } },
        receiver: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const peers = dialogs.map((dialog) => (dialog.senderId === userId ? dialog.receiver : dialog.sender));
    const seen = new Set<string>();
    return peers.filter((peer) => {
      if (seen.has(peer.id)) return false;
      seen.add(peer.id);
      return true;
    });
  }

  /** Список диалогов как в мессенджере: собеседник + последнее сообщение, по времени сверху вниз */
  async getChatList(userId: string) {
    const messages = await this.prisma.directMessage.findMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        sender: { select: { id: true, fullName: true, email: true } },
        receiver: { select: { id: true, fullName: true, email: true } },
      },
    });

    const byPeer = new Map<
      string,
      {
        peer: { id: string; fullName: string; email: string };
        lastMessage: { content: string; createdAt: string; isOwn: boolean };
      }
    >();

    for (const msg of messages) {
      const peer = msg.senderId === userId ? msg.receiver : msg.sender;
      if (byPeer.has(peer.id)) continue;
      byPeer.set(peer.id, {
        peer,
        lastMessage: {
          content: msg.content,
          createdAt: msg.createdAt.toISOString(),
          isOwn: msg.senderId === userId,
        },
      });
    }

    return Array.from(byPeer.values()).sort(
      (a, b) => new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime(),
    );
  }

  async searchUsers(query: string) {
    const q = query.trim();
    if (q.length < 1) {
      return [];
    }
    return this.prisma.user.findMany({
      where: {
        OR: [
          { fullName: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: 15,
      select: { id: true, fullName: true, email: true, avatarUrl: true },
      orderBy: { fullName: 'asc' },
    });
  }

  async getProfileForMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, fullName: true, avatarUrl: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async updateUserAvatar(userId: string, filename: string) {
    const publicUrl = publicPathForUserAvatar(filename);
    const prev = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true },
    });
    await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: publicUrl },
    });
    const old = prev?.avatarUrl?.trim();
    if (old?.startsWith('/uploads/avatars/')) {
      const rel = old.slice('/uploads/'.length);
      const abs = join(UPLOADS_ROOT, ...rel.split('/'));
      if (abs.startsWith(USER_AVATARS_DIR)) {
        try {
          await unlink(abs);
        } catch {
          /* ignore */
        }
      }
    }
    return { avatarUrl: publicUrl };
  }

  async getUserProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, fullName: true, email: true, bio: true, avatarUrl: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async createPost(input: CreatePostInput) {
    return this.prisma.post.create({
      data: {
        authorId: input.authorId,
        content: input.content,
        images: { create: input.images.map((url) => ({ url })) },
        musicTracks: {
          create: input.music.map((track) => ({
            title: track.title,
            artist: track.artist,
            audioUrl: track.audioUrl,
          })),
        },
      },
      include: {
        author: { select: { id: true, fullName: true, avatarUrl: true } },
        images: true,
        musicTracks: true,
        likes: true,
        comments: true,
      },
    });
  }

  async getFeed(userId?: string) {
    if (!userId) {
      return this.prisma.post.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { id: true, fullName: true, avatarUrl: true } },
          images: true,
          musicTracks: true,
          likes: true,
          comments: {
            include: { author: { select: { id: true, fullName: true, avatarUrl: true } } },
          },
        },
      });
    }

    const accepted = await this.prisma.friendRequest.findMany({
      where: {
        status: 'accepted',
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
    });

    const friendIds = accepted.map((item) =>
      item.senderId === userId ? item.receiverId : item.senderId,
    );
    const allowedAuthors = [userId, ...friendIds];

    return this.prisma.post.findMany({
      where: { authorId: { in: allowedAuthors } },
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, fullName: true, avatarUrl: true } },
        images: true,
        musicTracks: true,
        likes: true,
        comments: {
          include: { author: { select: { id: true, fullName: true, avatarUrl: true } } },
        },
      },
    });
  }

  async getPostsByAuthor(authorId: string) {
    return this.prisma.post.findMany({
      where: { authorId },
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, fullName: true, avatarUrl: true } },
        images: true,
        musicTracks: true,
        likes: true,
        comments: {
          include: { author: { select: { id: true, fullName: true, avatarUrl: true } } },
        },
      },
    });
  }

  async addComment(postId: string, authorId: string, content: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    return this.prisma.comment.create({
      data: { postId, authorId, content },
      include: { author: { select: { id: true, fullName: true, avatarUrl: true } } },
    });
  }

  async toggleLike(postId: string, userId: string) {
    const existing = await this.prisma.like.findUnique({
      where: { postId_userId: { postId, userId } },
    });
    if (existing) {
      await this.prisma.like.delete({ where: { id: existing.id } });
      return { liked: false };
    }
    await this.prisma.like.create({ data: { postId, userId } });
    return { liked: true };
  }

  async findUserIdByEmail(email: string) {
    const u = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    return u?.id ?? null;
  }

  async getPendingIncomingFriendRequests(userId: string) {
    const id = String(userId).trim();
    return this.prisma.friendRequest.findMany({
      where: { receiverId: id, status: 'pending' },
      orderBy: { createdAt: 'desc' },
      include: { sender: { select: { id: true, fullName: true, email: true } } },
    });
  }

  async getPendingOutgoingFriendRequests(userId: string) {
    const id = String(userId).trim();
    return this.prisma.friendRequest.findMany({
      where: { senderId: id, status: 'pending' },
      orderBy: { createdAt: 'desc' },
      include: { receiver: { select: { id: true, fullName: true, email: true } } },
    });
  }

  async cancelOutgoingFriendRequest(senderId: string, requestId: string) {
    const sid = String(senderId).trim();
    const rid = String(requestId).trim();
    const row = await this.prisma.friendRequest.findUnique({ where: { id: rid } });
    if (!row) {
      throw new NotFoundException('Friend request not found');
    }
    if (row.senderId !== sid) {
      throw new ForbiddenException('You can only cancel your own outgoing requests');
    }
    if (row.status !== 'pending') {
      throw new BadRequestException('Only pending requests can be cancelled');
    }
    await this.prisma.friendRequest.delete({ where: { id: rid } });
    return { receiverId: row.receiverId, requestId: rid };
  }

  async sendFriendRequest(senderId: string, receiverId: string) {
    const from = String(senderId).trim();
    const to = String(receiverId).trim();
    if (from === to) {
      throw new BadRequestException('Cannot add yourself');
    }
    return this.prisma.friendRequest.upsert({
      where: { senderId_receiverId: { senderId: from, receiverId: to } },
      update: { status: 'pending', respondedAt: null },
      create: { senderId: from, receiverId: to, status: 'pending' },
      include: { sender: { select: { id: true, fullName: true, email: true } } },
    });
  }

  async respondToFriendRequest(requestId: string, accepted: boolean) {
    return this.prisma.friendRequest.update({
      where: { id: requestId },
      data: {
        status: accepted ? 'accepted' : 'rejected',
        respondedAt: new Date(),
      },
      include: {
        sender: { select: { id: true, fullName: true, email: true } },
        receiver: { select: { id: true, fullName: true, email: true } },
      },
    });
  }

  async sendDirectMessage(
    senderId: string,
    receiverId: string,
    content: string,
    attachment?: { url: string; type: 'image' | 'audio' } | null,
  ) {
    return this.prisma.directMessage.create({
      data: {
        senderId,
        receiverId,
        content,
        attachmentUrl: attachment?.url ?? null,
        attachmentType: attachment?.type ?? null,
      },
    });
  }

  async getDirectMessages(userA: string, userB: string) {
    return this.prisma.directMessage.findMany({
      where: {
        OR: [
          { senderId: userA, receiverId: userB },
          { senderId: userB, receiverId: userA },
        ],
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}
