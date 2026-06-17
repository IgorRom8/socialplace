import { useCallback, useEffect, useState } from 'react';
import {
  banAdminUser,
  deleteAdminComment,
  deleteAdminPost,
  unbanAdminUser,
} from '@/shared/api/admin';
import { ADMIN_SESSION_BUMP, getAdminToken } from '@/shared/lib/adminSession';
import { parseApiError } from '@/shared/lib/parseApiError';

export function useAdminMode() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const sync = () => setIsAdmin(Boolean(getAdminToken()));
    sync();
    window.addEventListener(ADMIN_SESSION_BUMP, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(ADMIN_SESSION_BUMP, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  return isAdmin;
}

export function useAdminModeration(onRefresh?: () => void | Promise<void>) {
  const isAdmin = useAdminMode();

  const run = useCallback(
    async (action: () => Promise<unknown>, confirmText: string) => {
      const token = getAdminToken();
      if (!token) return;
      if (!window.confirm(confirmText)) return;
      try {
        await action();
        await onRefresh?.();
      } catch (err) {
        window.alert(parseApiError(err, 'Не удалось выполнить действие'));
      }
    },
    [onRefresh],
  );

  const deletePost = useCallback(
    (postId: string) => {
      const token = getAdminToken();
      if (!token) return;
      return run(
        () => deleteAdminPost(token, postId),
        'Удалить этот пост?',
      );
    },
    [run],
  );

  const deleteComment = useCallback(
    (commentId: string) => {
      const token = getAdminToken();
      if (!token) return;
      return run(
        () => deleteAdminComment(token, commentId),
        'Удалить этот комментарий?',
      );
    },
    [run],
  );

  const banUser = useCallback(
    (userId: string, name: string) => {
      const token = getAdminToken();
      if (!token) return;
      return run(
        () => banAdminUser(token, userId),
        `Заблокировать пользователя «${name}»? Он не сможет войти в аккаунт.`,
      );
    },
    [run],
  );

  const unbanUser = useCallback(
    (userId: string, name: string) => {
      const token = getAdminToken();
      if (!token) return;
      return run(
        () => unbanAdminUser(token, userId),
        `Разблокировать пользователя «${name}»?`,
      );
    },
    [run],
  );

  return { isAdmin, deletePost, deleteComment, banUser, unbanUser };
}
