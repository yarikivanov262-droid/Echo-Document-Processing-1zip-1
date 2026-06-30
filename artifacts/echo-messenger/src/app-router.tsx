import { Switch, Route } from "wouter";
import { Layout } from "@/components/layout/layout";
import { Login } from "@/pages/auth/login";
import { ChatList } from "@/pages/chat/chat-list";
import { ChatWindow } from "@/pages/chat/chat-window";
import { SecretChatList } from "@/pages/chat/secret-chat-list";
import { Contacts } from "@/pages/contacts/contacts";
import { Calls } from "@/pages/calls/calls";
import { Settings } from "@/pages/settings/settings";
import { SecuritySettings } from "@/pages/settings/security";
import { BackupSettings } from "@/pages/settings/backup";

const SecretChat = () => <div className="p-8 text-muted-foreground">Секретный чат</div>;
const Profiles = () => <div className="p-8">Профиль</div>;
const NotFound = () => <div className="flex items-center justify-center h-full text-muted-foreground">Страница не найдена</div>;

export function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={Login} />

      <Route path="/chats">
        <Layout>
          <div className="flex h-full w-full">
            <ChatList />
            <div className="hidden md:flex flex-1 items-center justify-center bg-background border-l border-border">
              <div className="text-center text-muted-foreground">
                <div className="text-5xl mb-3">💬</div>
                <div className="text-[15px]">Выберите чат</div>
              </div>
            </div>
          </div>
        </Layout>
      </Route>

      <Route path="/chat/:id">
        <Layout>
          <div className="flex h-full w-full">
            <div className="hidden md:block shrink-0">
              <ChatList />
            </div>
            <div className="flex-1 flex md:border-l border-border h-full overflow-hidden">
              <ChatWindow />
            </div>
          </div>
        </Layout>
      </Route>

      <Route path="/contacts">
        <Layout><Contacts /></Layout>
      </Route>

      <Route path="/calls">
        <Layout><Calls /></Layout>
      </Route>

      <Route path="/secret-chats">
        <Layout>
          <div className="flex h-full w-full">
            <SecretChatList />
            <div className="hidden md:flex flex-1 items-center justify-center bg-background border-l border-border/30">
              <div className="text-center text-muted-foreground">
                <div className="text-5xl mb-3">🔒</div>
                <div className="text-[15px]">Секретные чаты</div>
              </div>
            </div>
          </div>
        </Layout>
      </Route>

      <Route path="/secret-chat/:id">
        <Layout>
          <div className="flex h-full w-full">
            <div className="hidden md:block shrink-0"><SecretChatList /></div>
            <div className="flex-1 flex md:border-l h-full"><SecretChat /></div>
          </div>
        </Layout>
      </Route>

      <Route path="/settings">
        <Layout><Settings /></Layout>
      </Route>

      <Route path="/settings/security">
        <Layout><SecuritySettings /></Layout>
      </Route>

      <Route path="/settings/backup">
        <Layout><BackupSettings /></Layout>
      </Route>

      <Route path="/settings/profiles"><Layout><Profiles /></Layout></Route>
      <Route path="/profile/:userId"><Layout><Profiles /></Layout></Route>
      <Route component={NotFound} />
    </Switch>
  );
}
