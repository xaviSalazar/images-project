import { useToggle } from "react-use";
import { useStore } from "@/lib/states";
import { Separator } from "../ui/separator";
import { ScrollArea } from "../ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTrigger } from "../ui/sheet";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "../ui/button";
import useHotKey from "@/hooks/useHotkey";
import { RowContainer, LabelTitle } from "./LabelTitle";
import CanvasOptions from "./CanvasOptions";
import RatioOptions from "./RatioOptions";
import { useTranslation } from "react-i18next";
import React, { MutableRefObject } from "react";
import { Settings } from "lucide-react";
import { Images } from "lucide-react";
import { Paperclip } from "lucide-react";
import { WandSparkles } from "lucide-react";
import { Layers } from "lucide-react";

import {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from "@/components/ui/menubar";

// import LDMOptions from "./LDMOptions";
// import DiffusionOptions from "./DiffusionOptions";
// import CV2Options from "./CV2Options";

export interface Artwork {
  artist: string;
  art: string;
}

const domain_dist = "https://d1d5i0xjsb5dtw.cloudfront.net/";

export const works: Artwork[] = [
  {
    artist: "Stable Diffusion 1",
    art: `${domain_dist}photo-ai/TEST1_0.png`,
  },
  {
    artist: "Stable Diffusion2",
    art: `${domain_dist}photo-ai/TEST1_1.png`,
  },
  {
    artist: "Stable Diffusion3",
    art: `${domain_dist}photo-ai/TEST1_2.png`,
  },
  {
    artist: "Stable Diffusion4",
    art: `${domain_dist}photo-ai/TEST1_3.png`,
  },
  {
    artist: "Stable Diffusion5",
    art: `${domain_dist}photo-ai/TEST2_0.png`,
  },
  {
    artist: "Stable Diffusion6",
    art: `${domain_dist}photo-ai/TEST2_1.png`,
  },
  {
    artist: "Stable Diffusion7",
    art: `${domain_dist}photo-ai/TEST2_2.png`,
  },
  {
    artist: "Stable Diffusion8",
    art: `${domain_dist}photo-ai/TEST2_3.png`,
  },
  {
    artist: "Stable Diffusion9",
    art: `${domain_dist}photo-ai/picture_3.png`,
  },
  {
    artist: "Stable Diffusion10",
    art: `${domain_dist}photo-ai/picture_2.png`,
  },
];

const LeftSidePanel = () => {
  const [isInpainting, runImgRendering, windowSize] = useStore((state) => [
    state.isInpainting,
    state.runImgRendering,
    state.windowSize,
  ]);

  const [open, toggleOpen] = useToggle(true);

  useHotKey("c", () => {
    toggleOpen();
  });

  const handleDragStart = (
    event: React.DragEvent<HTMLElement>,
    artwork: Artwork,
  ) => {
    event.dataTransfer.setData("text/plain", artwork.art);
  };

  function MenubarDemo() {
    return (
      <Menubar className="z-10 outline-none absolute top-[120px] left-6 rounded-lg border bg-background flex flex-col">
        <MenubarMenu>
          <MenubarTrigger>
            {" "}
            <Images /> IMAGENES{" "}
          </MenubarTrigger>
          <MenubarContent>
            <ScrollArea
              style={{ height: windowSize.height - 160 }}
              className="pr-3"
            >
              <div className="flex flex-col w-max space-x-4 p-4">
                {works.map((artwork) => (
                  <figure
                    key={artwork.artist}
                    className="shrink-0"
                    draggable
                    onDragStart={(event) => handleDragStart(event, artwork)}
                  >
                    <div className="overflow-hidden rounded-md">
                      <img
                        src={artwork.art}
                        alt={`Photo by ${artwork.artist}`}
                        className="h-[400px] w-[600px] object-cover"
                      />
                    </div>
                    <figcaption className="pt-2 text-xs text-muted-foreground">
                      Photo by{" "}
                      <span className="font-semibold text-foreground">
                        {artwork.artist}
                      </span>
                    </figcaption>
                  </figure>
                ))}
              </div>
            </ScrollArea>
          </MenubarContent>
        </MenubarMenu>

        <Separator />

        <MenubarMenu>
          <MenubarTrigger>
            <Paperclip /> UPLOADS
          </MenubarTrigger>
          <MenubarContent>
            <MenubarItem>
              Undo <MenubarShortcut>⌘Z</MenubarShortcut>
            </MenubarItem>
            <MenubarItem>
              Redo <MenubarShortcut>⇧⌘Z</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarSub>
              <MenubarSubTrigger>Find</MenubarSubTrigger>
              <MenubarSubContent>
                <MenubarItem>Search the web</MenubarItem>
                <MenubarSeparator />
                <MenubarItem>Find...</MenubarItem>
                <MenubarItem>Find Next</MenubarItem>
                <MenubarItem>Find Previous</MenubarItem>
              </MenubarSubContent>
            </MenubarSub>
            <MenubarSeparator />
            <MenubarItem>Cut</MenubarItem>
            <MenubarItem>Copy</MenubarItem>
            <MenubarItem>Paste</MenubarItem>
          </MenubarContent>
        </MenubarMenu>

        <Separator />

        <MenubarMenu>
          <MenubarTrigger>
            <WandSparkles /> MAGIC AI
          </MenubarTrigger>
          <MenubarContent>
            <MenubarItem
              disabled={isInpainting}
              onClick={() => {
                runImgRendering();
              }}
            >
              Create image
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>

        <Separator />

        <MenubarMenu>
          <MenubarTrigger>
            {" "}
            <Layers /> AJUSTA IMAGEN
          </MenubarTrigger>
          <MenubarContent>
            <CanvasOptions />
          </MenubarContent>
        </MenubarMenu>

        <MenubarMenu>
          <MenubarTrigger>
            {" "}
            <Layers /> DEVICE RATIO
          </MenubarTrigger>
          <MenubarContent>
            <RatioOptions />
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
    );
  }

  return (
    <MenubarDemo />

    // <Sheet open={open} modal={false}>
    //   <SheetTrigger
    //     tabIndex={-1}
    //     className="z-10 outline-none absolute top-[68px] left-6 rounded-lg border bg-background"
    //     hidden={open}
    //   >
    //     <Button
    //       variant="ghost"
    //       size="icon"
    //       asChild
    //       className="p-1.5"
    //       onClick={toggleOpen}
    //     >
    //       <ChevronRight strokeWidth={1} />
    //     </Button>
    //   </SheetTrigger>
    //   <SheetContent
    //     side="left"
    //     className="w-[300px] mt-[60px] outline-none pl-4 pr-1"
    //     onOpenAutoFocus={(event) => event.preventDefault()}
    //     onPointerDownOutside={(event) => event.preventDefault()}
    //   >
    //     <SheetHeader>
    //       <RowContainer>
    //         <div className="overflow-hidden mr-8">{"OPTIONS"}</div>
    //         <Button
    //           variant="ghost"
    //           size="icon"
    //           className="border h-6 w-6"
    //           onClick={toggleOpen}
    //         >
    //           <ChevronLeft strokeWidth={1} />
    //         </Button>
    //       </RowContainer>
    //       <Separator />
    //     </SheetHeader>
    //     <ScrollArea
    //       style={{ height: windowSize.height - 160 }}
    //       className="pr-3"
    //     >
    //       <CanvasOptions fabricRef={fabricRef} />
    //     </ScrollArea>
    //   </SheetContent>
    // </Sheet>
  );
};

export default LeftSidePanel;
