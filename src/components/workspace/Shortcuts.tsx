import { Keyboard } from "lucide-react";
import { IconButton } from "@/components/ui/button";
import { useToggle } from "@uidotdev/usehooks";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import useHotKey from "@/hooks/useHotkey";
import { useTranslation } from "react-i18next";

interface ShortcutProps {
  content: string;
  keys: string[];
}

function ShortCut(props: ShortcutProps) {
  const { content, keys } = props;

  return (
    <div className="flex justify-between">
      <div>{content}</div>
      <div className="flex gap-[8px]">
        {keys.map((k) => (
          // TODO: 优化快捷键显示
          <div className="border px-2 py-1 rounded-lg" key={k}>
            {k}
          </div>
        ))}
      </div>
    </div>
  );
}

const isMac = function () {
  return /macintosh|mac os x/i.test(navigator.userAgent);
};

const CmdOrCtrl = () => {
  return isMac() ? "Cmd" : "Ctrl";
};

export function Shortcuts() {
  const [open, toggleOpen] = useToggle(false);
  const { t } = useTranslation();

  useHotKey("h", () => {
    toggleOpen();
  });

  return (
    <Dialog open={open} onOpenChange={toggleOpen}>
      <DialogTrigger asChild>
        <IconButton tooltip="Hotkeys">
          <Keyboard />
        </IconButton>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Hotkeys</DialogTitle>
          <div className="flex gap-2 flex-col pt-4">
            <ShortCut content={t("Pan")} keys={["Space + Drag"]} />
            <ShortCut content={t("Reset Zoom/Pan")} keys={["Esc"]} />
            <ShortCut content={t("Decrease Brush Size")} keys={["["]} />
            <ShortCut content={t("Increase Brush Size")} keys={["]"]} />
            <ShortCut content={t("View Original Image")} keys={["Hold Tab"]} />

            <ShortCut content={t("Undo")} keys={[CmdOrCtrl(), "Z"]} />
            <ShortCut content={t("Redo")} keys={[CmdOrCtrl(), "Shift", "Z"]} />
            <ShortCut content={t("Copy Result")} keys={[CmdOrCtrl(), "C"]} />
            <ShortCut content={t("Paste Image")} keys={[CmdOrCtrl(), "V"]} />
            <ShortCut
              content={t("Trigger Manually Inpainting")}
              keys={["Shift", "R"]}
            />
            <ShortCut content={t("Toggle Hotkeys Dialog")} keys={["H"]} />
            <ShortCut content={t("Toggle Settings Dialog")} keys={["S"]} />
            <ShortCut content={t("Toggle File Manager")} keys={["F"]} />
          </div>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}

export default Shortcuts;
