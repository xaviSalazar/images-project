// import { PlayIcon } from "@radix-ui/react-icons";
// import { useState } from "react";
import Shortcuts from "@/components/workspace/Shortcuts";
// import { useStore } from "@/lib/states";
// import { RotateCw, Image, Upload } from "lucide-react";
// import SettingsDialog from "./Settings";
import InstructionsDialog from "./Instructions";

import LanguageSwitcher from "./LanguageSwitcher";
import PromptInput from "./PromptInput";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useStore } from "@/lib/states";

const Header = () => {
  const [updateSettings] = useStore((state) => [state.updateSettings]);
  const dev_mode = useStore((state) => state.settings.isDevModeActive);
  const handleSwitchChange = (checked: boolean) => {
    updateSettings({ isDevModeActive: checked });
  };

  return (
    <header className="h-[60px] px-6 py-4 absolute top-[0] flex justify-between items-start z-20 border-b backdrop-filter backdrop-blur-md bg-background/70 w-full ">
      <div className="flex items-center space-x-2">
        <Switch
          id="development-mode"
          checked={dev_mode}
          onCheckedChange={handleSwitchChange}
        />
        <Label htmlFor="development-mode">
          {dev_mode ? "Testing mode" : "Oficial mode"}
        </Label>
      </div>

      <PromptInput />

      <div className="flex gap-1">
        <InstructionsDialog />
        <LanguageSwitcher />
        <Shortcuts />
        {/* <SettingsDialog /> */}
      </div>
    </header>
  );
};

export default Header;
