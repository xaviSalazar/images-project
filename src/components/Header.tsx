import { PlayIcon } from "@radix-ui/react-icons";
import { useState } from "react";
import Shortcuts from "@/components/Shortcuts";
import { useStore } from "@/lib/states";
import { RotateCw, Image, Upload } from "lucide-react";

import { IconButton, ImageUploadButton } from "@/components/ui/button";

const Header = () => {
  const [
    file,
    customMask,
    isInpainting,
    serverConfig,
    runMannually,
    enableUploadMask,
    model,
    setFile,
    setCustomFile,
    runInpainting,
    showPrevMask,
    hidePrevMask,
    imageHeight,
    imageWidth,
  ] = useStore((state) => [
    state.file,
    state.customMask,
    state.isInpainting,
    state.serverConfig,
    state.runMannually(),
    state.settings.enableUploadMask,
    state.settings.model,
    state.setFile,
    state.setCustomFile,
    state.runInpainting,
    state.showPrevMask,
    state.hidePrevMask,
    state.imageHeight,
    state.imageWidth,
  ]);
  return (
    <header className="h-[60px] px-6 py-4 absolute top-[0] flex justify-between items-center w-full z-20 border-b backdrop-filter backdrop-blur-md bg-background/70">
      <div className="flex items-center gap-1">
        <div className="flex gap-1">
          <Shortcuts />
        </div>

        <ImageUploadButton
          disabled={isInpainting}
          tooltip="Upload image"
          onFileUpload={(file) => {
            setFile(file);
          }}
        >
          <Image />
        </ImageUploadButton>
      </div>
    </header>
  );
};

export default Header;
