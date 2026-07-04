import { useState } from "react";
import { useLocation } from "wouter";
import { Plus, Trash2, FolderOpen, X, Check } from "lucide-react";
import { useGetFolders, useCreateFolder, usePatchFolder, useDeleteFolder, useGetChats } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

const EMOJI_OPTIONS = ["📁","💼","🏠","❤️","⭐","🔥","🎮","💬","📢","🔒","🌍","🎵","🛒","💡","🏋️","🎯","📚","🌐","✈️","🎉"];

type FolderFormData = { name: string; emoji: string; chatIds: number[] };

function FolderForm({
  initial,
  onSave,
  onCancel,
  isSaving,
}: {
  initial?: FolderFormData;
  onSave: (data: FolderFormData) => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const { data: chats } = useGetChats();
  const [name, setName] = useState(initial?.name ?? "");
  const [emoji, setEmoji] = useState(initial?.emoji ?? "📁");
  const [chatIds, setChatIds] = useState<number[]>(initial?.chatIds ?? []);

  const toggleChat = (id: number) => {
    setChatIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto">
      <div className="flex items-center justify-between px-4 pt-3 pb-2 sticky top-0 bg-background z-10 border-b border-border/40">
        <button onClick={onCancel} className="text-primary text-[17px]">Отмена</button>
        <span className="text-[17px] font-semibold">{initial ? "Изм. папку" : "Новая папка"}</span>
        <button
          onClick={() => name.trim() && onSave({ name: name.trim(), emoji, chatIds })}
          disabled={!name.trim() || isSaving}
          className="text-primary text-[17px] font-semibold disabled:opacity-40"
        >
          {isSaving ? "..." : "Сохранить"}
        </button>
      </div>

      <div className="mb-0">
        <div className="px-4 pb-1.5 pt-5">
          <span className="text-[13px] text-muted-foreground uppercase font-semibold tracking-wide">Название</span>
        </div>
        <div className="bg-card px-4 py-3 flex items-center gap-3">
          <div className="text-[28px]">{emoji}</div>
          <input
            value={name}
            onChange={e => setName(e.target.value.slice(0, 64))}
            placeholder="Название папки"
            className="flex-1 bg-transparent outline-none text-[16px] border-b border-primary/40 pb-1"
            autoFocus
          />
        </div>
      </div>

      <div className="mb-0 mt-5">
        <div className="px-4 pb-1.5">
          <span className="text-[13px] text-muted-foreground uppercase font-semibold tracking-wide">Иконка</span>
        </div>
        <div className="bg-card px-4 py-3">
          <div className="flex flex-wrap gap-2">
            {EMOJI_OPTIONS.map(e => (
              <button
                key={e}
                onClick={() => setEmoji(e)}
                className={cn(
                  "h-10 w-10 rounded-xl text-[20px] flex items-center justify-center border-2 transition-colors",
                  emoji === e ? "border-primary bg-primary/10" : "border-transparent bg-muted"
                )}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-0 mt-5">
        <div className="px-4 pb-1.5">
          <span className="text-[13px] text-muted-foreground uppercase font-semibold tracking-wide">
            Чаты в папке ({chatIds.length})
          </span>
        </div>
        <div className="bg-card divide-y divide-border/50">
          {chats?.map(chat => (
            <div
              key={chat.id}
              onClick={() => toggleChat(chat.id)}
              className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30"
            >
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-[16px] font-semibold text-primary shrink-0">
                {chat.title.substring(0, 1).toUpperCase()}
              </div>
              <span className="flex-1 text-[16px]">{chat.title}</span>
              {chatIds.includes(chat.id) && <Check className="h-5 w-5 text-primary shrink-0" />}
            </div>
          ))}
          {(!chats || chats.length === 0) && (
            <div className="px-4 py-6 text-center text-muted-foreground text-[14px]">Нет чатов</div>
          )}
        </div>
      </div>

      <div className="h-8" />
    </div>
  );
}

export function FoldersSettings() {
  const [, navigate] = useLocation();
  const { data: folders, isLoading } = useGetFolders();
  const createFolder = useCreateFolder();
  const patchFolder = usePatchFolder();
  const deleteFolder = useDeleteFolder();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<{ id: number; name: string; emoji: string; chatIds: number[] } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ["/api/folders"] });

  const handleCreate = (data: FolderFormData) => {
    createFolder.mutate(
      { data: { name: data.name, emoji: data.emoji, chatIds: data.chatIds } },
      {
        onSuccess: () => { toast({ title: `Папка "${data.name}" создана` }); setCreating(false); invalidate(); },
        onError: () => toast({ title: "Ошибка создания папки", variant: "destructive" }),
      }
    );
  };

  const handleUpdate = (id: number, data: FolderFormData) => {
    patchFolder.mutate(
      { id, data: { name: data.name, emoji: data.emoji, chatIds: data.chatIds } },
      {
        onSuccess: () => { toast({ title: "Папка обновлена" }); setEditing(null); invalidate(); },
        onError: () => toast({ title: "Ошибка обновления", variant: "destructive" }),
      }
    );
  };

  const handleDelete = (id: number) => {
    deleteFolder.mutate({ id }, {
      onSuccess: () => { toast({ title: "Папка удалена" }); setDeleteConfirm(null); invalidate(); },
      onError: () => toast({ title: "Ошибка удаления", variant: "destructive" }),
    });
  };

  if (creating) {
    return (
      <FolderForm
        onSave={handleCreate}
        onCancel={() => setCreating(false)}
        isSaving={createFolder.isPending}
      />
    );
  }

  if (editing) {
    return (
      <FolderForm
        initial={editing}
        onSave={(data) => handleUpdate(editing.id, data)}
        onCancel={() => setEditing(null)}
        isSaving={patchFolder.isPending}
      />
    );
  }

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto">
      {/* Delete confirm overlay */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-card rounded-2xl w-[280px] overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 pt-6 pb-4 text-center">
              <h3 className="font-bold text-[17px] mb-2">Удалить папку?</h3>
              <p className="text-[14px] text-muted-foreground leading-relaxed">Чаты останутся, только папка будет удалена.</p>
            </div>
            <div className="border-t border-border">
              <button onClick={() => handleDelete(deleteConfirm)} className="w-full py-3.5 text-[17px] font-semibold text-[#ff3b30] border-b border-border">
                {deleteFolder.isPending ? "Удаляем..." : "Удалить"}
              </button>
              <button onClick={() => setDeleteConfirm(null)} className="w-full py-3.5 text-[17px]">Отмена</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between px-4 pt-3 pb-2 sticky top-0 bg-background z-10 border-b border-border/40">
        <button onClick={() => navigate("/settings")} className="text-primary text-[17px]">Назад</button>
        <span className="text-[17px] font-semibold">Папки чатов</span>
        <button onClick={() => setCreating(true)} className="text-primary">
          <Plus className="h-5 w-5" />
        </button>
      </div>

      <div className="px-4 pb-1.5 pt-5">
        <span className="text-[13px] text-muted-foreground uppercase font-semibold tracking-wide">Мои папки</span>
      </div>

      {isLoading ? (
        Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3 bg-card border-b border-border/50 animate-pulse">
            <div className="h-10 w-10 rounded-xl bg-muted shrink-0" />
            <div className="flex-1 h-4 bg-muted rounded" />
          </div>
        ))
      ) : folders && folders.length > 0 ? (
        <div className="bg-card divide-y divide-border/50">
          {folders.map(folder => (
            <div key={folder.id} className="flex items-center gap-3 px-4 py-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-[20px] shrink-0">
                {folder.emoji ?? "📁"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[16px] font-medium">{folder.name}</div>
                <div className="text-[13px] text-muted-foreground">
                  {folder.chatIds.length} {folder.chatIds.length === 1 ? "чат" : folder.chatIds.length < 5 ? "чата" : "чатов"}
                </div>
              </div>
              <button
                onClick={() => setEditing({ id: folder.id, name: folder.name, emoji: folder.emoji ?? "📁", chatIds: folder.chatIds })}
                className="h-8 px-3 rounded-lg bg-muted text-[13px] text-muted-foreground hover:bg-muted/60 shrink-0"
              >
                Изм.
              </button>
              <button
                onClick={() => setDeleteConfirm(folder.id)}
                className="h-8 w-8 rounded-full hover:bg-red-500/10 flex items-center justify-center shrink-0"
              >
                <Trash2 className="h-4 w-4 text-[#ff3b30]" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
          <FolderOpen className="h-12 w-12 text-primary/30" />
          <div className="text-[15px]">Нет папок</div>
          <button
            onClick={() => setCreating(true)}
            className="mt-2 px-6 py-2.5 rounded-xl bg-primary text-white text-[15px] font-semibold"
          >
            Создать первую папку
          </button>
        </div>
      )}

      <div className="px-4 pt-5 text-[13px] text-muted-foreground leading-relaxed">
        Папки позволяют организовать чаты по темам. Чат может находиться в нескольких папках одновременно.
      </div>

      <div className="h-8" />
    </div>
  );
}
