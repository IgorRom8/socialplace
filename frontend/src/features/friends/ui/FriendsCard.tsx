type FriendsCardProps = {
  friendUserId: string;
  friendRequestId: string;
  onFriendUserIdChange: (value: string) => void;
  onFriendRequestIdChange: (value: string) => void;
  sendFriendRequest: () => Promise<void>;
  respondFriendRequest: (accepted: boolean) => Promise<void>;
  canInteract: boolean;
};

export function FriendsCard(props: FriendsCardProps) {
  return (
    <section className="card friendsInstagramCard">
      <h2>Друзья</h2>
      <p className="muted">Как в Instagram: найди человека по ID и отправь заявку.</p>
      <div className="friendsStories">
        <div className="friendStory">
          <div className="friendStoryAvatar">A</div>
          <span>alex</span>
        </div>
        <div className="friendStory">
          <div className="friendStoryAvatar">M</div>
          <span>maria</span>
        </div>
        <div className="friendStory">
          <div className="friendStoryAvatar">J</div>
          <span>john</span>
        </div>
        <div className="friendStory">
          <div className="friendStoryAvatar">L</div>
          <span>lisa</span>
        </div>
      </div>
      <div className="row">
        <input
          placeholder="ID пользователя для заявки"
          value={props.friendUserId}
          disabled={!props.canInteract}
          onChange={(e) => props.onFriendUserIdChange(e.target.value)}
        />
        <button disabled={!props.canInteract} onClick={() => void props.sendFriendRequest()}>
          Добавить в друзья
        </button>
      </div>
      <div className="row">
        <input
          placeholder="ID заявки в друзья"
          value={props.friendRequestId}
          disabled={!props.canInteract}
          onChange={(e) => props.onFriendRequestIdChange(e.target.value)}
        />
        <button disabled={!props.canInteract} onClick={() => void props.respondFriendRequest(true)}>
          Принять
        </button>
        <button disabled={!props.canInteract} onClick={() => void props.respondFriendRequest(false)}>
          Отклонить
        </button>
      </div>
      {!props.canInteract && <p>Функции друзей доступны только после входа в аккаунт.</p>}
    </section>
  );
}
