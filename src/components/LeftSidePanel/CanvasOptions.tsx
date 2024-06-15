import { FormEvent, useRef, MutableRefObject } from "react";
import { useStore } from "@/lib/states";
import { Switch } from "../ui/switch";
import { NumberInput } from "../ui/input";
import { useTranslation } from "react-i18next";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Textarea } from "../ui/textarea";
import { ExtenderDirection, PowerPaintTask } from "@/lib/types";
import { Separator } from "../ui/separator";
import { Button, ImageUploadButton } from "../ui/button";
import { Slider } from "../ui/slider";
import { useImage } from "@/hooks/useImage";
import {
  ANYTEXT,
  INSTRUCT_PIX2PIX,
  PAINT_BY_EXAMPLE,
  POWERPAINT,
} from "@/lib/const";
import { RowContainer, LabelTitle } from "./LabelTitle";
import { Upload } from "lucide-react";
import { useClickAway } from "react-use";

const ExtenderButton = ({
  text,
  onClick,
}: {
  text: string;
  onClick: () => void;
}) => {
  const [showExtender] = useStore((state) => [state.settings.showExtender]);
  return (
    <Button
      variant="outline"
      className="p-1 h-8"
      disabled={!showExtender}
      onClick={onClick}
    >
      <div className="flex items-center gap-1">{text}</div>
    </Button>
  );
};

type Props = {
    fabricRef: MutableRefObject<fabric.Canvas | null>
  }

const CanvasOptions = ({ fabricRef }: Props) => {
  const [
    samplers,
    settings,
    paintByExampleFile,
    isProcessing,
    updateSettings,
    runInpainting,
    updateAppState,
    updateExtenderByBuiltIn,
    updateExtenderDirection,
    adjustMask,
    clearMask,
  ] = useStore((state) => [
    state.serverConfig.samplers,
    state.settings,
    state.paintByExampleFile,
    state.getIsProcessing(),
    state.updateSettings,
    state.runInpainting,
    state.updateAppState,
    state.updateExtenderByBuiltIn,
    state.updateExtenderDirection,
    state.adjustMask,
    state.clearMask,
  ]);
  const [exampleImage, isExampleImageLoaded] = useImage(paintByExampleFile);
  const { t } = useTranslation();
  
  const handleToggleDrawingMode = (value: boolean) => {
    console.log(value)
    const fabricInstance = fabricRef.current
    if (fabricInstance) {
        console.log("here")
      fabricInstance.isDrawingMode = value
    }
  };

  const drawingMode = () => {
    return (
      <RowContainer>
        <LabelTitle
          text={t("Broche")}
          toolTip="Activa la brocha para dibujar mask en la imagen."
        />
        <Switch
          id="cropper"
          checked={settings.showDrawing}
          onCheckedChange={(value) => {
            updateSettings({ showDrawing: value });
            handleToggleDrawingMode(value);
            if (value) {
              updateSettings({ showSelectable: false });
            }
          }
        }
        />
      </RowContainer>
    );
  };

  const renderPaintByExample = () => {
    if (settings.model.name !== PAINT_BY_EXAMPLE) {
      return null;
    }




    return (
      <div>
        <RowContainer>
          <LabelTitle
            text="Example Image"
            toolTip="An example image to guide image generation."
          />
          <ImageUploadButton
            tooltip="Upload example image"
            onFileUpload={(file) => {
              updateAppState({ paintByExampleFile: file });
            }}
          >
            <Upload />
          </ImageUploadButton>
        </RowContainer>
        {isExampleImageLoaded ? (
          <div className="flex justify-center items-center">
            <img
              src={exampleImage.src}
              alt="example"
              className="max-w-[200px] max-h-[200px] m-3"
            />
          </div>
        ) : (
          <></>
        )}
        <Button
          variant="default"
          className="w-full"
          disabled={isProcessing || !isExampleImageLoaded}
          onClick={() => {
            runInpainting("Fantasy-Studio/Paint-by-Example");
          }}
        >
          Paint
        </Button>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4 mt-4">
        {drawingMode()}
      <Separator />
      {renderPaintByExample()}
    </div>
  );
};

export default CanvasOptions;
