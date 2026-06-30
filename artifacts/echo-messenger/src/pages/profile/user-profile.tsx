import { useParams, useLocation } from "wouter";
import { ArrowLeft, MessageCircle, Phone, MoreVertical, Bell, BellOff, UserX } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useGetUserByUsername, useCreateChat } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
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
  const { toast } = useToast();
  const createChatMutation = useCreateChat();

  // For numeric IDs we don't have username directly — show generic profile
  const isNumeric = /^\d+$/.test(userId ?? "");
  const displayName = isNumeric ? `User #${userId}` : (userId ?? "Unknown");

  const startChat = () => {
    if (!userId) return;
    const uid = parseInt(userId, 10);
    if (isNaN(uid)) {
      toast({ title: "Невозможно начать чат", variant: "destructive" });
      return;
    }
    createChatMutation.mutate(
      { data: { type: 1, title: displayName, memberIds: [uid] } },
      { onSuccess: (chat) => navigate(`/chat/${chat.id}`) }
    );
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 sticky top-0 bg-background z-10 border-b border-border/40">
        <button
          onClick={() => navigate("/chats")}
          className="flex items-center gap-1 text-primary"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="text-[17px]">Назад</span>
        </button>
        <span className="text-[17px] font-semibold">Профиль</span>
        <button className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-muted">
          <MoreVertical className="h-5 w-5 text-muted-foreground" />
        </button>
      </div>

      {/* Avatar + name */}
      <div className="flex flex-col items-center pt-6 pb-4 px-4">
        <Avatar className="h-24 w-24 mb-4">
          <AvatarFallback className={cn("text-white text-4xl font-semibold", getAvatarColor(displayName))}>
            {displayName.substring(0, 1).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <h1 className="text-[22px] font-bold">{displayName}</h1>
        <div className="flex items-center gap-1.5 mt-1">
          <span className="w-2 h-2 rounded-full bg-[#34c759]" />
          <span className="text-[13px] text-[#34c759]">в сети</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex justify-center gap-6 pb-6 px-4">
        {[
          { icon: <MessageCircle className="h-6 w-6" />, label: "Написать", action: startChat },
          { icon: <Phone className="h-6 w-6" />, label: "Позвонить", action: () => toast({ title: "Звонки скоро" }) },
          { icon: <Bell className="h-6 w-6" />, label: "Без звука", action: () => toast({ title: "Уведомления отключены" }) },
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
      <div className="bg-card">
        <div className="px-4 py-3 border-b border-border/50">
          <div className="text-[13px] text-muted-foreground mb-0.5">Имя пользователя</div>
          <div className="text-[16px] text-primary">@{displayName.replace(/\s/g,"_").toLowerCase()}</div>
        </div>
        <div className="px-4 py-3">
          <div className="text-[13px] text-muted-foreground mb-0.5">О себе</div>
          <div className="text-[16px] text-muted-foreground italic">Анонимный пользователь ECHO</div>
        </div>
      </div>

      <div className="h-[6px] bg-muted/30" />

      {/* Actions */}
      <div className="bg-card divide-y divide-border/50">
        <button
          onClick={() => toast({ title: "Добавлено в контакты" })}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 text-left"
        >
          <span className="text-[16px] text-primary">Добавить в контакты</span>
        </button>
        <button
          onClick={() => toast({ title: "Уведомления отключены" })}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 text-left"
        >
          <BellOff className="h-5 w-5 text-muted-foreground" />
          <span className="text-[16px]">Выключить уведомления</span>
        </button>
        <button
          onClick={() => toast({ title: "Пользователь заблокирован", variant: "destructive" })}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 text-left"
        >
          <UserX className="h-5 w-5 text-[#ff3b30]" />
          <span className="text-[16px] text-[#ff3b30]">Заблокировать</span>
        </button>
      </div>
    </div>
  );
}
