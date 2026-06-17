import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { randomUUID } from 'crypto';
import { diskStorage } from 'multer';
import { extname } from 'path';
import type { Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { ChatGateway } from './chat.gateway';
import { SocialService } from './social.service';
import {
  AVATAR_UPLOAD_MAX_FILE_BYTES,
  COVER_UPLOAD_MAX_FILE_BYTES,
  DM_AUDIO_DIR,
  DM_IMAGES_DIR,
  DM_UPLOAD_MAX_FILE_BYTES,
  POST_AUDIO_DIR,
  POST_IMAGES_DIR,
  POST_UPLOAD_MAX_FILE_BYTES,
  USER_AVATARS_DIR,
  USER_COVERS_DIR,
  publicPathForDmAudio,
  publicPathForDmImage,
  publicPathForPostAudio,
  publicPathForPostImage,
} from './upload.constants';

/** Multer кладёт текстовые поля в req.body; глобальный ValidationPipe + @Body(DTO) часто даёт пустой DTO для multipart. */
function pickMultipartText(value: unknown): string {
  if (value == null) return '';
  if (Array.isArray(value)) return pickMultipartText(value[0]);
  if (typeof value === 'string') return value.trim();
  return String(value).trim();
}

class CommentDto {
  @IsNotEmpty()
  userId!: string;

  @IsNotEmpty()
  content!: string;
}

class LikeDto {
  @IsNotEmpty()
  userId!: string;
}

class FriendRequestDto {
  @IsNotEmpty()
  senderId!: string;

  @IsNotEmpty()
  receiverId!: string;
}

class FriendRespondDto {
  @IsBoolean()
  accepted!: boolean;
}

class MessageDto {
  @IsNotEmpty()
  senderId!: string;

  @IsNotEmpty()
  receiverId!: string;

  @IsNotEmpty()
  content!: string;
}

@Controller('social')
export class SocialController {
  constructor(
    private readonly socialService: SocialService,
    private readonly jwtService: JwtService,
    private readonly chatGateway: ChatGateway,
  ) {}

  @Get('me')
  async getMe(@Query('token') token: string) {
    if (!token) {
      throw new BadRequestException('token query parameter is required');
    }
    const payload = this.jwtService.verify<Record<string, unknown>>(token);
    const rawId = payload.userId ?? payload.sub;
    let userId =
      typeof rawId === 'string' ? rawId.trim() : rawId != null ? String(rawId).trim() : '';
    const email = typeof payload.email === 'string' ? payload.email.trim() : '';
    if (!userId && email) {
      userId = (await this.socialService.findUserIdByEmail(email)) ?? '';
    }
    if (!userId) {
      throw new UnauthorizedException('Invalid token: missing user id');
    }
    const profile = await this.socialService.getProfileForMe(userId);
    return {
      userId: profile.id,
      email: profile.email,
      fullName: profile.fullName,
      avatarUrl: profile.avatarUrl,
      coverUrl: profile.coverUrl,
    };
  }

  @Post('me/cover')
  @UseInterceptors(
    FileInterceptor('cover', {
      storage: diskStorage({
        destination: (_req, _file, cb) => cb(null, USER_COVERS_DIR),
        filename: (_req, file, cb) => {
          const ext = extname(file.originalname || '').toLowerCase();
          cb(null, `${randomUUID()}${ext || ''}`);
        },
      }),
      limits: { fileSize: COVER_UPLOAD_MAX_FILE_BYTES },
      fileFilter: (_req, file, cb) => {
        const ok = /^image\/(jpeg|jpg|png|gif|webp)$/i.test(file.mimetype);
        if (!ok) {
          cb(new BadRequestException('Допустимы только изображения JPEG, PNG, GIF или WebP'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  async uploadMyCover(@Query('token') token: string, @UploadedFile() file?: Express.Multer.File) {
    if (!token) {
      throw new BadRequestException('token query parameter is required');
    }
    if (!file) {
      throw new BadRequestException('Файл шапки обязателен');
    }
    const payload = this.jwtService.verify<Record<string, unknown>>(token);
    const rawId = payload.userId ?? payload.sub;
    let userId =
      typeof rawId === 'string' ? rawId.trim() : rawId != null ? String(rawId).trim() : '';
    const email = typeof payload.email === 'string' ? payload.email.trim() : '';
    if (!userId && email) {
      userId = (await this.socialService.findUserIdByEmail(email)) ?? '';
    }
    if (!userId) {
      throw new UnauthorizedException('Invalid token: missing user id');
    }
    return this.socialService.updateUserCover(userId, file.filename);
  }

  @Post('me/avatar')
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: diskStorage({
        destination: (_req, _file, cb) => cb(null, USER_AVATARS_DIR),
        filename: (_req, file, cb) => {
          const ext = extname(file.originalname || '').toLowerCase();
          cb(null, `${randomUUID()}${ext || ''}`);
        },
      }),
      limits: { fileSize: AVATAR_UPLOAD_MAX_FILE_BYTES },
      fileFilter: (_req, file, cb) => {
        const ok = /^image\/(jpeg|jpg|png|gif|webp)$/i.test(file.mimetype);
        if (!ok) {
          cb(new BadRequestException('Допустимы только изображения JPEG, PNG, GIF или WebP'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  async uploadMyAvatar(@Query('token') token: string, @UploadedFile() file?: Express.Multer.File) {
    if (!token) {
      throw new BadRequestException('token query parameter is required');
    }
    if (!file) {
      throw new BadRequestException('Файл аватара обязателен');
    }
    const payload = this.jwtService.verify<Record<string, unknown>>(token);
    const rawId = payload.userId ?? payload.sub;
    let userId =
      typeof rawId === 'string' ? rawId.trim() : rawId != null ? String(rawId).trim() : '';
    const email = typeof payload.email === 'string' ? payload.email.trim() : '';
    if (!userId && email) {
      userId = (await this.socialService.findUserIdByEmail(email)) ?? '';
    }
    if (!userId) {
      throw new UnauthorizedException('Invalid token: missing user id');
    }
    return this.socialService.updateUserAvatar(userId, file.filename);
  }

  @Post('posts')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'images', maxCount: 10 },
        { name: 'audio', maxCount: 1 },
      ],
      {
        storage: diskStorage({
          destination: (req, file, cb) => {
            cb(null, file.fieldname === 'audio' ? POST_AUDIO_DIR : POST_IMAGES_DIR);
          },
          filename: (req, file, cb) => {
            const ext = extname(file.originalname || '').toLowerCase();
            cb(null, `${randomUUID()}${ext || ''}`);
          },
        }),
        limits: { fileSize: POST_UPLOAD_MAX_FILE_BYTES },
        fileFilter: (req, file, cb) => {
          if (file.fieldname === 'images') {
            const ok = /^image\/(jpeg|jpg|png|gif|webp)$/i.test(file.mimetype);
            if (!ok) {
              cb(new BadRequestException('Допустимы только изображения JPEG, PNG, GIF или WebP'), false);
              return;
            }
          } else if (file.fieldname === 'audio') {
            const okMime = /^audio\/(mpeg|mp3|wav|webm|ogg|x-m4a|aac|flac|x-flac)$/i.test(file.mimetype);
            const okName = /\.(mp3|wav|ogg|m4a|aac|flac|webm)$/i.test(file.originalname || '');
            if (!okMime && !okName) {
              cb(new BadRequestException('Допустимы аудиофайлы: mp3, wav, ogg, m4a, aac, flac, webm'), false);
              return;
            }
          } else {
            cb(new BadRequestException('Неизвестное поле файла'), false);
            return;
          }
          cb(null, true);
        },
      },
    ),
  )
  createPost(
    @Req() req: Request,
    @UploadedFiles()
    files: { images?: Express.Multer.File[]; audio?: Express.Multer.File[] },
  ) {
    const b = req.body as Record<string, unknown>;
    const userId = pickMultipartText(b?.userId);
    const content = pickMultipartText(b?.content);
    const musicTitleOpt = pickMultipartText(b?.musicTitle);
    const musicArtistOpt = pickMultipartText(b?.musicArtist);

    if (!userId) {
      throw new BadRequestException('userId is required');
    }
    if (!content) {
      throw new BadRequestException('content is required');
    }

    const imagePaths = (files?.images ?? []).map((f) => publicPathForPostImage(f.filename));
    const music: { title: string; artist: string; audioUrl: string }[] = [];
    const audio = files?.audio?.[0];
    if (audio) {
      music.push({
        title:
          musicTitleOpt ||
          (audio.originalname ? audio.originalname.replace(/\.[^.]+$/, '') : '') ||
          'Трек',
        artist: musicArtistOpt || 'Неизвестный исполнитель',
        audioUrl: publicPathForPostAudio(audio.filename),
      });
    }
    return this.socialService.createPost({
      authorId: userId,
      content,
      images: imagePaths,
      music,
    });
  }

  @Get('feed')
  getFeed(@Query('userId') userId?: string) {
    return this.socialService.getFeed(userId);
  }

  @Get('users/:userId/posts')
  getPostsByAuthor(@Param('userId') userId: string) {
    return this.socialService.getPostsByAuthor(userId);
  }

  @Get('users/search')
  searchUsers(@Query('q') q?: string) {
    return this.socialService.searchUsers(q ?? '');
  }

  @Get('users/:userId')
  getUserProfile(@Param('userId') userId: string) {
    return this.socialService.getUserProfile(userId);
  }

  @Get('friends/requests/incoming')
  getIncomingFriendRequests(@Query('userId') userId: string) {
    if (!userId || userId === 'undefined') {
      throw new BadRequestException('userId query parameter is required');
    }
    return this.socialService.getPendingIncomingFriendRequests(userId);
  }

  @Get('friends/requests/outgoing')
  getOutgoingFriendRequests(@Query('userId') userId: string) {
    if (!userId || userId === 'undefined') {
      throw new BadRequestException('userId query parameter is required');
    }
    return this.socialService.getPendingOutgoingFriendRequests(userId);
  }

  @Delete('friends/requests/:requestId')
  async cancelOutgoingFriendRequest(
    @Param('requestId') requestId: string,
    @Query('senderId') senderId: string,
  ) {
    if (!senderId || senderId === 'undefined') {
      throw new BadRequestException('senderId query parameter is required');
    }
    const result = await this.socialService.cancelOutgoingFriendRequest(senderId, requestId);
    this.chatGateway.emitFriendRequestCancelled(result.receiverId, { requestId: result.requestId });
    return { ok: true };
  }

  @Get('friends')
  getFriends(@Query('userId') userId: string) {
    if (!userId) {
      throw new BadRequestException('userId query parameter is required');
    }
    return this.socialService.getFriends(userId);
  }

  @Get('dialogs')
  getDialogs(@Query('userId') userId: string) {
    if (!userId) {
      throw new BadRequestException('userId query parameter is required');
    }
    return this.socialService.getDialogPeers(userId);
  }

  @Get('chats')
  getChatList(@Query('userId') userId: string) {
    if (!userId) {
      throw new BadRequestException('userId query parameter is required');
    }
    return this.socialService.getChatList(userId);
  }

  @Post('posts/:postId/comments')
  addComment(@Param('postId') postId: string, @Body() dto: CommentDto) {
    return this.socialService.addComment(postId, dto.userId, dto.content);
  }

  @Post('posts/:postId/likes')
  toggleLike(@Param('postId') postId: string, @Body() dto: LikeDto) {
    return this.socialService.toggleLike(postId, dto.userId);
  }

  @Post('friends/request')
  async sendFriendRequest(@Body() dto: FriendRequestDto) {
    const receiverId = String(dto.receiverId).trim();
    const req = await this.socialService.sendFriendRequest(dto.senderId, receiverId);
    this.chatGateway.emitFriendRequest(receiverId, {
      requestId: req.id,
      sender: {
        id: req.sender.id,
        fullName: req.sender.fullName,
        email: req.sender.email,
      },
    });
    return req;
  }

  @Post('friends/:requestId/respond')
  async respondFriendRequest(
    @Param('requestId') requestId: string,
    @Body() dto: FriendRespondDto,
  ) {
    const row = await this.socialService.respondToFriendRequest(requestId, dto.accepted);
    this.chatGateway.emitFriendRequestResolved(row.senderId, {
      accepted: dto.accepted,
      requestId: row.id,
      friend: dto.accepted
        ? {
            id: row.receiver.id,
            fullName: row.receiver.fullName,
            email: row.receiver.email,
          }
        : undefined,
    });
    return row;
  }

  @Post('messages/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, file, cb) => {
          const isImage = /^image\/(jpeg|jpg|png|gif|webp)$/i.test(file.mimetype);
          cb(null, isImage ? DM_IMAGES_DIR : DM_AUDIO_DIR);
        },
        filename: (_req, file, cb) => {
          const ext = extname(file.originalname || '').toLowerCase();
          cb(null, `${randomUUID()}${ext || ''}`);
        },
      }),
      limits: { fileSize: DM_UPLOAD_MAX_FILE_BYTES },
      fileFilter: (_req, file, cb) => {
        const okImage = /^image\/(jpeg|jpg|png|gif|webp)$/i.test(file.mimetype);
        const okAudio =
          /^audio\/(mpeg|mp3|wav|webm|ogg|x-m4a|aac|flac|x-flac)$/i.test(file.mimetype) ||
          /\.(mp3|wav|ogg|m4a|aac|flac|webm)$/i.test(file.originalname || '');
        if (!okImage && !okAudio) {
          cb(
            new BadRequestException(
              'Допустимы изображения JPEG, PNG, GIF, WebP или аудио mp3, wav, ogg, m4a, aac, flac, webm',
            ),
            false,
          );
          return;
        }
        cb(null, true);
      },
    }),
  )
  async uploadDirectMessageAttachment(
    @Req() req: Request,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Файл обязателен');
    }
    const b = req.body as Record<string, unknown>;
    const senderId = pickMultipartText(b?.senderId);
    const receiverId = pickMultipartText(b?.receiverId);
    const caption = pickMultipartText(b?.caption);
    if (!senderId) {
      throw new BadRequestException('senderId is required');
    }
    if (!receiverId) {
      throw new BadRequestException('receiverId is required');
    }
    const isImage = /^image\/(jpeg|jpg|png|gif|webp)$/i.test(file.mimetype);
    const attachmentType = isImage ? ('image' as const) : ('audio' as const);
    const url = isImage ? publicPathForDmImage(file.filename) : publicPathForDmAudio(file.filename);
    const content = caption || (isImage ? '📷 Фото' : '🎵 Аудио');
    const message = await this.socialService.sendDirectMessage(senderId, receiverId, content, {
      url,
      type: attachmentType,
    });
    this.chatGateway.emitDirectMessage(message);
    return message;
  }

  @Post('messages')
  sendMessage(@Body() dto: MessageDto) {
    return this.socialService.sendDirectMessage(dto.senderId, dto.receiverId, dto.content);
  }

  @Get('messages')
  getMessages(@Query('userA') userA: string, @Query('userB') userB: string) {
    return this.socialService.getDirectMessages(userA, userB);
  }
}
