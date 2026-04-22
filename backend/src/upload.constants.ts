import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

export const UPLOADS_ROOT = join(process.cwd(), 'uploads');
export const POST_IMAGES_DIR = join(UPLOADS_ROOT, 'posts', 'images');
export const POST_AUDIO_DIR = join(UPLOADS_ROOT, 'posts', 'audio');
export const USER_AVATARS_DIR = join(UPLOADS_ROOT, 'avatars');
export const DM_IMAGES_DIR = join(UPLOADS_ROOT, 'dm', 'images');
export const DM_AUDIO_DIR = join(UPLOADS_ROOT, 'dm', 'audio');

/** Один файл в POST /social/posts (изображение или аудио). */
export const POST_UPLOAD_MAX_FILE_BYTES = 100 * 1024 * 1024;

/** Аватар профиля: POST /social/me/avatar */
export const AVATAR_UPLOAD_MAX_FILE_BYTES = 5 * 1024 * 1024;

/** Вложения в личных сообщениях: POST /social/messages/upload */
export const DM_UPLOAD_MAX_FILE_BYTES = 50 * 1024 * 1024;

export function ensureUploadDirs() {
  for (const dir of [POST_IMAGES_DIR, POST_AUDIO_DIR, USER_AVATARS_DIR, DM_IMAGES_DIR, DM_AUDIO_DIR]) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }
}

export function publicPathForPostImage(filename: string) {
  return `/uploads/posts/images/${filename}`;
}

export function publicPathForPostAudio(filename: string) {
  return `/uploads/posts/audio/${filename}`;
}

export function publicPathForUserAvatar(filename: string) {
  return `/uploads/avatars/${filename}`;
}

export function publicPathForDmImage(filename: string) {
  return `/uploads/dm/images/${filename}`;
}

export function publicPathForDmAudio(filename: string) {
  return `/uploads/dm/audio/${filename}`;
}
