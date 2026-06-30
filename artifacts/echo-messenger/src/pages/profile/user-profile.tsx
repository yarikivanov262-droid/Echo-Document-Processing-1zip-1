import { useParams, useLocation } from "wouter";
import { ArrowLeft, MessageCircle, Phone, MoreVertical } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useGetChat, useCreateChat } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

function getAvatarColor(name: string) {
  const colors = ["bg-[#e17076]","bg-[#faa774]","bg-[#a695e7]","bg-[#7bc862]","bg-[#6ec9cb]","bg-[#65aadd]","bg-[#ee7aae]"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
}

export function UserProfile() {
  const { userId } = useParams<{ userId: string }>();
  const [, navigate] = useLocation();
  const id = parseInt(userId || "0", 10);
  const createChatMutation = useCreateChat();

  const { data: chat } = useGetChat(id, { query: { enabled: !!id && id > 0 } as never });

  const name = chat?.title || `User ${userId}`;
  const members = chat?.memberCount ?? 0;

  const startMessage = () => {
    if (chat) {
      navigate(`/chat/${chat.id}`);
    } else {
      createChatMutation.mutate({ data: { type: 1, title: name, memberIds: [id] } }, {
        onSuccess: (c) => navigate(`/chat/${c.id}`),
      });
    }
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 shrink-0">
        <button onClick={() => navigate(-1 as unknown as string)} className="text-primary">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <button className="text-muted-foreground">
          <MoreVertical className="h-5 w-5" />
        </button>
      </div>

      {/* Profile header */}
      <div className="flex flex-col items-center pt-4 pb-6 px-4 shrink-0">
        <Avatar className="h-24 w-24 mb-4">
          {chat?.avatarFileId && <AvatarImage src={chat.avatarFileId} />}
          <AvatarFallback className={cn("text-white text-3xl font-semibold", getAvatarColor(name))}>
            {name.substring(0, 1).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <h1 className="text-[22px] font-bold">{name}</h1>
        {members > 0 && (
          <p className="text-[14px] text-muted-foreground mt-1">{members} участников</p>
        )}
        <div className="flex items-center gap-1.5 mt-1">
          <span className="w-2 h-2 rounded-full bg-primary" />
          <span className="text-[13px] text-primary">в сети</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex justify-center gap-8 pb-6 px-4 shrink-0">
        <button onClick={startMessage} disabled={createChatMutation.isPending}
          className="flex flex-col items-center gap-2">
          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
            <MessageCircle className="h-7 w-7 text-primary" />
          </div>
          <span className="text-[12px] text-primary">Написать</span>
        </button>
        <button className="flex flex-col items-center gap-2">
          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Phone className="h-7 w-7 text-primary" />
          </div>
          <span className="text-[12px] text-primary">Позвонить</span>
        </button>
      </div>

      {/* Info section */}
      <div className="mx-4 rounded-[12px] overflow-hidden bg-card mb-4">
        <div className="px-4 py-3 border-b border-border/50">
          <div className="text-[13px] text-muted-foreground">Имя пользователя</div>
          <div className="text-[16px] text-primary">@{name}</div>
        </div>
        <div className="px-4 py-3">
          <div className="text-[13px] text-muted-foreground">Статус</div>
          <div className="text-[16px]">Анонимный пользователь ECHO</div>
        </div>
      </div>

      {/* Danger */}
      <div className="mx-4 rounded-[12px] overflow-hidden bg-card">
        <button className="w-full px-4 py-3 text-left text-[16px] text-[#ff3b30] hover:bg-muted/30">
          Заблокировать пользователя
        </button>
      </div>
    </div>
  );
}
