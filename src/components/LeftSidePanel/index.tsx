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
import {
MutableRefObject
} from "react";

// import LDMOptions from "./LDMOptions";
// import DiffusionOptions from "./DiffusionOptions";
// import CV2Options from "./CV2Options";


type Props = {
  fabricRef: MutableRefObject<fabric.Canvas | null>
}

const LeftSidePanel = ({ fabricRef }: Props) => {
  
  const [settings, windowSize] = useStore((state) => [
    state.settings,
    state.windowSize,
  ]);

  const [open, toggleOpen] = useToggle(true);

  useHotKey("c", () => {
    toggleOpen();
  });

  return (
    <Sheet open={open} modal={false}>
      <SheetTrigger
        tabIndex={-1}
        className="z-10 outline-none absolute top-[68px] left-6 rounded-lg border bg-background"
        hidden={open}
      >
        <Button
          variant="ghost"
          size="icon"
          asChild
          className="p-1.5"
          onClick={toggleOpen}
        >
          <ChevronRight strokeWidth={1} />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-[300px] mt-[60px] outline-none pl-4 pr-1"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
      >
        <SheetHeader>
          <RowContainer>
            <div className="overflow-hidden mr-8">
              {
                "OPTIONS"
              }
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="border h-6 w-6"
              onClick={toggleOpen}
            >
              <ChevronLeft strokeWidth={1} />
            </Button>
          </RowContainer>
          <Separator />
        </SheetHeader>
        <ScrollArea
          style={{ height: windowSize.height - 160 }}
          className="pr-3"
        >
        <CanvasOptions fabricRef={fabricRef} />
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default LeftSidePanel;
