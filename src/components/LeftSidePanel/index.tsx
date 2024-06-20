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
import { useTranslation } from "react-i18next";
import { MutableRefObject } from "react";
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
} from "@/components/ui/menubar"

// import LDMOptions from "./LDMOptions";
// import DiffusionOptions from "./DiffusionOptions";
// import CV2Options from "./CV2Options";

type Props = {
  fabricRef: MutableRefObject<fabric.Canvas | null>;
};

const LeftSidePanel = ({ fabricRef }: Props) => {
  const [settings, windowSize] = useStore((state) => [
    state.settings,
    state.windowSize,
  ]);

  const [open, toggleOpen] = useToggle(true);

  useHotKey("c", () => {
    toggleOpen();
  });

  function MenubarDemo() {
    return (
  <Menubar className="z-10 outline-none absolute top-[120px] left-6 rounded-lg border bg-background flex flex-col">
        <MenubarMenu>
          <MenubarTrigger> <Images/> IMAGENES </MenubarTrigger>
            <MenubarContent>
              <MenubarItem>
                New Tab <MenubarShortcut>⌘T</MenubarShortcut>
              </MenubarItem>
              <MenubarItem>
                New Window <MenubarShortcut>⌘N</MenubarShortcut>
              </MenubarItem>
              <MenubarItem disabled>New Incognito Window</MenubarItem>
              <MenubarSeparator />
              <MenubarSub>
                <MenubarSubTrigger>Share</MenubarSubTrigger>
                <MenubarSubContent>
                  <MenubarItem>Email link</MenubarItem>
                  <MenubarItem>Messages</MenubarItem>
                  <MenubarItem>Notes</MenubarItem>
                </MenubarSubContent>
              </MenubarSub>
              <MenubarSeparator />
              <MenubarItem>
                Print... <MenubarShortcut>⌘P</MenubarShortcut>
              </MenubarItem>
            </MenubarContent>
        </MenubarMenu>
  
        <Separator />
  
        <MenubarMenu>
          <MenubarTrigger><Paperclip/> UPLOADS</MenubarTrigger>
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
          <MenubarTrigger> <WandSparkles/> MAGIC AI</MenubarTrigger>
          <MenubarContent>
            <MenubarCheckboxItem>Always Show Bookmarks Bar</MenubarCheckboxItem>
            <MenubarCheckboxItem checked>
              Always Show Full URLs
            </MenubarCheckboxItem>
            <MenubarSeparator />
            <MenubarItem inset>
              Reload <MenubarShortcut>⌘R</MenubarShortcut>
            </MenubarItem>
            <MenubarItem disabled inset>
              Force Reload <MenubarShortcut>⇧⌘R</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem inset>Toggle Fullscreen</MenubarItem>
            <MenubarSeparator />
            <MenubarItem inset>Hide Sidebar</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
  
        <Separator />
  
        <MenubarMenu>
          <MenubarTrigger> <Layers/> AJUSTA IMAGEN</MenubarTrigger>
          <MenubarContent>
          <CanvasOptions fabricRef={fabricRef} />
            {/* <MenubarRadioGroup value="benoit">
              <MenubarRadioItem value="andy">Andy</MenubarRadioItem>
              <MenubarRadioItem value="benoit">Benoit</MenubarRadioItem>
              <MenubarRadioItem value="Luis">Luis</MenubarRadioItem>
            </MenubarRadioGroup>
            <MenubarSeparator />
            <MenubarItem inset>Edit...</MenubarItem>
            <MenubarSeparator />
            <MenubarItem inset>Add Profile...</MenubarItem> */}
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
    )
  }
  


  return (
    <MenubarDemo/>

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
