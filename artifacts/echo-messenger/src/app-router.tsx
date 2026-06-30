import { Switch, Route, Redirect } from "wouter";
import { Layout } from "@/components/layout/layout";
import { Login } from "@/pages/auth/login";
import { ChatList } from "@/pages/chat/chat-list";
import { ChatWindow } from "@/pages/chat/chat-window";
import { SecretChatList } from "@/pages/chat/secret-chat-list";
import { NewChat } from "@/pages/chat/new-chat";
import { Contacts } from "@/pages/contacts/contacts";
import { Calls } from "@/pages/calls/calls";
import { Search } from "@/pages/search/search";
import { Settings } from "@/pages/settings/settings";
import { SecuritySettings } from "@/pages/settings/security";
import { BackupSettings } from "@/pages/settings/backup";
import { UserProfile } from "@/pages/profile/user-profile";
import { CreateGroup } from "@/pages/group/create-group";
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

      <Route path="/chat/new">
        <ProtectedLayout>
          <ChatSplit right={<NewChat />} />
        </ProtectedLayout>
      </Route>

      <Route path="/chat/:id">
        <ProtectedLayout>
          <ChatSplit right={<ChatWindow />} />
        </ProtectedLayout>
      </Route>

      <Route path="/contacts">
        <ProtectedLayout><Contacts /></ProtectedLayout>
      </Route>

      <Route path="/calls">
        <ProtectedLayout><Calls /></ProtectedLayout>
      </Route>

      <Route path="/search">
        <ProtectedLayout><Search /></ProtectedLayout>
      </Route>

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

      <Route path="/new-group">
        <ProtectedLayout><CreateGroup type="group" /></ProtectedLayout>
      </Route>

      <Route path="/new-channel">
        <ProtectedLayout><CreateGroup type="channel" /></ProtectedLayout>
      </Route>

      <Route path="/settings">
        <ProtectedLayout><Settings /></ProtectedLayout>
      </Route>

      <Route path="/settings/security">
        <ProtectedLayout><SecuritySettings /></ProtectedLayout>
      </Route>

      <Route path="/settings/backup">
        <ProtectedLayout><BackupSettings /></ProtectedLayout>
      </Route>

      <Route path="/profile/:userId">
        <ProtectedLayout><UserProfile /></ProtectedLayout>
      </Route>

      <Route>
        <Redirect to="/chats" />
      </Route>
    </Switch>
  );
}
