import { useStore } from "@/lib/states";

import { useTranslation } from "react-i18next";
import { IconButton } from "@/components/ui/button";
import { useRefContext } from "@/components/RefCanvas";

import { RowContainer, LabelTitle } from "./LabelTitle";

import {
  DoubleArrowDownIcon,
  DoubleArrowUpIcon,
  ArrowDownIcon,
  ArrowUpIcon,
} from "@radix-ui/react-icons";

import {
  RectangleHorizontalIcon,
  RectangleVerticalIcon,
  SquareIcon,
} from "lucide-react";

const RatioOptions = () => {
  const [
    aspectRatio,
    paintByExampleFile,
    isProcessing,
    runInpainting,
    updateAppState,
  ] = useStore((state) => [
    state.aspectRatio,
    state.paintByExampleFile,
    state.getIsProcessing(),
    state.runInpainting,
    state.updateAppState,
  ]);

  const { t } = useTranslation();

  const { fabricRef } = useRefContext();

  const handleLayoutControl = (
    mode: "Horizontal" | "Vertical" | "Cuadrado",
  ) => {
    const fabricInstance = fabricRef.current;
    if (fabricInstance) {
      switch (mode) {
        case "Horizontal":
          updateAppState({ aspectRatio: "16:9" });
          break;
        case "Vertical":
          updateAppState({ aspectRatio: "9:16" });
          break;
        case "Cuadrado":
          updateAppState({ aspectRatio: "1:1" });
          break;
      }
      fabricRef.current?.requestRenderAll();
    }
  };

  const renderLayerControl = () => {
    const layerControlConfig = [
      {
        label: "Horizontal",
        icon: <RectangleHorizontalIcon className="h-4 w-4" />,
        tooltip: "Horizontal",
      },
      {
        label: "Vertical",
        icon: <RectangleVerticalIcon className="h-4 w-4" />,
        tooltip: "Vertical",
      },
      {
        label: "Cuadrado",
        icon: <SquareIcon className="h-4 w-4" />,
        tooltip: "Cuadrado",
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
                label as "Horizontal" | "Vertical" | "Cuadrado",
              )
            }
          >
            {icon}
          </IconButton>
        ))}
      </RowContainer>
    );
  };

  return <div className="flex flex-col gap-4 mt-4">{renderLayerControl()}</div>;
};

export default RatioOptions;
