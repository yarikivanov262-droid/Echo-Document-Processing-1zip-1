import { Link } from "wouter";
import { Settings as SettingsIcon, ShieldAlert, User, Key, HardDrive, Bell, Palette, LogOut, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useGetMe } from "@workspace/api-client-react";
import { useEchoAuth } from "@/lib/auth-context";

export function Settings() {
  const { data: user } = useGetMe();
  const { logout } = useEchoAuth();

  const settingsGroups = [
    {
      title: "Account",
      items: [
        { icon: User, label: "Edit Profile", href: `/profile/${user?.id || 'me'}` },
        { icon: Palette, label: "Appearance", href: "/settings/appearance" },
        { icon: Bell, label: "Notifications", href: "/settings/notifications" },
      ]
    },
    {
      title: "Security & Data",
      items: [
        { icon: ShieldAlert, label: "Security & Privacy", href: "/settings/security", highlight: true },
        { icon: Key, label: "Cryptographic Keys", href: "/settings/keys" },
        { icon: HardDrive, label: "Encrypted Backup", href: "/settings/backup" },
      ]
    }
  ];

  return (
    <div className="flex flex-col h-full bg-background w-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card/50 backdrop-blur-sm shrink-0">
        <h1 className="text-xl font-bold font-mono tracking-tight">Settings</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Profile Card */}
        <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4">
          <Avatar className="h-16 w-16 border-2 border-primary/20 bg-muted">
            {user?.avatarFileId && <AvatarImage src={user.avatarFileId} />}
            <AvatarFallback className="font-mono text-lg text-primary bg-primary/10">
              {user?.username?.substring(0, 2).toUpperCase() || "ME"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-lg truncate">{user?.username || "Unknown"}</h2>
            <p className="text-xs text-muted-foreground font-mono flex items-center gap-1 mt-1">
              <span className="w-2 h-2 rounded-full bg-primary inline-block" /> Online
            </p>
          </div>
        </div>

        {/* Settings Groups */}
        <div className="space-y-6">
          {settingsGroups.map((group, i) => (
            <div key={i} className="space-y-2">
              <h3 className="px-2 text-xs font-bold text-muted-foreground font-mono uppercase tracking-widest">
                {group.title}
              </h3>
              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                {group.items.map((item, j) => (
                  <Link key={j} href={item.href}>
                    <div className={`flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors ${j !== group.items.length - 1 ? 'border-b border-border' : ''}`}>
                      <div className="flex items-center gap-3">
                        <item.icon className={`h-5 w-5 ${item.highlight ? 'text-primary' : 'text-muted-foreground'}`} />
                        <span className={`text-sm font-medium ${item.highlight ? 'text-foreground' : ''}`}>{item.label}</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Danger Zone */}
        <div className="pt-4">
          <Button 
            variant="ghost" 
            className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 font-mono uppercase tracking-widest text-xs h-12"
            onClick={logout}
          >
            <LogOut className="mr-2 h-4 w-4" /> Terminate Session
          </Button>
        </div>
      </div>
    </div>
  );
}
