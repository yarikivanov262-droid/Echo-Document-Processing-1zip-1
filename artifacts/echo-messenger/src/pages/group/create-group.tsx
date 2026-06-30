import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Camera, Search } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useCreateChat, useGetUserByUsername } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

function getAvatarColor(name: string) {
  const colors = ["bg-[#e17076]","bg-[#faa774]","bg-[#a695e7]","bg-[#7bc862]","bg-[#6ec9cb]","bg-[#65aadd]","bg-[#ee7aae]"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
}

interface Props { type: "group" | "channel" }

export function CreateGroup({ type }: Props) {
  const [, navigate] = useLocation();
  const [title, setTitle] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<Array<{ id: number; username: string }>>([]);
  const createChatMutation = useCreateChat();

  const isChannel = type === "channel";
  const chatType = isChannel ? 3 : 2;
  const label = isChannel ? "Канал" : "Группа";

  const { data: foundUser, isLoading } = useGetUserByUsername(memberSearch, {
    query: { enabled: memberSearch.length > 1 } as never,
  });

  const toggleMember = (user: { id: number; username: string }) => {
    setSelectedMembers(prev =>
      prev.find(m => m.id === user.id)
        ? prev.filter(m => m.id !== user.id)
        : [...prev, user]
    );
  };

  const handleCreate = () => {
    if (!title.trim()) return;
    createChatMutation.mutate({
      data: {
        type: chatType,
        title: title.trim(),
        memberIds: selectedMembers.map(m => m.id),
      },
    }, {
      onSuccess: (chat) => navigate(`/chat/${chat.id}`),
    });
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 shrink-0">
        <button onClick={() => navigate("/chats")} className="text-primary">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <span className="text-[17px] font-semibold">Новый{isChannel ? " канал" : "ая группа"}</span>
        <button
          onClick={handleCreate}
          disabled={!title.trim() || createChatMutation.isPending}
          className="text-primary text-[17px] disabled:opacity-40"
        >
          Создать
        </button>
      </div>

      {/* Name + avatar */}
      <div className="flex items-center gap-4 px-4 py-4 shrink-0">
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center shrink-0 cursor-pointer hover:bg-muted/70">
          <Camera className="h-7 w-7 text-muted-foreground" />
        </div>
        <div className="flex-1 border-b border-border">
          <input
            autoFocus
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder={`Название ${label.toLowerCase()}а`}
            maxLength={64}
            className="w-full bg-transparent outline-none text-[17px] text-foreground placeholder:text-muted-foreground py-2"
          />
        </div>
      </div>

      <div className="px-4 pb-2 text-[13px] text-muted-foreground shrink-0">
        {isChannel
          ? "Каналы — способ транслировать сообщения большой аудитории."
          : "Группы — место для общения с несколькими людьми."}
      </div>

      {/* Member search */}
      <div className="px-4 py-2 shrink-0">
        <div className="flex items-center gap-2 bg-muted rounded-[10px] px-3 h-9">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            value={memberSearch}
            onChange={e => setMemberSearch(e.target.value)}
            placeholder="Добавить участника..."
            className="flex-1 bg-transparent outline-none text-[15px] placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Selected members */}
      {selectedMembers.length > 0 && (
        <div className="flex gap-3 px-4 pb-3 overflow-x-auto shrink-0">
          {selectedMembers.map(m => (
            <button key={m.id} onClick={() => toggleMember(m)} className="flex flex-col items-center gap-1 shrink-0">
              <div className="relative">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className={cn("text-white font-semibold", getAvatarColor(m.username))}>
                    {m.username.substring(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute -top-1 -right-1 bg-muted-foreground text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center">✕</span>
              </div>
              <span className="text-[11px] text-muted-foreground max-w-[48px] truncate">{m.username}</span>
            </button>
          ))}
        </div>
      )}

      {/* Search results */}
      <div className="flex-1 overflow-y-auto">
        {memberSearch.length > 1 && isLoading && (
          <div className="px-4 py-3 text-muted-foreground text-[14px]">Поиск...</div>
        )}
        {foundUser && (
          <button
            onClick={() => toggleMember({ id: foundUser.id, username: foundUser.username })}
            className="w-full flex items-center gap-3 px-4 py-2 hover:bg-muted/30"
          >
            <Avatar className="h-[54px] w-[54px] shrink-0">
              <AvatarFallback className={cn("text-white font-semibold text-[18px]", getAvatarColor(foundUser.username))}>
                {foundUser.username.substring(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 border-b border-border/50 py-2 text-left">
              <div className="text-[16px] font-semibold">{foundUser.username}</div>
              <div className="text-[13px] text-muted-foreground">
                {selectedMembers.find(m => m.id === foundUser.id) ? "✓ Добавлен" : "Нажмите, чтобы добавить"}
              </div>
            </div>
          </button>
        )}
      </div>
    </div>
  );
}
