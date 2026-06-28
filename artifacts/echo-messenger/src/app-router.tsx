import { Switch, Route } from "wouter";
import { Layout } from "@/components/layout/layout";
import { Login } from "@/pages/auth/login";
import { ChatList } from "@/pages/chat/chat-list";
import { ChatWindow } from "@/pages/chat/chat-window";
import { SecretChatList } from "@/pages/chat/secret-chat-list";
import { Contacts } from "@/pages/contacts/contacts";
import { Settings } from "@/pages/settings/settings";
import { SecuritySettings } from "@/pages/settings/security";
import { BackupSettings } from "@/pages/settings/backup";

// Stub additional Pages
const SecretChat = () => <div className="p-8 font-mono text-primary">Secret Chat Area [Encrypted]</div>;
const Profiles = () => <div className="p-8">Profiles</div>;
const SecurityLog = () => <div className="p-8">Security Log</div>;
const StickerPacks = () => <div className="p-8">Sticker Packs</div>;
const CreateGroup = () => <div className="p-8">Create Group</div>;
const CreateChannel = () => <div className="p-8">Create Channel</div>;
const UserProfile = () => <div className="p-8">User Profile</div>;
const CallHistory = () => <div className="p-8">Call History</div>;
const NotFound = () => <div className="p-8">Not Found</div>;

export function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={Login} />
      
      <Route path="/chats">
        <Layout>
          <div className="flex h-full w-full">
            <ChatList />
            <div className="hidden md:flex flex-1 items-center justify-center bg-background/50 border-l border-border">
              <div className="text-center font-mono text-muted-foreground opacity-50">
                <div className="text-4xl mb-4">ECHO</div>
                <div className="text-xs uppercase tracking-widest">Select a chat to decrypt</div>
              </div>
            </div>
          </div>
        </Layout>
      </Route>
      
      <Route path="/chat/:id">
        <Layout>
          <div className="flex h-full w-full">
            <div className="hidden md:block">
              <ChatList />
            </div>
            <div className="flex-1 flex md:border-l border-border h-full">
              <ChatWindow />
            </div>
          </div>
        </Layout>
      </Route>
      
      <Route path="/contacts">
        <Layout>
          <Contacts />
        </Layout>
      </Route>
      
      <Route path="/secret-chats">
        <Layout>
           <div className="flex h-full w-full">
            <SecretChatList />
            <div className="hidden md:flex flex-1 items-center justify-center bg-background border-l border-primary/20">
              <div className="text-center font-mono text-primary opacity-50">
                <div className="text-4xl mb-4">SECURE ENCLAVE</div>
                <div className="text-xs uppercase tracking-widest">Select a hidden chat</div>
              </div>
            </div>
          </div>
        </Layout>
      </Route>

      <Route path="/secret-chat/:id">
        <Layout>
          <div className="flex h-full w-full">
             <div className="hidden md:block">
               <SecretChatList />
             </div>
             <div className="flex-1 flex md:border-l border-primary/20 h-full">
               <SecretChat />
             </div>
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

      {/* Other stubbed routes */}
      <Route path="/settings/profiles"><Layout><Profiles /></Layout></Route>
      <Route path="/settings/log"><Layout><SecurityLog /></Layout></Route>
      <Route path="/sticker-packs"><Layout><StickerPacks /></Layout></Route>
      <Route path="/new-group"><Layout><CreateGroup /></Layout></Route>
      <Route path="/new-channel"><Layout><CreateChannel /></Layout></Route>
      <Route path="/profile/:userId"><Layout><UserProfile /></Layout></Route>
      <Route path="/calls"><Layout><CallHistory /></Layout></Route>
      <Route component={NotFound} />
    </Switch>
  );
}
