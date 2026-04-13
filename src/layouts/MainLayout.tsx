import { HouseIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuthContext } from "@/contexts/authContext";
import { account } from "@/lib/appwrite";
import { toast } from "sonner";

const menuItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: HouseIcon,
    match: (pathname: string) => pathname === "/dashboard",
  },
];

const MainLayout = () => {
  const [showLogout, setShowLogout] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { authUser, setAuthUser } = useAuthContext();

  const handleLogout = async () => {
    try {
      await account.deleteSession("current");
    } catch {
      // Continue clearing local auth state even if remote session is already invalid.
    }

    setAuthUser(null as unknown as User);
    toast.success("Logged out");
    navigate("/login");
  };

  return (
    <TooltipProvider>
      <SidebarProvider>
        <Sidebar>
          <SidebarHeader>
            <div className="px-2 py-1">
              <p className="text-xs text-sidebar-foreground/70">Archone</p>
              <h2 className="text-sm font-semibold">Instructor Portal</h2>
            </div>
          </SidebarHeader>

          <SidebarSeparator />

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Navigation</SidebarGroupLabel>
              <SidebarMenu>
                {menuItems.map((item) => {
                  const Icon = item.icon;

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={item.match(location.pathname)}
                        tooltip={item.title}
                      >
                        <Link to={item.href}>
                          <Icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter>
            <button
              type="button"
              onClick={() => setShowLogout((current) => !current)}
              className="w-full rounded-none border border-sidebar-border px-2 py-3 text-left text-xs"
            >
              Signed in as <br /> {authUser?.name || "Instructor"}
            </button>

            {showLogout && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleLogout}
              >
                Logout
              </Button>
            )}
          </SidebarFooter>
        </Sidebar>

        <SidebarInset>
          <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur">
            <SidebarTrigger />
            <p className="text-sm text-muted-foreground"></p>
          </header>

          <div className="flex-1">
            <Outlet />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
};

export default MainLayout;
