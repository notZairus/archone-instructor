import { type PropsWithChildren } from "react";
import { Toaster } from "sonner";
import { useThemeContext } from "@/contexts/use-theme-context";

const ToastProvider = ({ children }: PropsWithChildren) => {
  const { theme } = useThemeContext();

  return (
    <>
      {children}
      <Toaster theme={theme} />
    </>
  );
};

export default ToastProvider;
