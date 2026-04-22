import { useCallback, useEffect, useRef, type ChangeEvent, type KeyboardEvent } from 'react';
import { MessageEntity } from '@/entities/message/model/types';
import { resolvePublicMediaUrl } from '@/shared/lib/mediaUrl';

type ChatCardProps = {
  currentUserId?: string;
  peerLabel?: string;
  hidePeerHeader?: boolean;
  messageText: string;
  messages: MessageEntity[];
  onMessageTextChange: (value: string) => void;
  sendMessage: () => void;
  /** Прикрепить фото или аудио (проводник) */
  onAttachmentPicked?: (file: File) => void;
  canInteract: boolean;
};

function SendArrowIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z" />
    </svg>
  );
}

function PaperclipIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
      <path
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.38-8.38a4 4 0 0 1 5.66 5.66l-8.38 8.38a2 2 0 0 1-2.83-2.83l7.07-7.07"
      />
    </svg>
  );
}

function messageShowCaption(msg: MessageEntity): boolean {
  const t = msg.content?.trim() ?? '';
  if (!t) return false;
  if (msg.attachmentType === 'image' && t === '📷 Фото') return false;
  if (msg.attachmentType === 'audio' && t === '🎵 Аудио') return false;
  return true;
}

export function ChatCard(props: ChatCardProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const adjustTextareaHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const max = 132;
    el.style.height = `${Math.min(el.scrollHeight, max)}px`;
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [props.messageText, adjustTextareaHeight]);

  const trySend = () => {
    if (!props.canInteract || !props.messageText.trim()) return;
    props.sendMessage();
  };

  const onComposerKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Enter' || e.shiftKey) return;
    e.preventDefault();
    trySend();
  };

  function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !props.onAttachmentPicked) return;
    props.onAttachmentPicked(file);
  }

  return (
    <div className="chatPanel">
      {!props.hidePeerHeader && props.peerLabel ? (
        <div className="chatPeerHeader">
          <span className="chatPeerName">{props.peerLabel}</span>
        </div>
      ) : null}
      <div className="messages chatMessages">
        {props.messages.map((msg) => {
          const isOwn = msg.senderId === props.currentUserId;
          const isImage = msg.attachmentType === 'image' && msg.attachmentUrl;
          const isAudio = msg.attachmentType === 'audio' && msg.attachmentUrl;
          const caption = messageShowCaption(msg);
          const textOnly = !isImage && !isAudio;

          return (
            <p key={msg.id} className={isOwn ? 'chatMsgOwn' : 'chatMsgPeer'}>
              <span className="chatMsgBody">
                {isImage ? (
                  <img
                    src={resolvePublicMediaUrl(msg.attachmentUrl!)}
                    alt=""
                    className="chatMsgImage"
                  />
                ) : null}
                {isAudio ? (
                  <audio
                    className="chatMsgAudio"
                    controls
                    src={resolvePublicMediaUrl(msg.attachmentUrl!)}
                    preload="metadata"
                  />
                ) : null}
                {textOnly ? (
                  msg.content
                ) : caption ? (
                  <span className="chatMsgCaption">{msg.content}</span>
                ) : null}
              </span>
            </p>
          );
        })}
      </div>
      <div className="chatComposer">
        <input
          ref={fileInputRef}
          type="file"
          className="chatComposerFileInput"
          accept="image/jpeg,image/png,image/gif,image/webp,audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac,.webm"
          onChange={onFileChange}
          aria-hidden
          tabIndex={-1}
        />
        <div className="chatComposerField">
          {props.canInteract && props.onAttachmentPicked ? (
            <button
              type="button"
              className="chatComposerAttach"
              aria-label="Прикрепить фото или аудио"
              onClick={() => fileInputRef.current?.click()}
            >
              <PaperclipIcon />
            </button>
          ) : null}
          <textarea
            ref={textareaRef}
            className="chatComposerInput"
            placeholder="Написать сообщение…"
            rows={1}
            value={props.messageText}
            disabled={!props.canInteract}
            onChange={(e) => props.onMessageTextChange(e.target.value)}
            onKeyDown={onComposerKeyDown}
          />
          <button
            type="button"
            className="chatComposerSend"
            disabled={!props.canInteract || !props.messageText.trim()}
            onClick={trySend}
            aria-label="Отправить сообщение"
          >
            <SendArrowIcon />
          </button>
        </div>
      </div>
    </div>
  );
}
