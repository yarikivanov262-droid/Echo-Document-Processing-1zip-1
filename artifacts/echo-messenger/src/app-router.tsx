import { Switch, Route, Redirect } from "wouter";
import { Layout } from "@/components/layout/layout";
import { Login } from "@/pages/auth/login";
import { ChatList } from "@/pages/chat/chat-list";
import { ChatWindow } from "@/pages/chat/chat-window";
import { SecretChatList } from "@/pages/chat/secret-chat-list";
import { NewChat } from "@/pages/chat/new-chat";
import { Contacts } from "@/pages/contacts/contacts";
import { Calls } from "@/pages/calls/calls";
import { CallScreen } from "@/pages/calls/call-screen";
import { Search } from "@/pages/search/search";
import { Settings } from "@/pages/settings/settings";
import { SecuritySettings } from "@/pages/settings/security";
import { BackupSettings } from "@/pages/settings/backup";
import { NotificationsSettings } from "@/pages/settings/notifications";
import { AppearanceSettings } from "@/pages/settings/appearance";
import { PrivacySettings } from "@/pages/settings/privacy";
import { LanguageSettings } from "@/pages/settings/language";
import { ProfilesSettings } from "@/pages/settings/profiles";
import { ActivityLog } from "@/pages/settings/activity-log";
import { MyProfile } from "@/pages/profile/my-profile";
import { UserProfile } from "@/pages/profile/user-profile";
import { CreateGroup } from "@/pages/group/create-group";
import { StickerPacks } from "@/pages/stickers/sticker-packs";
import { useEchoAuth } from "@/lib/auth-context";

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useEchoAuth();
  if (!isAuthenticated) return <Redirect to="/" />;
  return <Layout>{children}</Layout>;
}

function ChatSplit({ right }: { right: React.ReactNode }) {
  return (
    <div className="flex h-full w-full">
      <div className="hidden md:block shrink-0">
        <ChatList />
      </div>
      <div className="flex-1 md:border-l border-border h-full overflow-hidden">
        {right}
      </div>
    </div>
  );
}

export function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={Login} />

      {/* Chats */}
      <Route path="/chats">
        <ProtectedLayout>
          <ChatSplit right={
            <div className="hidden md:flex flex-1 h-full items-center justify-center bg-background">
              <div className="text-center text-muted-foreground">
                <div className="text-5xl mb-3">💬</div>
                <div className="text-[15px]">Выберите чат</div>
              </div>
            </div>
          } />
        </ProtectedLayout>
      </Route>

      <Route path="/chats/archived">
        <ProtectedLayout>
          <ChatSplit right={
            <div className="hidden md:flex flex-1 h-full items-center justify-center bg-background">
              <div className="text-center text-muted-foreground">
                <div className="text-5xl mb-3">🗄️</div>
                <div className="text-[15px]">Выберите чат</div>
              </div>
            </div>
          } />
        </ProtectedLayout>
      </Route>

      <Route path="/chat/new">
        <ProtectedLayout>
          <ChatSplit right={<NewChat />} />
        </ProtectedLayout>
      </Route>

      <Route path="/chat/favorites">
        <ProtectedLayout>
          <ChatSplit right={
            <div className="flex flex-col h-full items-center justify-center gap-3 text-muted-foreground">
              <div className="text-5xl">⭐</div>
              <div className="text-[16px] font-medium">Избранное</div>
              <div className="text-[13px]">Сохраняйте важные сообщения здесь</div>
            </div>
          } />
        </ProtectedLayout>
      </Route>

      {/* Call screen — fullscreen, outside Layout */}
      <Route path="/chat/:id/voice">
        <CallScreen />
      </Route>

      <Route path="/chat/:id">
        <ProtectedLayout>
          <ChatSplit right={<ChatWindow />} />
        </ProtectedLayout>
      </Route>

      {/* Contacts */}
      <Route path="/contacts">
        <ProtectedLayout><Contacts /></ProtectedLayout>
      </Route>

      {/* Calls */}
      <Route path="/calls">
        <ProtectedLayout><Calls /></ProtectedLayout>
      </Route>

      {/* Search */}
      <Route path="/search">
        <ProtectedLayout><Search /></ProtectedLayout>
      </Route>

      {/* Secret Chats */}
      <Route path="/secret-chats">
        <ProtectedLayout>
          <div className="flex h-full w-full">
            <SecretChatList />
            <div className="hidden md:flex flex-1 items-center justify-center bg-background border-l border-border">
              <div className="text-center text-muted-foreground">
                <div className="text-5xl mb-3">🔒</div>
                <div className="text-[15px]">Секретные чаты</div>
              </div>
            </div>
          </div>
        </ProtectedLayout>
      </Route>

      <Route path="/secret-chat/:id">
        <ProtectedLayout>
          <div className="flex h-full w-full">
            <div className="hidden md:block shrink-0"><SecretChatList /></div>
            <div className="flex-1 md:border-l border-border h-full overflow-hidden"><ChatWindow /></div>
          </div>
        </ProtectedLayout>
      </Route>

      {/* Create group/channel */}
      <Route path="/new-group">
        <ProtectedLayout><CreateGroup type="group" /></ProtectedLayout>
      </Route>
      <Route path="/new-channel">
        <ProtectedLayout><CreateGroup type="channel" /></ProtectedLayout>
      </Route>

      {/* Sticker packs */}
      <Route path="/sticker-packs">
        <ProtectedLayout><StickerPacks /></ProtectedLayout>
      </Route>

      {/* Settings hub */}
      <Route path="/settings">
        <ProtectedLayout><Settings /></ProtectedLayout>
      </Route>
      <Route path="/settings/my-profile">
        <ProtectedLayout><MyProfile /></ProtectedLayout>
      </Route>
      <Route path="/settings/security">
        <ProtectedLayout><SecuritySettings /></ProtectedLayout>
      </Route>
      <Route path="/settings/backup">
        <ProtectedLayout><BackupSettings /></ProtectedLayout>
      </Route>
      <Route path="/settings/notifications">
        <ProtectedLayout><NotificationsSettings /></ProtectedLayout>
      </Route>
      <Route path="/settings/appearance">
        <ProtectedLayout><AppearanceSettings /></ProtectedLayout>
      </Route>
      <Route path="/settings/privacy">
        <ProtectedLayout><PrivacySettings /></ProtectedLayout>
      </Route>
      <Route path="/settings/language">
        <ProtectedLayout><LanguageSettings /></ProtectedLayout>
      </Route>
      <Route path="/settings/profiles">
        <ProtectedLayout><ProfilesSettings /></ProtectedLayout>
      </Route>
      <Route path="/settings/log">
        <ProtectedLayout><ActivityLog /></ProtectedLayout>
      </Route>
      <Route path="/settings/rate">
        <ProtectedLayout>
          <div className="flex flex-col h-full items-center justify-center gap-4 text-center px-8">
            <div className="text-6xl">⭐</div>
            <div className="text-[20px] font-bold">Вам нравится ECHO?</div>
            <div className="text-[14px] text-muted-foreground">Оставьте отзыв и помогите нам стать лучше</div>
            <div className="flex gap-2 text-4xl mt-2">
              {["⭐","⭐","⭐","⭐","⭐"].map((s,i) => <span key={i} className="cursor-pointer hover:scale-110 transition-transform">{s}</span>)}
            </div>
          </div>
        </ProtectedLayout>
      </Route>

      {/* User profiles */}
      <Route path="/profile/:userId">
        <ProtectedLayout><UserProfile /></ProtectedLayout>
      </Route>

      <Route>
        <Redirect to="/chats" />
      </Route>
    </Switch>
  );
}
