import { useStore } from "@/lib/states";

import { useTranslation } from "react-i18next";
import { IconButton } from "@/components/ui/button";
import { useRefContext } from "@/components/RefCanvas";

import { Button, ImageUploadButton } from "../ui/button";
import { useImage } from "@/hooks/useImage";

import { RowContainer, LabelTitle } from "./LabelTitle";
import { Upload } from "lucide-react";
import {
  DoubleArrowDownIcon,
  DoubleArrowUpIcon,
  ArrowDownIcon,
  ArrowUpIcon,
} from "@radix-ui/react-icons";

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

const CanvasOptions = () => {
  const [paintByExampleFile, isProcessing, runInpainting, updateAppState] =
    useStore((state) => [
      state.serverConfig.samplers,
      state.settings,
      state.paintByExampleFile,
      state.getIsProcessing(),
      state.updateSettings,
      state.runInpainting,
      state.updateAppState,
    ]);
  const [exampleImage, isExampleImageLoaded] = useImage(paintByExampleFile);
  const { t } = useTranslation();

  const { fabricRef } = useRefContext();

  const newFileUpload = () => {
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
          EJECUTAR ACCION
        </Button>
      </div>
    );
  };

  const handleLayoutControl = (
    mode: "toFront" | "toBack" | "toForward" | "toBackward",
  ) => {
    const fabricInstance = fabricRef.current;
    if (fabricInstance) {
      const activeObject = fabricInstance?.getActiveObject();
      if (!activeObject) return;

      switch (mode) {
        case "toFront":
          fabricInstance.bringObjectToFront(activeObject);
          break;
        case "toBack":
          fabricInstance.sendObjectToBack(activeObject);
          break;
        case "toForward":
          fabricInstance.bringObjectForward(activeObject);
          break;
        case "toBackward":
          fabricInstance.sendObjectBackwards(activeObject);
      }
      fabricInstance.discardActiveObject();
      fabricInstance.renderAll();
    }
  };
  const renderLayerControl = () => {
    const layerControlConfig = [
      {
        label: "toForward",
        icon: <ArrowUpIcon className="h-4 w-4" />,
        tooltip: "Forward",
      },
      {
        label: "toFront",
        icon: <DoubleArrowUpIcon className="h-4 w-4" />,
        tooltip: "To front",
      },
      {
        label: "toBackward",
        icon: <ArrowDownIcon className="h-4 w-4" />,
        tooltip: "Backward",
      },
      {
        label: "toBack",
        icon: <DoubleArrowDownIcon className="h-4 w-4" />,
        tooltip: "To back",
      },
    ];

    return (
      <RowContainer>
        {layerControlConfig.map(({ label, icon, tooltip }) => (
          <IconButton
            key={label}
            tooltip={tooltip}
            onClick={() =>
              handleLayoutControl(
                label as "toFront" | "toBack" | "toForward" | "toBackward",
              )
            }
          >
            {icon}
          </IconButton>
        ))}
      </RowContainer>
    );
  };

  return (
    <div className="flex flex-col gap-4 mt-4">
      {renderLayerControl()}
      {/* {newFileUpload()} */}
    </div>
  );
};

export default CanvasOptions;
