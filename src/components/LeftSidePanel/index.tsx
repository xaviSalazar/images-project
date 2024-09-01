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
import React, { MutableRefObject, useRef} from "react";
import { Settings } from "lucide-react";
import { Images } from "lucide-react";
import { Paperclip } from "lucide-react";
import { WandSparkles } from "lucide-react";
import { Ratio } from "lucide-react";
import { SUPPORTED_FILE_TYPE } from "@/lib/const"
import { LazyLoadImage } from 'react-lazy-load-image-component';
import 'react-lazy-load-image-component/src/effects/blur.css';



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
    artist: "Adobe photos 1",
    art: `${domain_dist}photo-ai/Example_beach1.png`,
  },
  {
    artist: "Adobe photos 2",
    art: `${domain_dist}photo-ai/Example_minimalistic.png`,
  },
  {
    artist: "Adobe photos 3",
    art: `${domain_dist}photo-ai/Example_wooden.png`,
  },
  // {
  //   artist: "Stable Diffusion4",
  //   art: `${domain_dist}photo-ai/TEST1_3.png`,
  // },
  // {
  //   artist: "Stable Diffusion5",
  //   art: `${domain_dist}photo-ai/TEST2_0.png`,
  // },

];

const LeftSidePanel = () => {
  const [isInpainting, runImgRendering, windowSize, setFile] = useStore((state) => [
    state.isInpainting,
    state.runImgRendering,
    state.windowSize,
    state.setFile,
  ]);

  const fileInputRef = useRef(null);
  const { t } = useTranslation();


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

  const onFileSelected = async (file: File) => {
    if (!file) {
      return;
    }
    // Skip non-image files
    const isImage = file.type.match("image.*");
    if (!isImage) {
      return;
    }
    try {
      // Check if file is larger than 20mb
      // if (file.size > 20 * 1024 * 1024) {
      //   throw new Error("file too large");
      // }

      setFile(file);
    } catch (e) {
      // eslint-disable-next-line
      alert(`error: ${(e as any).message}`);
    }
  };
  
  const handleUploadClick = () => {
    console.log("handle upload")
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }

  function MenubarDemo() {
    return (
      <Menubar className="z-10 outline-none absolute top-[120px] left-6 rounded-lg border bg-background flex flex-col">
        <MenubarMenu>
          <MenubarTrigger>
            {" "}
            <Images /> {t("See gallery")}
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
                      <LazyLoadImage
                      alt={`Photo by ${artwork.artist}`}
                      height={250}
                      width={250}
                      effect="blur"
                      src={artwork.art} // use normal <img> attributes as props
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
          <MenubarTrigger onClick={handleUploadClick}>
          <input
            ref={fileInputRef}
            className="hidden"
            type="file"
            onChange={(ev) => {
              const file = ev.currentTarget.files?.[0]
              if (file) {
                onFileSelected(file)
              }
            }}
            accept={SUPPORTED_FILE_TYPE.join(', ')}
          />
            <Paperclip /> {t("Upload Picture")}
        </MenubarTrigger>
        </MenubarMenu>

        <Separator />

        <MenubarMenu>
          <MenubarTrigger>
            <WandSparkles /> Magic AI
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

        {/* <MenubarMenu>
          <MenubarTrigger>
            {" "}
            <Layers /> AJUSTA IMAGEN
          </MenubarTrigger>
          <MenubarContent>
            <CanvasOptions />
          </MenubarContent>
        </MenubarMenu> */}

        <MenubarMenu>
          <MenubarTrigger>
            {" "}
            <Ratio /> {t("Format")}
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
