import {
  SquaresFourIcon,
  ChalkboardIcon,
  FileTextIcon,
} from "@phosphor-icons/react";
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
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuthContext } from "@/contexts/authContext";
import { account } from "@/lib/appwrite";
import { toast } from "sonner";
import { useThemeContext } from "@/contexts/use-theme-context";
import { Sun, Moon } from "lucide-react";

const menuItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: SquaresFourIcon,
    match: (pathname: string) => pathname === "/dashboard",
  },
  {
    title: "Classrooms",
    href: "/classrooms",
    icon: ChalkboardIcon,
    match: (pathname: string) => pathname === "/classrooms",
  },
  {
    title: "Student Analysis",
    href: "/student-analysis",
    icon: FileTextIcon,
    match: (pathname: string) => pathname === "/student-analysis",
  },
];

const MainLayout = () => {
  const [showLogout, setShowLogout] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { authUser, setAuthUser } = useAuthContext();
  const { theme, setTheme } = useThemeContext();

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
        <Sidebar variant="floating">
          <SidebarHeader className="rounded-xl px-8 py-6 m-2 shadow-md bg-background-lightest">
            <div className="text-center">
              <p className="text-xs text-sidebar-foreground/70">Archone</p>
              <h2 className="font-semibold">Instructor Portal</h2>
            </div>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs text-sidebar-foreground/70">
                Navigation
              </SidebarGroupLabel>
              <SidebarMenu className="space-y-1">
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
              className="w-full bg-background-lightest shadow-md rounded-xl px-2 py-3 text-left text-xs"
            >
              Signed in as <br /> {authUser?.name || "Instructor"}
            </button>

            {showLogout && (
              <Button
                type="button"
                size="sm"
                className="w-full bg-background-lightest text-foreground shadow rounded-lg"
                onClick={handleLogout}
              >
                Logout
              </Button>
            )}
          </SidebarFooter>
        </Sidebar>

        <SidebarInset>
          <div className="pt-4 sm:px-8 sticky top-0 z-10">
            <header className="rounded-xl bg-background-lighter top-0 z-10 flex h-14 items-center justify-between gap-2 shadow-lg px-4">
              <SidebarTrigger className="bg-transparent text-foreground cursor-pointer" />
              <div
                className="cursor-pointer"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                {theme === "light" ? (
                  <Sun className="w-5 h-5 text-foreground" />
                ) : (
                  <Moon className="w-5 h-5 text-foreground" />
                )}
              </div>
            </header>
          </div>

          <div className="flex-1">
            <Outlet />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
};

export default MainLayout;
