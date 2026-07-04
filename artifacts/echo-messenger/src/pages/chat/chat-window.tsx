import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Paperclip, Mic, ArrowLeft, MoreVertical, Phone,
  Check, CheckCheck, Reply, Copy, Trash2, Forward,
  Smile, X, Pin, BellOff, UserPlus, ChevronDown, Pencil,
  Image as ImageIcon, File as FileIcon, Volume2, VolumeX, Archive,
  Square, Play, Pause
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageText } from "@/components/message-text";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useGetChat, useGetChats, useGetMessages, useSendMessage, useMarkMessageRead, useDeleteMessage, useReactToMessage, useUploadFile, useUpdateChatMemberSettings, useAddContact, useEditMessage, usePinMessage, useForwardMessage } from "@workspace/api-client-react";
import { useEchoAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { useWsEvent } from "@/hooks/use-ws";
import { echoWs } from "@/lib/ws-client";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { stripExif } from "@/lib/media/strip-exif";
import { useE2EE, isE2EEPayload } from "@/lib/use-e2ee";

function getAvatarColor(name: string) {
  const colors = ["bg-[#e17076]","bg-[#faa774]","bg-[#a695e7]","bg-[#7bc862]","bg-[#6ec9cb]","bg-[#65aadd]","bg-[#ee7aae]"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
}

function formatMsgTime(raw?: string | null) {
  if (!raw) return "";
  const d = new Date(raw);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDateLabel(raw?: string | null): string {
  if (!raw) return "";
  const d = new Date(raw);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (msgDay.getTime() === today.getTime()) return "Сегодня";
  if (msgDay.getTime() === yesterday.getTime()) return "Вчера";
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
}

const EMOJI_QUICK = ["👍","❤️","😂","😮","😢","🔥","🎉","👎","🙏","😍","🤔","💯"];

type MsgItem = {
  id: number;
  encryptedContent: string;
  senderId: number;
  timestamp: string;
  readAt?: string | null;
  isSelf?: boolean;
  reactions?: Record<string, number[]>;
  isEdited?: boolean;
  senderUsername?: string;
  replyToId?: number | null;
  forwardedFromId?: number | null;
  forwardedFromUsername?: string | null;
  isPinned?: boolean;
};

export function ChatWindow() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { userId, username } = useEchoAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const chatId = parseInt(id || "0", 10);

  const { data: chat } = useGetChat(chatId, { query: { enabled: !!chatId && chatId > 0 } as never });
  const { data: messages, isLoading } = useGetMessages(
    { chatId },
    { query: { enabled: !!chatId && chatId > 0 } as never }
  );
  const sendMutation = useSendMessage();
  const markReadMutation = useMarkMessageRead();
  const deleteMessageMutation = useDeleteMessage();
  const reactMutation = useReactToMessage();
  const uploadMutation = useUploadFile();
  const memberSettingsMutation = useUpdateChatMemberSettings();
  const addContactMutation = useAddContact();
  const editMessageMutation = useEditMessage();
  const pinMessageMutation = usePinMessage();
  const forwardMessageMutation = useForwardMessage();
  const { data: allChats } = useGetChats();

  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<MsgItem | null>(null);
  const [selectedMsg, setSelectedMsg] = useState<MsgItem | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const [editingMsg, setEditingMsg] = useState<MsgItem | null>(null);
  const [showForwardDialog, setShowForwardDialog] = useState(false);
  const [forwardMsg, setForwardMsg] = useState<MsgItem | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showChatInfo, setShowChatInfo] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isChatPinned, setIsChatPinned] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [decryptedMap, setDecryptedMap] = useState<Map<number, string>>(new Map());
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunks = useRef<Blob[]>([]);
  const recordingTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);
  const { encryptForChat, decryptForChat } = useE2EE();
  const scrollRef = useRef<HTMLDivElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Resolve messages query key for cache invalidation
  const messagesQueryKey = ["/api/messages", { chatId }];

  // WebSocket: real-time new messages → invalidate messages cache
  useWsEvent((event) => {
    if (event.type === "new_message" && event.chatId === chatId) {
      void queryClient.invalidateQueries({ queryKey: messagesQueryKey });
    }
    if (event.type === "delete_message" && event.chatId === chatId) {
      void queryClient.invalidateQueries({ queryKey: messagesQueryKey });
    }
    if (event.type === "edit_message" && event.chatId === chatId) {
      void queryClient.invalidateQueries({ queryKey: messagesQueryKey });
    }
    if (event.type === "reaction" && event.chatId === chatId) {
      void queryClient.invalidateQueries({ queryKey: messagesQueryKey });
    }
    if (event.type === "typing" && event.chatId === chatId && event.userId !== userId) {
      setTypingUsers(prev => {
        const next = new Set(prev);
        if (event.isTyping) {
          next.add(event.username);
        } else {
          next.delete(event.username);
        }
        return next;
      });
    }
    if (event.type === "read_ack" && event.chatId === chatId) {
      void queryClient.invalidateQueries({ queryKey: messagesQueryKey });
    }
  });

  // Enrich messages with isSelf
  const enriched: MsgItem[] = (messages ?? []).map(m => ({
    ...m,
    timestamp: (m as { timestamp?: string }).timestamp ?? "",
    isSelf: m.senderId === userId,
    senderUsername: (m as { senderUsername?: string }).senderUsername,
    replyToId: (m as { replyToId?: number | null }).replyToId,
    forwardedFromId: (m as { forwardedFromId?: number | null }).forwardedFromId,
    forwardedFromUsername: (m as { forwardedFromUsername?: string | null }).forwardedFromUsername,
    isPinned: (m as { isPinned?: boolean }).isPinned,
  }));

  // Date separators
  type DateItem = { kind: "date"; label: string; key: string };
  type MsgEntry = { kind: "msg"; msg: MsgItem };
  type ListItem = DateItem | MsgEntry;

  const listItems: ListItem[] = [];
  let lastDateLabel = "";
  for (const msg of enriched) {
    const label = formatDateLabel(msg.timestamp);
    if (label && label !== lastDateLabel) {
      listItems.push({ kind: "date", label, key: `date-${label}` });
      lastDateLabel = label;
    }
    listItems.push({ kind: "msg", msg });
  }

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [enriched.length]);

  // Mark unread as read
  useEffect(() => {
    if (messages && messages.length > 0) {
      messages.filter(m => !m.readAt && m.senderId !== userId)
        .slice(-5)
        .forEach(m => markReadMutation.mutate({ id: m.id }));
    }
  }, [messages?.length]);

  // Decrypt incoming E2EE messages
  useEffect(() => {
    if (!messages?.length) return;
    const run = async () => {
      const updates = new Map<number, string>();
      for (const msg of messages) {
        if (msg.senderId !== userId && isE2EEPayload(msg.encryptedContent ?? "")) {
          try {
            const plain = await decryptForChat(chatId, msg.encryptedContent ?? "");
            if (plain !== msg.encryptedContent) updates.set(msg.id, plain);
          } catch { /* ignore decrypt errors for messages not yet in our chain */ }
        }
      }
      if (updates.size > 0) setDecryptedMap(prev => new Map([...prev, ...updates]));
    };
    void run();
  }, [messages?.length, chatId, userId]);

  // Typing indicator
  const handleTextChange = (v: string) => {
    setText(v);
    if (!typingTimer.current) {
      echoWs.send(JSON.stringify({ type: "typing", chatId, isTyping: true, username }));
    }
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      echoWs.send(JSON.stringify({ type: "typing", chatId, isTyping: false, username }));
      typingTimer.current = null;
    }, 2000);
  };

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || !chatId) return;

    if (editingMsg) {
      setText("");
      const editId = editingMsg.id;
      setEditingMsg(null);
      editMessageMutation.mutate({ id: editId, data: { encryptedContent: trimmed } }, {
        onSuccess: () => void queryClient.invalidateQueries({ queryKey: messagesQueryKey }),
        onError: () => toast({ title: "Ошибка редактирования", variant: "destructive" }),
      });
      setTimeout(() => inputRef.current?.focus(), 50);
      return;
    }

    setText("");
    const replyId = replyTo?.id;
    setReplyTo(null);
    setShowEmoji(false);
    const isDM = (chat as { type?: number })?.type === 1;
    const partnerUsername = isDM ? (chat as { name?: string })?.name ?? "" : "";
    const doSend = async () => {
      const content = isDM && partnerUsername
        ? await encryptForChat(chatId, partnerUsername, trimmed)
        : trimmed;
      sendMutation.mutate({
        data: {
          chatId,
          chatType: chat?.type ?? 1,
          encryptedContent: content,
          ...(replyId ? { replyToId: replyId } : {}),
        },
      }, {
        onSuccess: () => void queryClient.invalidateQueries({ queryKey: messagesQueryKey }),
        onError: () => toast({ title: "Ошибка отправки", variant: "destructive" }),
      });
      setTimeout(() => inputRef.current?.focus(), 50);
    };
    void doSend();
  };

  const findMsgById = (msgId?: number | null) => msgId ? enriched.find(m => m.id === msgId) : undefined;

  // Scroll-to-bottom FAB visibility
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setShowScrollDown(el.scrollHeight - el.scrollTop - el.clientHeight > 200);
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  };

  const scrollToMsg = (msgId?: number | null) => {
    if (!msgId) return;
    const el = document.getElementById(`msg-${msgId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/ogg";
      const mr = new MediaRecorder(stream, { mimeType });
      recordingChunks.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) recordingChunks.current.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(recordingChunks.current, { type: mimeType });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
      };
      mr.start(100);
      mediaRecorderRef.current = mr;
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimer.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch {
      toast({ title: "Нет доступа к микрофону", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (recordingTimer.current) { clearInterval(recordingTimer.current); recordingTimer.current = null; }
    setIsRecording(false);
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (recordingTimer.current) { clearInterval(recordingTimer.current); recordingTimer.current = null; }
    setIsRecording(false);
    setAudioBlob(null);
    if (audioUrl) { URL.revokeObjectURL(audioUrl); setAudioUrl(null); }
  };

  const sendVoiceMessage = () => {
    if (!audioBlob) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadMutation.mutate(
        { data: { filename: `voice-${Date.now()}.webm`, mimeType: audioBlob.type, data: base64 } },
        {
          onSuccess: (res) => {
            const fileUrl = (res as { url?: string }).url ?? "";
            sendMutation.mutate(
              { data: { chatId, chatType: chat?.type ?? 1, encryptedContent: `[voice:${fileUrl}]` } },
              {
                onSuccess: () => { void queryClient.invalidateQueries({ queryKey: messagesQueryKey }); },
                onError: () => toast({ title: "Ошибка отправки голосового", variant: "destructive" }),
              }
            );
            cancelRecording();
          },
          onError: () => toast({ title: "Ошибка загрузки аудио", variant: "destructive" }),
        }
      );
    };
    reader.readAsDataURL(audioBlob);
  };

  const formatRecordTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const handleLongPress = useCallback((msg: MsgItem, e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setSelectedMsg(msg);
    if ("clientX" in e) {
      setMenuPos({ x: e.clientX, y: e.clientY });
    } else {
      const t = e.touches[0];
      setMenuPos({ x: t.clientX, y: t.clientY });
    }
    setShowMenu(true);
  }, []);

  const copyMsg = () => {
    if (!selectedMsg) return;
    navigator.clipboard.writeText(selectedMsg.encryptedContent);
    toast({ title: "Скопировано" });
    setShowMenu(false);
  };

  const replyMsg = () => {
    if (!selectedMsg) return;
    setReplyTo(selectedMsg);
    setShowMenu(false);
    inputRef.current?.focus();
  };

  const deleteMsg = () => {
    if (!selectedMsg) return;
    deleteMessageMutation.mutate({ id: selectedMsg.id }, {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: messagesQueryKey });
        toast({ title: "Сообщение удалено" });
      },
      onError: () => toast({ title: "Ошибка удаления", variant: "destructive" }),
    });
    setShowMenu(false);
  };

  const editMsg = () => {
    if (!selectedMsg || !selectedMsg.isSelf) return;
    setEditingMsg(selectedMsg);
    setReplyTo(null);
    setText(selectedMsg.encryptedContent);
    setShowMenu(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const pinMsg = () => {
    if (!selectedMsg) return;
    pinMessageMutation.mutate({ id: selectedMsg.id }, {
      onSuccess: (res) => {
        void queryClient.invalidateQueries({ queryKey: messagesQueryKey });
        toast({ title: res.isPinned ? "Закреплено" : "Откреплено" });
      },
      onError: () => toast({ title: "Ошибка закрепления", variant: "destructive" }),
    });
    setShowMenu(false);
  };

  const openForwardDialog = () => {
    if (!selectedMsg) return;
    setForwardMsg(selectedMsg);
    setShowForwardDialog(true);
    setShowMenu(false);
  };

  const doForward = (targetChatId: number) => {
    if (!forwardMsg) return;
    forwardMessageMutation.mutate({ id: forwardMsg.id, data: { chatId: targetChatId } }, {
      onSuccess: () => {
        toast({ title: "Переслано" });
        setShowForwardDialog(false);
        setForwardMsg(null);
        if (targetChatId === chatId) void queryClient.invalidateQueries({ queryKey: messagesQueryKey });
      },
      onError: () => toast({ title: "Ошибка пересылки", variant: "destructive" }),
    });
  };

  const reactToMsg = (emoji: string) => {
    if (!selectedMsg) return;
    reactMutation.mutate({ id: selectedMsg.id, data: { emoji } }, {
      onSuccess: () => void queryClient.invalidateQueries({ queryKey: messagesQueryKey }),
      onError: () => toast({ title: "Ошибка реакции", variant: "destructive" }),
    });
    setShowMenu(false);
  };

  const chatTitle = chat?.title || "Чат";
  const isGroup = chat?.type === 2 || chat?.type === 3;
  const memberCount = (chat as { memberCount?: number })?.memberCount;
  const statusLine = isGroup
    ? `${memberCount ?? "?"} участников`
    : typingUsers.size > 0 ? "печатает..." : "в сети";

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const processedFile = file.type.startsWith("image/") ? await stripExif(file) : file;
        const processedReader = new FileReader();
        const processedB64 = await new Promise<string>((resolve) => {
          processedReader.onload = () => resolve((processedReader.result as string).split(",")[1]);
          processedReader.readAsDataURL(processedFile);
        });
        const res = await uploadMutation.mutateAsync({ data: { data: processedB64, mimeType: processedFile.type } });
        sendMutation.mutate(
          { data: { chatId, chatType: chat?.type ?? 1, encryptedContent: file.name, mediaFileId: res.fileId } },
          {
            onSuccess: () => void queryClient.invalidateQueries({ queryKey: messagesQueryKey }),
            onError: () => toast({ title: "Ошибка отправки файла", variant: "destructive" }),
          }
        );
      } catch {
        toast({ title: "Ошибка загрузки", variant: "destructive" });
      }
    };
    reader.readAsDataURL(file);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="flex flex-col h-full bg-background w-full overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-center gap-2 px-2 py-2 bg-card border-b border-border shrink-0 h-14">
        <button
          onClick={() => navigate("/chats")}
          className="md:hidden flex items-center text-primary gap-0.5 pr-1 shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <button
          className="flex items-center gap-2 flex-1 min-w-0 text-left"
          onClick={() => setShowChatInfo(v => !v)}
        >
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarFallback className={cn("text-white font-semibold text-sm", getAvatarColor(chatTitle))}>
              {chatTitle.substring(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-[15px] leading-tight truncate">{chatTitle}</div>
            <div className={cn("text-[12px] truncate", isGroup ? "text-muted-foreground" : "text-[#34c759]")}>
              {statusLine}
            </div>
          </div>
        </button>

        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={() => navigate(`/chat/${chatId}/voice`)}
            className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-muted text-primary"
          >
            <Phone className="h-5 w-5" />
          </button>
          <button
            onClick={() => setShowActionsMenu(v => !v)}
            className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground"
          >
            <MoreVertical className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* ── Chat info quick panel ── */}
      <AnimatePresence>
        {showChatInfo && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-card border-b border-border overflow-hidden shrink-0"
          >
            <div className="flex items-center justify-around py-3 px-4">
              {[
                {
                  icon: isMuted ? <Volume2 className="h-5 w-5" /> : <BellOff className="h-5 w-5" />,
                  label: isMuted ? "Включить звук" : "Без звука",
                  fn: () => {
                    const next = !isMuted;
                    setIsMuted(next);
                    memberSettingsMutation.mutate({ id: chatId, data: { mutedUntil: next ? "2999-01-01T00:00:00.000Z" : null } }, {
                      onSuccess: () => toast({ title: next ? "Уведомления отключены" : "Уведомления включены" }),
                      onError: () => toast({ title: "Ошибка", variant: "destructive" }),
                    });
                  },
                },
                {
                  icon: <Pin className="h-5 w-5" />,
                  label: isChatPinned ? "Открепить" : "Закрепить",
                  fn: () => {
                    const next = !isChatPinned;
                    setIsChatPinned(next);
                    memberSettingsMutation.mutate({ id: chatId, data: { isPinned: next } }, {
                      onSuccess: () => toast({ title: next ? "Чат закреплён" : "Чат откреплён" }),
                      onError: () => toast({ title: "Ошибка", variant: "destructive" }),
                    });
                  },
                },
                {
                  icon: <UserPlus className="h-5 w-5" />,
                  label: "Добавить",
                  fn: () => {
                    if (isGroup) { navigate(`/group/${chatId}/add`); return; }
                    const otherId = (chat as { creatorId?: number })?.creatorId;
                    if (!otherId) { toast({ title: "Не удалось определить пользователя", variant: "destructive" }); return; }
                    addContactMutation.mutate({ data: { contactId: otherId } } as never, {
                      onSuccess: () => toast({ title: "Добавлено в контакты" }),
                      onError: () => toast({ title: "Ошибка добавления", variant: "destructive" }),
                    });
                  },
                },
              ].map(({ icon, label, fn }) => (
                <button
                  key={label}
                  onClick={() => { fn(); setShowChatInfo(false); }}
                  className="flex flex-col items-center gap-1 text-primary hover:opacity-70"
                >
                  {icon}
                  <span className="text-[11px]">{label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Header actions dropdown (⋮) ── */}
      <AnimatePresence>
        {showActionsMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowActionsMenu(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -6 }}
              className="fixed z-50 right-2 top-14 bg-card border border-border rounded-2xl shadow-xl overflow-hidden min-w-[220px]"
            >
              {[
                {
                  icon: isChatPinned ? <Pin className="h-4 w-4" /> : <Pin className="h-4 w-4" />,
                  label: isChatPinned ? "Открепить чат" : "Закрепить чат",
                  fn: () => {
                    const next = !isChatPinned;
                    setIsChatPinned(next);
                    memberSettingsMutation.mutate({ id: chatId, data: { isPinned: next } }, {
                      onSuccess: () => toast({ title: next ? "Чат закреплён" : "Чат откреплён" }),
                    });
                  },
                },
                {
                  icon: isMuted ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />,
                  label: isMuted ? "Включить уведомления" : "Отключить уведомления",
                  fn: () => {
                    const next = !isMuted;
                    setIsMuted(next);
                    memberSettingsMutation.mutate({ id: chatId, data: { mutedUntil: next ? "2999-01-01T00:00:00.000Z" : null } }, {
                      onSuccess: () => toast({ title: next ? "Уведомления отключены" : "Уведомления включены" }),
                    });
                  },
                },
                {
                  icon: <Archive className="h-4 w-4" />,
                  label: "Архивировать чат",
                  fn: () => {
                    memberSettingsMutation.mutate({ id: chatId, data: { isArchived: true } }, {
                      onSuccess: () => { toast({ title: "Чат перемещён в архив" }); navigate("/chats"); },
                      onError: () => toast({ title: "Ошибка", variant: "destructive" }),
                    });
                  },
                },
              ].map(({ icon, label, fn }) => (
                <button
                  key={label}
                  onClick={() => { fn(); setShowActionsMenu(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-[15px] hover:bg-muted/50 text-left text-foreground"
                >
                  {icon}
                  {label}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Pinned message banner ── */}
      {enriched.some(m => m.isPinned) && (() => {
        const pinned = [...enriched].reverse().find(m => m.isPinned);
        if (!pinned) return null;
        return (
          <button
            onClick={() => scrollToMsg(pinned.id)}
            className="flex items-center gap-2.5 px-4 py-2 bg-card/90 border-b border-border/50 hover:bg-muted/30 shrink-0 w-full text-left"
          >
            <div className="flex flex-col items-center gap-0.5 shrink-0">
              <Pin className="h-3.5 w-3.5 text-primary" />
              <div className="w-0.5 h-3 bg-primary/40 rounded-full" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] text-primary font-semibold">Закреплённое сообщение</div>
              <div className="text-[13px] text-muted-foreground truncate">
                {pinned.encryptedContent.startsWith("[voice:") ? "🎤 Голосовое сообщение" : pinned.encryptedContent}
              </div>
            </div>
            <X
              className="h-3.5 w-3.5 text-muted-foreground shrink-0"
              onClick={(e) => { e.stopPropagation(); }}
            />
          </button>
        );
      })()}

      {/* ── Messages ── */}
      <div
        ref={scrollRef}
        onClick={() => { setShowMenu(false); setShowEmoji(false); }}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-0.5 relative"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, hsl(var(--border)/0.3) 1px, transparent 0)",
          backgroundSize: "32px 32px"
        }}
      >
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : enriched.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="bg-card/80 rounded-2xl px-5 py-3 text-[14px] text-muted-foreground">
              Начните разговор — всё зашифровано 🔒
            </div>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {listItems.map((item) => {
              if (item.kind === "date") {
                return (
                  <div key={item.key} className="flex justify-center my-3">
                    <span className="bg-card/80 backdrop-blur text-muted-foreground text-[12px] px-3 py-1 rounded-full">
                      {item.label}
                    </span>
                  </div>
                );
              }
              const { msg } = item;
              const isSelf = msg.isSelf ?? false;
              const reactionEntries = msg.reactions ? Object.entries(msg.reactions) : [];
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.12 }}
                  className={cn("flex flex-col mb-1", isSelf ? "items-end" : "items-start")}
                >
                  <div className={cn("flex", isSelf ? "justify-end" : "justify-start", "w-full")}>
                    {/* Avatar for others in group chats */}
                    {!isSelf && isGroup && (
                      <Avatar className="h-6 w-6 mr-1.5 mt-1 self-end shrink-0">
                        <AvatarFallback className={cn("text-white text-[10px]", getAvatarColor(msg.senderId.toString()))}>
                          {String(msg.senderId).substring(0, 1)}
                        </AvatarFallback>
                      </Avatar>
                    )}

                    <div
                      className={cn("relative max-w-[75%] px-3 py-2 rounded-2xl text-[15px] leading-relaxed shadow-sm cursor-pointer select-text",
                        isSelf
                          ? "bg-primary text-white rounded-br-sm"
                          : "bg-card text-foreground rounded-bl-sm"
                      )}
                      onContextMenu={(e) => { e.preventDefault(); handleLongPress(msg, e); }}
                      onClick={(e) => { e.stopPropagation(); handleLongPress(msg, e); }}
                    >
                      {/* Sender name in group */}
                      {!isSelf && isGroup && (
                        <div className="text-[12px] font-semibold text-primary mb-0.5">
                          {msg.senderUsername || `User ${msg.senderId}`}
                        </div>
                      )}

                      {/* Forwarded label */}
                      {msg.forwardedFromId && (
                        <div className={cn("flex items-center gap-1 text-[12px] font-medium mb-1", isSelf ? "text-white/80" : "text-primary")}>
                          <Forward className="h-3.5 w-3.5" />
                          Переслано {msg.forwardedFromUsername ? `от ${msg.forwardedFromUsername}` : ""}
                        </div>
                      )}

                      {/* Pinned indicator */}
                      {msg.isPinned && (
                        <div className={cn("flex items-center gap-1 text-[11px] font-medium mb-1", isSelf ? "text-white/70" : "text-muted-foreground")}>
                          <Pin className="h-3 w-3" />
                          Закреплено
                        </div>
                      )}

                      {/* Quoted reply block */}
                      {msg.replyToId && (() => {
                        const quoted = findMsgById(msg.replyToId);
                        return (
                          <button
                            onClick={(e) => { e.stopPropagation(); scrollToMsg(msg.replyToId); }}
                            className={cn(
                              "flex flex-col w-full text-left mb-1.5 pl-2 py-1 rounded border-l-2",
                              isSelf ? "border-white/50 bg-white/10" : "border-primary bg-muted/60"
                            )}
                          >
                            <span className={cn("text-[12px] font-semibold", isSelf ? "text-white/90" : "text-primary")}>
                              {quoted ? (quoted.senderUsername || `User ${quoted.senderId}`) : "Сообщение"}
                            </span>
                            <span className={cn("text-[12.5px] truncate", isSelf ? "text-white/70" : "text-muted-foreground")}>
                              {quoted ? quoted.encryptedContent : "недоступно"}
                            </span>
                          </button>
                        );
                      })()}

                      {(() => {
                        const displayText = decryptedMap.get(msg.id) ?? (isE2EEPayload(msg.encryptedContent ?? "") && isSelf ? "🔒 [зашифровано]" : (msg.encryptedContent ?? ""));
                        if (displayText.startsWith("[voice:")) {
                          const voiceUrl = displayText.slice(7, -1);
                          return (
                            <audio
                              controls
                              src={voiceUrl}
                              id={`msg-${msg.id}`}
                              className="max-w-[220px] h-10 mt-1"
                              style={{ accentColor: isSelf ? "#fff" : "var(--primary)" }}
                            />
                          );
                        }
                        return <MessageText id={`msg-${msg.id}`} text={displayText} isSelf={isSelf} />;
                      })()}

                      {/* Edited mark */}
                      {msg.isEdited && (
                        <span className={cn("text-[10px] mr-1", isSelf ? "text-white/60" : "text-muted-foreground/70")}>изм.</span>
                      )}

                      {/* Time + read receipt */}
                      <div className={cn(
                        "absolute bottom-1.5 right-2.5 flex items-center gap-0.5",
                        isSelf ? "text-white/70" : "text-muted-foreground"
                      )}>
                        <span className="text-[11px]">{formatMsgTime(msg.timestamp)}</span>
                        {isSelf && (
                          msg.readAt
                            ? <CheckCheck className="h-3.5 w-3.5 text-white/90" />
                            : <Check className="h-3.5 w-3.5" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Reactions row */}
                  {reactionEntries.length > 0 && (
                    <div className={cn("flex flex-wrap gap-1 mt-0.5 px-1", isSelf ? "justify-end" : "justify-start")}>
                      {reactionEntries.map(([emoji, users]) => (
                        <span
                          key={emoji}
                          className="inline-flex items-center gap-0.5 bg-card border border-border rounded-full px-2 py-0.5 text-[12px] cursor-pointer hover:bg-muted"
                        >
                          {emoji} <span className="text-muted-foreground">{users.length}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}

        {/* Typing indicator */}
        <AnimatePresence>
          {typingUsers.size > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
              className="flex justify-start mb-1"
            >
              <div className="bg-card rounded-2xl rounded-bl-sm px-4 py-2.5 shadow-sm">
                <div className="flex items-center gap-1">
                  {[0,1,2].map(i => (
                    <motion.span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-muted-foreground"
                      animate={{ y: [0, -4, 0] }}
                      transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Scroll-to-bottom FAB ── */}
      <AnimatePresence>
        {showScrollDown && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 8 }}
            onClick={scrollToBottom}
            className="absolute bottom-24 right-4 h-10 w-10 rounded-full bg-card border border-border shadow-lg flex items-center justify-center text-foreground hover:bg-muted z-30"
          >
            <ChevronDown className="h-5 w-5" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Context menu ── */}
      <AnimatePresence>
        {showMenu && selectedMsg && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              style={{ left: Math.min(menuPos.x, window.innerWidth - 180), top: Math.min(menuPos.y, window.innerHeight - 200) }}
              className="fixed z-50 bg-card border border-border rounded-2xl shadow-xl overflow-hidden min-w-[160px]"
            >
              {/* Quick emoji reactions */}
              <div className="flex gap-1 px-3 py-2 border-b border-border/50">
                {EMOJI_QUICK.slice(0, 6).map(e => (
                  <button key={e} onClick={() => reactToMsg(e)}
                    className="text-xl hover:scale-125 transition-transform">{e}</button>
                ))}
              </div>
              {[
                { icon: <Reply className="h-4 w-4" />, label: "Ответить", fn: replyMsg },
                { icon: <Copy className="h-4 w-4" />, label: "Копировать", fn: copyMsg },
                { icon: <Forward className="h-4 w-4" />, label: "Переслать", fn: openForwardDialog },
                { icon: <Pin className="h-4 w-4" />, label: selectedMsg.isPinned ? "Открепить" : "Закрепить", fn: pinMsg },
                ...(selectedMsg.isSelf
                  ? [{ icon: <Pencil className="h-4 w-4" />, label: "Изменить", fn: editMsg }]
                  : []),
                { icon: <Trash2 className="h-4 w-4 text-[#ff3b30]" />, label: "Удалить", fn: deleteMsg, danger: true },
              ].map(({ icon, label, fn, danger }) => (
                <button
                  key={label}
                  onClick={fn}
                  className={cn("w-full flex items-center gap-3 px-4 py-2.5 text-[15px] hover:bg-muted/50 text-left",
                    danger && "text-[#ff3b30]"
                  )}
                >
                  {icon}
                  {label}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Input area ── */}
      <div className="shrink-0 bg-card border-t border-border"
           style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom))" }}>

        {/* Recording status bar */}
        <AnimatePresence>
          {isRecording && (
            <motion.div
              initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="flex items-center gap-3 px-3 pt-2 pb-1"
            >
              <div className="flex-1 flex items-center gap-2 bg-muted rounded-xl px-3 py-1.5 border-l-4 border-[#ff3b30]">
                <div className="w-2 h-2 rounded-full bg-[#ff3b30] animate-pulse" />
                <span className="text-[13px] text-[#ff3b30] font-medium">Запись {formatRecordTime(recordingTime)}</span>
              </div>
              <button onClick={cancelRecording} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Voice message preview */}
        <AnimatePresence>
          {audioBlob && !isRecording && (
            <motion.div
              initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="flex items-center gap-2 px-3 pt-2 pb-1"
            >
              <div className="flex-1 flex items-center gap-2 bg-muted rounded-xl px-3 py-1.5 border-l-4 border-primary">
                <button
                  type="button"
                  onClick={() => {
                    if (!audioUrl) return;
                    if (!audioPreviewRef.current) audioPreviewRef.current = new Audio(audioUrl);
                    if (isPlayingPreview) {
                      audioPreviewRef.current.pause();
                      setIsPlayingPreview(false);
                    } else {
                      void audioPreviewRef.current.play();
                      audioPreviewRef.current.onended = () => setIsPlayingPreview(false);
                      setIsPlayingPreview(true);
                    }
                  }}
                  className="text-primary"
                >
                  {isPlayingPreview ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </button>
                <span className="text-[13px] text-muted-foreground">🎤 Голосовое сообщение</span>
              </div>
              <button
                type="button"
                onClick={sendVoiceMessage}
                disabled={uploadMutation.isPending}
                className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white shrink-0 disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
              <button onClick={cancelRecording} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Edit preview */}
        <AnimatePresence>
          {editingMsg && (
            <motion.div
              initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="flex items-center gap-2 px-3 pt-2 pb-1"
            >
              <div className="flex-1 bg-muted rounded-xl px-3 py-1.5 border-l-4 border-amber-500">
                <div className="text-[12px] text-amber-500 font-semibold flex items-center gap-1">
                  <Pencil className="h-3 w-3" /> Редактирование
                </div>
                <div className="text-[13px] text-muted-foreground truncate">{editingMsg.encryptedContent}</div>
              </div>
              <button onClick={() => { setEditingMsg(null); setText(""); }} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reply preview */}
        <AnimatePresence>
          {replyTo && (
            <motion.div
              initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="flex items-center gap-2 px-3 pt-2 pb-1"
            >
              <div className="flex-1 bg-muted rounded-xl px-3 py-1.5 border-l-4 border-primary">
                <div className="text-[12px] text-primary font-semibold">
                  {replyTo.isSelf ? "Вы" : (replyTo.senderUsername || `User ${replyTo.senderId}`)}
                </div>
                <div className="text-[13px] text-muted-foreground truncate">{replyTo.encryptedContent}</div>
              </div>
              <button onClick={() => setReplyTo(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Emoji picker */}
        <AnimatePresence>
          {showEmoji && (
            <motion.div
              initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="grid grid-cols-8 gap-1 px-3 py-2 border-t border-border/50"
            >
              {EMOJI_QUICK.map(e => (
                <button key={e} onClick={() => setText(t => t + e)}
                  className="text-2xl flex items-center justify-center h-10 rounded-lg hover:bg-muted transition-colors">{e}</button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Attach bottom sheet */}
        <AnimatePresence>
          {showAttach && (
            <>
              <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setShowAttach(false)} />
              <motion.div
                initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                transition={{ type: "tween", duration: 0.2 }}
                className="fixed z-50 bottom-0 left-0 right-0 bg-card rounded-t-2xl border-t border-border p-4"
                style={{ paddingBottom: "max(20px, env(safe-area-inset-bottom))" }}
              >
                <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto mb-4" />
                <div className="flex gap-4">
                  <button
                    onClick={() => { setShowAttach(false); photoRef.current?.click(); }}
                    className="flex-1 flex flex-col items-center gap-2 py-4 rounded-2xl bg-muted hover:bg-muted/70"
                  >
                    <ImageIcon className="h-6 w-6 text-primary" />
                    <span className="text-[13px] text-foreground">Фото / Видео</span>
                  </button>
                  <button
                    onClick={() => { setShowAttach(false); fileRef.current?.click(); }}
                    className="flex-1 flex flex-col items-center gap-2 py-4 rounded-2xl bg-muted hover:bg-muted/70"
                  >
                    <FileIcon className="h-6 w-6 text-primary" />
                    <span className="text-[13px] text-foreground">Файл</span>
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <form onSubmit={handleSend} className="flex items-center gap-2 px-2 py-2">
          {/* Attachment */}
          <button
            type="button"
            onClick={() => setShowAttach(v => !v)}
            className="h-9 w-9 flex items-center justify-center text-primary rounded-full hover:bg-muted shrink-0"
          >
            <Paperclip className="h-5 w-5" />
          </button>
          <input
            ref={photoRef}
            type="file"
            className="hidden"
            accept="image/*,video/*"
            onChange={handleFileSelect}
          />
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept="*/*"
            onChange={handleFileSelect}
          />

          {/* Input */}
          <div className="flex-1 bg-muted rounded-2xl px-3 h-9 flex items-center gap-2">
            <input
              ref={inputRef}
              value={text}
              onChange={e => handleTextChange(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }}}
              placeholder="Сообщение..."
              className="flex-1 bg-transparent outline-none text-[15px] text-foreground placeholder:text-muted-foreground min-w-0"
            />
            <button
              type="button"
              onClick={() => setShowEmoji(v => !v)}
              className={cn("shrink-0 transition-colors", showEmoji ? "text-primary" : "text-muted-foreground hover:text-foreground")}
            >
              <Smile className="h-5 w-5" />
            </button>
          </div>

          {/* Send or Mic */}
          {text.trim() ? (
            <motion.button
              type="submit"
              initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
              className="h-9 w-9 rounded-full bg-primary flex items-center justify-center shrink-0 hover:bg-primary/90"
            >
              <Send className="h-4 w-4 text-white" />
            </motion.button>
          ) : (
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              className={cn(
                "h-9 w-9 flex items-center justify-center rounded-full shrink-0 transition-colors",
                isRecording ? "bg-[#ff3b30] text-white animate-pulse" : "text-primary hover:bg-muted"
              )}
            >
              {isRecording ? <Square className="h-4 w-4" /> : <Mic className="h-5 w-5" />}
            </button>
          )}
        </form>
      </div>

      {/* ── Forward dialog ── */}
      <Dialog open={showForwardDialog} onOpenChange={(open) => { setShowForwardDialog(open); if (!open) setForwardMsg(null); }}>
        <DialogContent className="max-w-sm max-h-[70vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Переслать сообщение</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 -mx-6 px-6">
            {(allChats ?? []).length === 0 && (
              <div className="text-sm text-muted-foreground py-4 text-center">Нет доступных чатов</div>
            )}
            {(allChats ?? []).map((c) => {
              const cName = (c as { name?: string }).name ?? `Чат ${c.id}`;
              return (
                <button
                  key={c.id}
                  onClick={() => doForward(c.id)}
                  className="w-full flex items-center gap-3 py-2.5 px-2 rounded-xl hover:bg-muted text-left"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className={cn(getAvatarColor(cName), "text-white text-sm")}>
                      {cName.slice(0, 1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-[15px] text-foreground truncate">{cName}</span>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
