import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, MessageCircle, Phone, MoreVertical, BellOff, UserX, Check, X } from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import {
  useGetUserByUsername,
  useCreateChat,
  useGetContacts,
  useAddContact,
  useRemoveContact,
  useBlockUser,
  useUnblockUser,
  useGetBlockedUsers,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

function formatLastSeen(raw?: string | null) {
  if (!raw) return null;
  const d = new Date(raw);
  const diffMin = Math.round((Date.now() - d.getTime()) / 60000);
  if (diffMin < 1) return "только что";
  if (diffMin < 60) return `${diffMin} мин. назад`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `${diffH} ч. назад`;
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
}

export function UserProfile() {
  const { userId } = useParams<{ userId: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isNumeric = /^\d+$/.test(userId ?? "");
  const usernameParam = isNumeric ? undefined : userId;

  const { data: profile, isLoading } = useGetUserByUsername(usernameParam ?? "", {
    query: { enabled: !!usernameParam } as never,
  });
  const { data: contacts } = useGetContacts();
  const { data: blockedUsers } = useGetBlockedUsers();

  const createChatMutation = useCreateChat();
  const addContactMutation = useAddContact();
  const removeContactMutation = useRemoveContact();
  const blockMutation = useBlockUser();
  const unblockMutation = useUnblockUser();

  const contactEntry = contacts?.find(c => c.contactId === profile?.id);
  const blockedEntry = blockedUsers?.find(b => b.blockedId === profile?.id);
  const isContact = !!contactEntry;
  const isBlocked = !!blockedEntry;

  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [nicknameEditing, setNicknameEditing] = useState(false);
  const [nickname, setNickname] = useState("");

  useEffect(() => {
    setNickname(contactEntry?.nickname ?? "");
  }, [contactEntry?.nickname]);

  const displayName = profile?.displayName || profile?.username || (isNumeric ? `User #${userId}` : userId) || "Пользователь";

  const startChat = () => {
    if (!profile) return;
    createChatMutation.mutate(
      { data: { type: 1, title: displayName, memberIds: [profile.id] } },
      {
        onSuccess: (chat) => navigate(`/chat/${chat.id}`),
        onError: () => toast({ title: "Не удалось начать чат", variant: "destructive" }),
      }
    );
  };

  const toggleContact = () => {
    if (!profile) return;
    if (isContact && contactEntry) {
      removeContactMutation.mutate({ contactId: contactEntry.contactId }, {
        onSuccess: () => {
          void queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
          toast({ title: "Удалено из контактов" });
        },
      });
    } else {
      addContactMutation.mutate({ data: { contactId: profile.id } }, {
        onSuccess: () => {
          void queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
          toast({ title: "Добавлено в контакты" });
        },
        onError: () => toast({ title: "Не удалось добавить", variant: "destructive" }),
      });
    }
  };

  const toggleBlock = () => {
    if (!profile) return;
    if (isBlocked) {
      unblockMutation.mutate({ contactId: profile.id }, {
        onSuccess: () => {
          void queryClient.invalidateQueries({ queryKey: ["/api/blocked-users"] });
          toast({ title: "Пользователь разблокирован" });
        },
      });
    } else {
      blockMutation.mutate({ contactId: profile.id }, {
        onSuccess: () => {
          void queryClient.invalidateQueries({ queryKey: ["/api/blocked-users"] });
          toast({ title: "Пользователь заблокирован" });
        },
      });
    }
    setShowActionsMenu(false);
  };

  const saveNickname = () => {
    if (!profile || !contactEntry) return;
    addContactMutation.mutate({ data: { contactId: profile.id, nickname: nickname.trim() || undefined } }, {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
        toast({ title: "Никнейм сохранён" });
        setNicknameEditing(false);
      },
      onError: () => toast({ title: "Ошибка сохранения", variant: "destructive" }),
    });
  };

  const lastSeenLabel = profile?.lastActive ? formatLastSeen(profile.lastActive) : null;

  if (!usernameParam) {
    return (
      <div className="flex flex-col h-full bg-background items-center justify-center gap-4 px-6 text-center">
        <p className="text-muted-foreground text-[15px]">Профиль недоступен для этого контакта</p>
        <button onClick={() => navigate("/chats")} className="text-primary text-[15px]">Назад к чатам</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 sticky top-0 glass-header z-10 border-b border-white/10">
        <button
          onClick={() => navigate("/chats")}
          className="flex items-center gap-1 text-primary"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="text-[17px]">Назад</span>
        </button>
        <span className="text-[17px] font-semibold">Профиль</span>
        <button
          onClick={() => setShowActionsMenu(v => !v)}
          className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-muted relative"
        >
          <MoreVertical className="h-5 w-5 text-muted-foreground" />
        </button>
      </div>

      {/* Actions dropdown */}
      {showActionsMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowActionsMenu(false)} />
          <div className="fixed z-50 right-2 top-14 glass border border-border rounded-2xl shadow-xl overflow-hidden min-w-[200px]">
            <button
              onClick={toggleBlock}
              className={cn("w-full flex items-center gap-3 px-4 py-3 text-[15px] hover:bg-muted/50 text-left", isBlocked ? "text-foreground" : "text-[#ff3b30]")}
            >
              <UserX className="h-4 w-4" />
              {isBlocked ? "Разблокировать" : "Заблокировать"}
            </button>
            <button
              onClick={() => { toast({ title: "Жалоба отправлена" }); setShowActionsMenu(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-[15px] hover:bg-muted/50 text-left text-foreground"
            >
              Пожаловаться
            </button>
          </div>
        </>
      )}

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !profile ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 px-6 text-center">
          <p className="text-muted-foreground text-[15px]">Пользователь не найден</p>
        </div>
      ) : (
        <>
          {/* Avatar + name */}
          <div className="flex flex-col items-center pt-6 pb-4 px-4">
            <UserAvatar
              name={displayName}
              src={profile.avatarFileId ? `/api/files/${profile.avatarFileId}/download` : null}
              size="xl"
              className="mb-4"
            />
            <div className="flex items-center gap-1.5">
              <h1 className="text-[22px] font-bold">{displayName}</h1>
            </div>
            <div className="text-primary text-[14px] mt-0.5">@{profile.username}</div>
            {lastSeenLabel && (
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[13px] text-muted-foreground">Был(а) в сети: {lastSeenLabel}</span>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex justify-center gap-6 pb-6 px-4">
            {[
              { icon: <MessageCircle className="h-6 w-6" />, label: "Написать", action: startChat },
              { icon: <Phone className="h-6 w-6" />, label: "Позвонить", action: () => navigate(`/chat/${profile.id}/voice`) },
              { icon: <BellOff className="h-6 w-6" />, label: "Без звука", action: () => toast({ title: "Уведомления отключены" }) },
            ].map(({ icon, label, action }) => (
              <button
                key={label}
                onClick={action}
                disabled={label === "Написать" && createChatMutation.isPending}
                className="flex flex-col items-center gap-2 disabled:opacity-60"
              >
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  {icon}
                </div>
                <span className="text-[12px] text-primary">{label}</span>
              </button>
            ))}
          </div>

          <div className="h-[6px] bg-muted/30" />

          {/* Info */}
          <div className="glass">
            {profile.bio && (
              <div className="px-4 py-3 border-b border-border/50">
                <div className="text-[13px] text-muted-foreground mb-0.5">О себе</div>
                <div className="text-[16px]">{profile.bio}</div>
              </div>
            )}
            <div className="px-4 py-3">
              <div className="text-[13px] text-muted-foreground mb-0.5">ID</div>
              <div className="text-[16px] font-mono text-muted-foreground">{profile.id}</div>
            </div>
          </div>

          {/* Nickname (if in contacts) */}
          {isContact && (
            <>
              <div className="h-[6px] bg-muted/30" />
              <div className="glass px-4 py-3">
                <div className="text-[13px] text-muted-foreground mb-1">Nickname</div>
                {nicknameEditing ? (
                  <div className="flex items-center gap-2">
                    <input
                      value={nickname}
                      onChange={e => setNickname(e.target.value)}
                      placeholder="Локальное имя"
                      className="flex-1 text-[16px] bg-transparent outline-none border-b border-primary/40 pb-1"
                      autoFocus
                    />
                    <button onClick={saveNickname} className="text-primary"><Check className="h-5 w-5" /></button>
                    <button onClick={() => { setNicknameEditing(false); setNickname(contactEntry?.nickname ?? ""); }} className="text-muted-foreground"><X className="h-5 w-5" /></button>
                  </div>
                ) : (
                  <button onClick={() => setNicknameEditing(true)} className="text-[16px] text-left w-full">
                    {contactEntry?.nickname || <span className="text-muted-foreground italic">Добавить nickname</span>}
                  </button>
                )}
              </div>
            </>
          )}

          <div className="h-[6px] bg-muted/30" />

          {/* Actions */}
          <div className="glass divide-y divide-border/50">
            <button
              onClick={toggleContact}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 text-left"
            >
              <span className="text-[16px] text-primary">{isContact ? "Удалить из контактов" : "Добавить в контакты"}</span>
            </button>
            <button
              onClick={toggleBlock}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 text-left"
            >
              <UserX className={cn("h-5 w-5", isBlocked ? "text-muted-foreground" : "text-[#ff3b30]")} />
              <span className={cn("text-[16px]", isBlocked ? "text-foreground" : "text-[#ff3b30]")}>
                {isBlocked ? "Разблокировать" : "Заблокировать"}
              </span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
