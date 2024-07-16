import React, {
  SyntheticEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
  MutableRefObject,
} from "react";
import { predefinedRatios } from "@/lib/const";
import { CursorArrowRaysIcon } from "@heroicons/react/24/outline";
import { useToast } from "@/components/ui/use-toast";
import { useKeyPressEvent } from "react-use";
import { IconButton } from "@/components/ui/button";

import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarCheckboxItem,
  MenubarShortcut,
  MenubarTrigger,
} from "@/components/ui/menubar-horizontal";

import {
  askWritePermission,
  cn,
  copyCanvasImage,
  downloadImage,
  drawLines,
  generateMask,
  isMidClick,
  isRightClick,
  isLeftClick,
  mouseXY,
  srcToFile,
  debugLog,
} from "@/lib/utils";
import {
  Eraser,
  Eye,
  Redo,
  Undo,
  Copy,
  Scissors,
  Trash2,
  Expand,
  Download,
  Paintbrush,
} from "lucide-react";
import {
  DoubleArrowDownIcon,
  DoubleArrowUpIcon,
  ArrowDownIcon,
  ArrowUpIcon,
} from "@radix-ui/react-icons";
import { useImage } from "@/hooks/useImage";
import { Slider } from "./ui/slider";
import { useStore } from "@/lib/states";
import Cropper from "./Cropper";
import { InteractiveSegPoints } from "./InteractiveSeg";
import useHotKey from "@/hooks/useHotkey";
import Extender from "./Extender";
import {
  MAX_BRUSH_SIZE,
  MIN_BRUSH_SIZE,
  DEFAULT_BRUSH_SIZE,
  BRUSH_COLOR,
  LOG_LEVELS,
} from "@/lib/const";
import { Toggle } from "@/components/ui/toggle";
import * as fabric from "fabric"; // v6
import { FabricObject } from "fabric"; // migration path
import { FabricImage } from "fabric";

import {
  preload,
  removeBackground,
  removeForeground,
  segmentForeground,
  alphamask,
  applySegmentationMask,
} from "@imgly/background-removal";
import { useWindowSize } from "react-use";

import { loadImage } from "@/lib/utils";
import { useRefContext } from "./RefCanvas";

const COMPARE_SLIDER_DURATION_MS = 300;

const config = {
  debug: true,
  // rescale: false,
  rescale: true,
  device: "cpu",
  // device: 'cpu',
  // model: 'isnet',
  // model: 'isnet_fp16',
  // model: 'isnet_quint8',
  output: {
    quality: 0.8,
    format: "image/png",
    // format: 'image/jpeg'
    // format: 'image/webp'
    //format: 'image/x-rgba8'
    //format: 'image/x-alpha8'
  },
};

const Editor = React.forwardRef(() => {
  const { fabricRef, canvasRef } = useRefContext();
  const { toast } = useToast();

  const [
    disableShortCuts,
    isInpainting,
    imageWidth,
    scaledWidth,
    userWindowWidth,
    userWindowHeight,
    imageHeight,
    scaledHeight,
    aspectRatio,
    settings,
    enableAutoSaving,
    updateSettings,
    setImageSize,
    setBaseBrushSize,
    interactiveSegState,
    updateInteractiveSegState,
    handleCanvasMouseDown,
    handleSaveState,
    handleCanvasMouseMove,
    undo,
    redo,
    undoDisabled,
    redoDisabled,
    isProcessing,
    updateAppState,
    runMannually,
    runInpainting,
    isCropperExtenderResizing,
    decreaseBaseBrushSize,
    increaseBaseBrushSize,
  ] = useStore((state) => [
    state.disableShortCuts,
    state.isInpainting,
    state.imageWidth,
    state.scaledWidth,
    state.userWindowWidth,
    state.userWindowHeight,
    state.imageHeight,
    state.scaledHeight,
    state.aspectRatio,
    state.settings,
    state.serverConfig.enableAutoSaving,
    state.updateSettings,
    state.setImageSize,
    state.setBaseBrushSize,
    state.interactiveSegState,
    state.updateInteractiveSegState,
    state.handleCanvasMouseDown,
    state.handleSaveState,
    state.handleCanvasMouseMove,
    state.undo,
    state.redo,
    state.undoDisabled(),
    state.redoDisabled(),
    state.getIsProcessing(),
    state.updateAppState,
    state.runMannually(),
    state.runInpainting,
    state.isCropperExtenderResizing,
    state.decreaseBaseBrushSize,
    state.increaseBaseBrushSize,
  ]);
  const baseBrushSize = useStore((state) => state.editorState.baseBrushSize);
  const brushSize = useStore((state) => state.getBrushSize());
  const renders = useStore((state) => state.editorState.renders);
  const extraMasks = useStore((state) => state.editorState.extraMasks);
  const temporaryMasks = useStore((state) => state.editorState.temporaryMasks);
  const lineGroups = useStore((state) => state.editorState.lineGroups);
  const curLineGroup = useStore((state) => state.editorState.curLineGroup);
  const currCanvasGroups = useStore(
    (state) => state.editorState.currCanvasGroups,
  );

  // Local State
  const [showOriginal, setShowOriginal] = useState(false);
  const [original, isOriginalLoaded] = useImage(null);
  const [zoomLevel, setZoomLevel] = useState<number>(0.8); // Initial zoom level

  const [{ x, y }, setCoords] = useState({ x: -1, y: -1 });
  const [showBrush, setShowBrush] = useState(false);
  const [showRefBrush, setShowRefBrush] = useState(false);
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const isDragging = useRef(false);
  const lastPosX = useRef(0);
  const lastPosY = useRef(0);
  const windowSize = useWindowSize();

  const roundToNearest64 = (value: number) => Math.floor(value / 64) * 64;

  const [compatibleWidth, setCompatibleWidth] = useState<number>(
    roundToNearest64(windowSize.width),
  );
  const [compatibleHeight, setCompatibleHeight] = useState<number>(
    roundToNearest64(windowSize.height),
  );

  const [isDraging, setIsDraging] = useState(false);

  const [sliderPos, setSliderPos] = useState<number>(0);
  const [isChangingBrushSizeByWheel, setIsChangingBrushSizeByWheel] =
    useState<boolean>(false);

  const prevAspectRatio = useRef("nothing");

  // crop
  const lastActiveObject = useRef<fabric.Object | null>(null);
  const rectangleCut = useRef<fabric.Object | null>(null);
  const isCropping = useRef<boolean>(false);

  const hadDrawSomething = useCallback(() => {
    return currCanvasGroups.length !== 0;
  }, [currCanvasGroups]);

  const saveState = useCallback(() => {
    if (fabricRef.current) {
      const canva_instance = fabricRef.current;
      handleSaveState(canva_instance);
    }
  }, [fabricRef.current]);

  function animateImageOpacity(
    object: fabric.Object | null,
    duration: number = 1000,
    toOpacity: number = 0,
  ) {
    if (!object) return;
    fabric.util.animate({
      startValue: object.get("opacity") as number,
      endValue: toOpacity,
      duration: duration,
      onChange: (value: number) => {
        object.set("opacity", value);
        object.canvas?.renderAll();
      },
      onComplete: () => {
        const nextOpacity = toOpacity === 1 ? 0 : 1;
        animateImageOpacity(object, duration, nextOpacity); // Recursively call to continue animation
      },
    });
  }

  // FUNCTION TO CALL WHEN REMOVE BACKGROUND OF SPECIFIC IMAGE
  const rmBg = (
    eventData: fabric.TEvent<MouseEvent>,
    transform: { target: fabric.Object },
  ): void => {
    const single_instance: fabric.Canvas | null =
      transform.target.canvas ?? null;
    console.log(single_instance);
    const current_active: fabric.Object | null =
      single_instance?._activeObject ?? null;

    console.log(current_active);

    if (!current_active) return;

    animateImageOpacity(current_active, 1000); // Start the continuous animation
    const objectWidth =
      (current_active.width ?? 0) * (current_active.scaleX ?? 0);
    const objectHeight =
      (current_active.height ?? 0) * (current_active.scaleY ?? 0);
    const objectCenterTop = current_active.top ?? 0;
    const objectCenterLeft = current_active.left ?? 0;

    let CvRef: HTMLCanvasElement | null = null;
    // Create a temporary canvas
    var tempCanvas = new fabric.Canvas(CvRef, {
      width: objectWidth,
      height: objectHeight,
    });
    // Clone the active object to the temporary canvas
    current_active.clone((clonedObject: fabric.Object) => {
      clonedObject.set({
        left: objectWidth / 2,
        top: objectHeight / 2,
        scaleX: current_active.scaleX,
        scaleY: current_active.scaleY,
        originX: "center",
        originY: "center",
      });

      tempCanvas.add(clonedObject);
      tempCanvas.renderAll();

      // Get the data URL of the cloned object
      const objectDataUrl = tempCanvas.toDataURL({ format: "png" });

      removeBackground(objectDataUrl, config).then((blob: Blob) => {
        // The result is a blob encoded as PNG. It can be converted to an URL to be used as HTMLImage.src
        const url = URL.createObjectURL(blob);
        const newRender = new Image();
        loadImage(newRender, url).then(() => {
          console.log(newRender);
          single_instance?.remove(transform.target);
          const img_without_background = new FabricImage(newRender, {
            left: objectCenterLeft,
            top: objectCenterTop,
            originX: "center",
            originY: "center",
          });
          single_instance?.add(img_without_background);
          single_instance?.requestRenderAll();
        });
      });
    });
  };

  const cropImage = () => {
    if (
      !fabricRef.current ||
      !lastActiveObject.current ||
      !rectangleCut.current
    )
      return;

    const canvas = fabricRef.current;
    const objectToCrop = lastActiveObject.current;
    const rectCrop = rectangleCut.current;

    // Calculate the bounding box of the object and the crop rectangle
    const objectBoundingBox = objectToCrop.getBoundingRect(true, true);
    const cropBoundingBox = rectCrop.getBoundingRect(true, true);

    // Calculate the crop area's position relative to the object's bounding box
    const scaleX = objectToCrop.scaleX || 1;
    const scaleY = objectToCrop.scaleY || 1;
    const angle = fabric.util.degreesToRadians(objectToCrop.angle || 0);

    // Calculate the top-left corner of the crop area relative to the object's origin
    const cropLeftRelativeToObject =
      (cropBoundingBox.left - objectBoundingBox.left) / scaleX;
    const cropTopRelativeToObject =
      (cropBoundingBox.top - objectBoundingBox.top) / scaleY;
    const cropWidthRelativeToObject = cropBoundingBox.width / scaleX;
    const cropHeightRelativeToObject = cropBoundingBox.height / scaleY;

    // Create an off-screen canvas to draw the cropped image
    const offScreenCanvas = document.createElement("canvas");
    offScreenCanvas.width = cropBoundingBox.width;
    offScreenCanvas.height = cropBoundingBox.height;

    const ctx = offScreenCanvas.getContext("2d");
    if (!ctx) return;

    // Adjust for rotation
    ctx.translate(offScreenCanvas.width / 2, offScreenCanvas.height / 2);
    ctx.rotate(-angle);
    ctx.translate(-offScreenCanvas.width / 2, -offScreenCanvas.height / 2);

    // Draw the image onto the off-screen canvas
    ctx.drawImage(
      objectToCrop.getElement(),
      cropLeftRelativeToObject,
      cropTopRelativeToObject,
      cropWidthRelativeToObject,
      cropHeightRelativeToObject,
      0,
      0,
      cropBoundingBox.width,
      cropBoundingBox.height,
    );

    // Create a new fabric image from the cropped canvas
    const croppedDataUrl = offScreenCanvas.toDataURL();
    FabricImage.fromURL(croppedDataUrl).then((croppedImage) => {
      croppedImage.set({
        left: rectCrop.left,
        top: rectCrop.top,
        originX: "center",
        originY: "center",
      });

      // Remove the original object and rectangle from the canvas
      canvas.remove(objectToCrop);
      canvas.remove(rectCrop);

      // Add the new cropped image to the canvas
      canvas.add(croppedImage);
      canvas.setActiveObject(croppedImage);
      canvas.renderAll();
    });

    // Reset the crop state
    isCropping.current = false;
  };

  const [buttonPosition, setButtonPosition] = useState({ left: 0, top: 0 });
  const [buttonVisible, setButtonVisible] = useState(false);

  useEffect(() => {
    const initMainCanvas = (): fabric.Canvas => {
      updateAppState({
        userWindowWidth: compatibleWidth,
        userWindowHeight: compatibleHeight,
      });

      return new fabric.Canvas(canvasRef.current, {
        width: compatibleWidth,
        height: compatibleHeight,
        backgroundColor: "#f0f0f0",
        imageSmoothingEnabled: false,
        fireMiddleClick: true,
        stopContextMenu: true, // 禁止默认右键菜单
        enableRetinaScaling: false,
        controlsAboveOverlay: false,
        preserveObjectStacking: true,
      });
    };

    fabric.FabricObject.ownDefaults.noScaleCache = true;
    fabric.FabricObject.ownDefaults.originX = "center";
    fabric.FabricObject.ownDefaults.originY = "center";

    (fabricRef as MutableRefObject<fabric.Canvas | null>).current =
      initMainCanvas();

    // Extend fabric.Object to include custom properties in serialization
    const originalToObject = fabric.FabricObject.prototype.toObject;
    const myAdditional = ["img_view"];
    fabric.FabricObject.prototype.toObject = function (
      additionalProperties = [],
    ) {
      return originalToObject.call(this, [
        ...myAdditional,
        ...additionalProperties,
      ]);
    };

    fabric.Canvas.prototype.getAbsoluteCoords = function (object) {
      return {
        left: object.left,
        top: object.top,
      };
    };

    function positionBtn(obj) {
      const btnContainer = document.getElementById("button-container");
      if (!btnContainer) return;
      const zoom = fabricRef.current.getZoom();
      const viewportTransform = fabricRef.current.viewportTransform;
      const absCoords = fabricRef.current.getAbsoluteCoords(obj);
      const left =
        (absCoords.left + (obj.width * obj.scaleX) / 2) * zoom +
        viewportTransform[4] -
        150;
      const top =
        (absCoords.top - (obj.height * obj.scaleY) / 2) * zoom +
        viewportTransform[5];
      setButtonPosition({ left, top });
      setButtonVisible(true);
    }

    // Activate drawing mode for mask overlay
    if (fabricRef.current) {
      const brush = new fabric.PencilBrush(fabricRef.current);
      brush.color = BRUSH_COLOR;
      brush.width = DEFAULT_BRUSH_SIZE;
      fabricRef.current.isDrawingMode = settings.showDrawing;
      fabricRef.current.freeDrawingBrush = brush;
      fabricRef.current?.zoomToPoint(
        { x: fabricRef.current?.width / 2, y: fabricRef.current?.height / 2 },
        zoomLevel,
      );
      setZoomLevel(fabricRef.current.getZoom());
    }

    // modify around image contour
    fabric.FabricObject.ownDefaults.transparentCorners = false;
    fabric.FabricObject.ownDefaults.borderColor = "#51B9F9";
    fabric.FabricObject.ownDefaults.cornerColor = "yellow";
    fabric.FabricObject.ownDefaults.borderScaleFactor = 2.5;
    fabric.FabricObject.ownDefaults.cornerStyle = "rect";
    fabric.FabricObject.ownDefaults.cornerStrokeColor = "#0E98FC";
    fabric.FabricObject.ownDefaults.borderOpacityWhenMoving = 1;

    // Event listener for panning
    fabricRef.current?.on("mouse:up", stopPanning);

    fabricRef.current?.on("mouse:down", startPanning);

    fabricRef.current?.on("mouse:move", panCanvas);

    fabricRef.current?.on("selection:updated", function (e) {
      positionBtn(e.selected[0]);
    });

    fabricRef.current?.on("selection:created", function (e) {
      positionBtn(e.selected[0]);
    });

    fabricRef.current?.on("object:moving", function (e) {
      setButtonVisible(false);
    });

    fabricRef.current?.on("selection:cleared", function () {
      setButtonVisible(false);
    });

    fabricRef.current?.on("path:created", () => {
      saveState();
    });

    fabricRef.current?.on("object:modified", () => {
      saveState();
    });

    fabricRef.current?.on("mouse:wheel", function (opt) {
      const delta = opt.e.deltaY;
      let zoom = fabricRef.current?.getZoom();
      zoom *= 0.999 ** delta;
      if (zoom > 20) zoom = 20;
      if (zoom < 0.01) zoom = 0.01;
      fabricRef.current?.zoomToPoint(
        { x: opt.e.offsetX, y: opt.e.offsetY },
        zoom,
      );

      setButtonVisible(false);
      opt.e.preventDefault();
      opt.e.stopPropagation();
    });

    // #### DISPOSE
    return () => {
      fabricRef.current?.dispose();
    };
  }, []);

  useEffect(() => {
    // Attach the event listener
    fabricRef.current.on("after:render", afterRenderCallback);

    return () => {
      if (fabricRef.current) {
        fabricRef.current.off("after:render", afterRenderCallback);
      }
    };
  }, [aspectRatio]);

  const afterRenderCallback = useCallback(
    (e) => {
      const canvas_instance = fabricRef.current;
      const { ctx } = e;
      const fillStyle = "rgba(0, 0, 0, 0.3)";
      const width = canvas_instance?.width ?? 0;
      const height = canvas_instance?.height ?? 0;

      if (ctx) {
        ctx.save();
        // Clear only the specific area where the dark overlay was applied
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(width, 0);
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.lineTo(0, 0);
        // Apply the viewport transformation
        ctx.transform.apply(ctx, Array.from(canvas_instance.viewportTransform));

        // Adjust clipping area based on the aspect ratio
        let clipWidth, clipHeight;

        const ratioObject = predefinedRatios.find(
          (ratio) => ratio.name === aspectRatio,
        );

        if (ratioObject) {
          debugLog(LOG_LEVELS.DEBUG, "choosed Ratio\n", ratioObject);
          const { width: ratioWidth, height: ratioHeight } = ratioObject;
          clipWidth = ratioWidth;
          clipHeight = ratioHeight;
        }

        const clipX = Math.floor((width - clipWidth) / 2);
        const clipY = Math.floor((height - clipHeight) / 2);

        debugLog(LOG_LEVELS.DEBUG, " <<user canvas window>>  width, heigth ", [
          canvas_instance.width,
          canvas_instance.height,
        ]);
        debugLog(LOG_LEVELS.DEBUG, "<<user choosedWidth, choosedHeigth>> ", [
          clipWidth,
          clipHeight,
        ]);
        debugLog(
          LOG_LEVELS.DEBUG,
          "<<user transf canvas  matrix>>\n",
          canvas_instance.viewportTransform,
        );

        updateAppState({ scaledWidth: clipWidth, scaledHeight: clipHeight });
        setImageSize(clipWidth, clipHeight)

        ctx.moveTo(clipX, clipY);
        ctx.lineTo(clipX, clipY + clipHeight);
        ctx.lineTo(clipX + clipWidth, clipY + clipHeight);
        ctx.lineTo(clipX + clipWidth, clipY);
        ctx.closePath();
        ctx.fillStyle = fillStyle;
        ctx.fill();
        ctx.restore();
      }
    },
    [aspectRatio],
  );

  const stopPanning = useCallback((opt: fabric.TEvent<MouseEvent>) => {
    if (isMidClick(opt)) {
      isDragging.current = false;
    }
  }, []);

  const startPanning = useCallback((opt: fabric.TEvent<MouseEvent>) => {
    if (isMidClick(opt)) {
      const evt = opt.e;
      isDragging.current = true;
      lastPosX.current = evt.clientX;
      lastPosY.current = evt.clientY;
    }
  }, []);

  const panCanvas = useCallback(
    (opt: fabric.TEvent<MouseEvent>) => {
      if (isDragging.current) {
        if (!fabricRef.current) return;
        const e = opt.e;
        const vpt = fabricRef.current.viewportTransform;
        vpt[4] += e.clientX - lastPosX.current;
        vpt[5] += e.clientY - lastPosY.current;
        fabricRef.current.requestRenderAll();
        lastPosX.current = e.clientX;
        lastPosY.current = e.clientY;
      }
    },
    [fabricRef.current],
  );

  // COMING RENDERS FROM BACKEND
  useEffect(() => {
    const render = renders[renders.length - 1];

    if (!fabricRef.current || !render) return;

    debugLog(LOG_LEVELS.DEBUG, "renddeers", render);

    const scaledImage = new FabricImage(render, {
      scaleX: 1,
      scaleY: 1,
      originX: "center",
      originY: "center",
    });

    const canvasWidth = fabricRef.current.width ?? 0;
    const canvasHeight = fabricRef.current.height ?? 0;

    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;

    scaledImage.set({
      left: centerX,
      top: centerY,
    });
    // Clear the canvas
    // fabricRef.current.clear();
    fabricRef.current.add(scaledImage);
    fabricRef.current.renderAll();

    handleSaveState(fabricRef.current);
  }, [renders]);

  // REDO / UNDO ACTION
  // useEffect(() => {
  //   if (!fabricRef.current) return;
  //   if (currCanvasGroups.length === 0) return;
  //   const lastElement = currCanvasGroups[currCanvasGroups.length - 1];
  //   const state = JSON.parse(lastElement.data);
  //   fabricRef.current.loadFromJSON(
  //     state,
  //     fabricRef.current.renderAll.bind(fabricRef.current),
  //   );
  // }, [currCanvasGroups]);

  // CHANGE BRUSH SIZE
  useEffect(() => {
    if (!fabricRef.current) return;
    const brush = new fabric.PencilBrush(fabricRef.current);
    brush.color = BRUSH_COLOR;
    brush.width = baseBrushSize;
    fabricRef.current.freeDrawingBrush = brush;
  }, [baseBrushSize]);

  // const getCurrentRender = useCallback(async () => {
  //   let targetFile = file;
  //   if (renders.length > 0) {
  //     const lastRender = renders[renders.length - 1];
  //     targetFile = await srcToFile(
  //       lastRender.currentSrc,
  //       file.name,
  //       file.type,
  //     );
  //   }
  //   return targetFile;
  // }, [file, renders]);

  const hadRunInpainting = () => {
    return renders.length !== 0;
  };

  // const getCurrentWidthHeight = useCallback(() => {
  //   let width = 512;
  //   let height = 512;
  //   if (!isOriginalLoaded) {
  //     return [width, height];
  //   }
  //   if (renders.length === 0) {
  //     width = original.naturalWidth;
  //     height = original.naturalHeight;
  //   } else if (renders.length !== 0) {
  //     width = renders[renders.length - 1].width;
  //     height = renders[renders.length - 1].height;
  //   }

  //   return [width, height];
  // }, [original, isOriginalLoaded, renders]);

  // useEffect(() => {
  //   console.log("[useEffect] centerView");
  //   // render 改变尺寸以后，undo/redo 重新 center
  //   viewportRef?.current?.centerView(minScale, 1);
  // }, [imageHeight, imageWidth, viewportRef, minScale]);

  // Zoom reset
  const resetZoom = useCallback(() => {
    if (fabricRef.current) {
      fabricRef.current.zoomToPoint(
        { x: fabricRef.current.width / 2, y: fabricRef.current.height / 2 },
        zoomLevel,
      );
      fabricRef.current.setViewportTransform([1, 0, 0, 1, 0, 0]); // Reset panning
      fabricRef.current.requestRenderAll();
    }
  }, []);

  // useEffect(() => {
  //   window.addEventListener("resize", () => {
  //     resetZoom();
  //   });
  //   return () => {
  //     window.removeEventListener("resize", () => {
  //       resetZoom();
  //     });
  //   };
  // }, [windowSize, resetZoom]);

  const handleEscPressed = () => {
    if (isProcessing) {
      return;
    }

    if (isDraging) {
      setIsDraging(false);
    } else {
      resetZoom();
    }
  };

  useHotKey("Escape", handleEscPressed, [
    isDraging,
    isInpainting,
    resetZoom,
    // drawOnCurrentRender,
  ]);

  const onMouseMove = (ev: SyntheticEvent) => {
    const mouseEvent = ev.nativeEvent as MouseEvent;
    setCoords({ x: mouseEvent.pageX, y: mouseEvent.pageY });
  };

  const onMouseDrag = (ev: SyntheticEvent) => {
    if (isProcessing) {
      return;
    }

    if (interactiveSegState.isInteractiveSeg) {
      return;
    }
    if (isPanning) {
      return;
    }
    if (!isDraging) {
      return;
    }
    if (curLineGroup.length === 0) {
      return;
    }

    handleCanvasMouseMove(mouseXY(ev));
  };

  const handleUndo = () => {
    undo();
  };

  // const handleUndo = (keyboardEvent: KeyboardEvent | SyntheticEvent) => {
  //   keyboardEvent.preventDefault();
  //   undo();
  // };
  useHotKey("meta+z,ctrl+z", handleUndo);

  const handleRedo = (keyboardEvent: KeyboardEvent | SyntheticEvent) => {
    keyboardEvent.preventDefault();
    redo();
  };
  useHotKey("shift+ctrl+z,shift+meta+z", handleRedo);

  useKeyPressEvent(
    "Tab",
    (ev) => {
      ev?.preventDefault();
      ev?.stopPropagation();
      if (hadRunInpainting()) {
        setShowOriginal(() => {
          window.setTimeout(() => {
            setSliderPos(100);
          }, 10);
          return true;
        });
      }
    },
    (ev) => {
      ev?.preventDefault();
      ev?.stopPropagation();
      if (hadRunInpainting()) {
        window.setTimeout(() => {
          setSliderPos(0);
        }, 10);
        window.setTimeout(() => {
          setShowOriginal(false);
        }, COMPARE_SLIDER_DURATION_MS);
      }
    },
  );

  useHotKey(
    "[",
    () => {
      decreaseBaseBrushSize();
    },
    [decreaseBaseBrushSize],
  );

  useHotKey(
    "]",
    () => {
      increaseBaseBrushSize();
    },
    [increaseBaseBrushSize],
  );

  // Manual Inpainting Hotkey
  // useHotKey(
  //   "shift+r",
  //   () => {
  //     if (runMannually && hadDrawSomething()) {
  //       runInpainting();
  //     }
  //   },
  //   [runMannually, runInpainting, hadDrawSomething],
  // );

  // useHotKey(
  //   "ctrl+c,meta+c",
  //   async () => {
  //     const hasPermission = await askWritePermission();
  //     if (hasPermission && renders.length > 0) {
  //       if (context?.canvas) {
  //         await copyCanvasImage(context?.canvas);
  //         toast({
  //           title: "Copy inpainting result to clipboard",
  //         });
  //       }
  //     }
  //   },
  //   [renders, context],
  // );

  // Toggle clean/zoom tool on spacebar.
  useKeyPressEvent(
    " ",
    (ev) => {
      if (!disableShortCuts) {
        ev?.preventDefault();
        ev?.stopPropagation();
        setShowBrush(false);
        setIsPanning(true);
      }
    },
    (ev) => {
      if (!disableShortCuts) {
        ev?.preventDefault();
        ev?.stopPropagation();
        setShowBrush(true);
        setIsPanning(false);
      }
    },
  );

  useKeyPressEvent(
    "Alt",
    (ev) => {
      if (!disableShortCuts) {
        ev?.preventDefault();
        ev?.stopPropagation();
        setIsChangingBrushSizeByWheel(true);
      }
    },
    (ev) => {
      if (!disableShortCuts) {
        ev?.preventDefault();
        ev?.stopPropagation();
        setIsChangingBrushSizeByWheel(false);
      }
    },
  );

  const handleSliderChange = (value: number) => {
    setBaseBrushSize(value);

    if (!showRefBrush) {
      setShowRefBrush(true);
      window.setTimeout(() => {
        setShowRefBrush(false);
      }, 10000);
    }
  };

  const renderInteractiveSegCursor = () => {
    return (
      <div
        className="absolute h-[20px] w-[20px] pointer-events-none rounded-[50%] bg-[rgba(21,_215,_121,_0.936)] [box-shadow:0_0_0_0_rgba(21,_215,_121,_0.936)] animate-pulse"
        style={{
          left: `${x}px`,
          top: `${y}px`,
          transform: "translate(-50%, -50%)",
        }}
      >
        <CursorArrowRaysIcon />
      </div>
    );
  };

  const renderCanvas = () => {
    return (
      <div className="relative top-[60px]">
        <canvas
          className={cn(
            isProcessing
              ? "pointer-events-none animate-pulse duration-600"
              : "",
          )}
          ref={canvasRef}
          style={{
            clipPath: `inset(0 ${sliderPos}% 0 0)`,
            transition: `clip-path ${COMPARE_SLIDER_DURATION_MS}ms`,
          }}
        />
        <div
          className="pointer-events-none absolute top-0"
          style={{
            width: `${imageWidth}px`,
            height: `${imageHeight}px`,
          }}
        >
          {showOriginal && (
            <>
              <div
                className="absolute top-0 z-10 bg-primary h-full w-[6px] justify-self-end"
                style={{
                  marginRight: `${sliderPos}%`,
                  transition: `margin-right ${COMPARE_SLIDER_DURATION_MS}ms`,
                }}
              />
              <img
                className="absolute "
                src={original.src}
                alt="original"
                style={{
                  width: `${imageWidth}px`,
                  height: `${imageHeight}px`,
                }}
              />
            </>
          )}
        </div>
      </div>

      // <Cropper
      //   maxHeight={imageHeight}
      //   maxWidth={imageWidth}
      //   minHeight={Math.min(512, imageHeight)}
      //   minWidth={Math.min(512, imageWidth)}
      //   scale={getCurScale()}
      //   show={settings.showCropper}
      // />

      // <Extender
      //   minHeight={Math.min(512, imageHeight)}
      //   minWidth={Math.min(512, imageWidth)}
      //   scale={getCurScale()}
      //   show={settings.showExtender}
      // />
    );
  };

  // const handleScroll = (event: React.WheelEvent<HTMLDivElement>) => {
  //   // deltaY 是垂直滚动增量，正值表示向下滚动，负值表示向上滚动
  //   // deltaX 是水平滚动增量，正值表示向右滚动，负值表示向左滚动
  //   if (!isChangingBrushSizeByWheel) {
  //     return;
  //   }

  //   const { deltaY } = event;
  //   // console.log(`水平滚动增量: ${deltaX}, 垂直滚动增量: ${deltaY}`)
  //   if (deltaY > 0) {
  //     increaseBaseBrushSize();
  //   } else if (deltaY < 0) {
  //     decreaseBaseBrushSize();
  //   }
  // };

  const handleDownload = async (source: string) => {
    const predefinedRatio = predefinedRatios.find(
      (ratio) => ratio.name === aspectRatio,
    );
    if (!predefinedRatio) {
      console.error("Invalid aspect ratio");
      return;
    }

    const { width: outputWidth, height: outputHeight } = predefinedRatio;

    const clipX = (compatibleWidth - scaledWidth) / 2;
    const clipY = (compatibleHeight - scaledHeight) / 2;

    const tempCanvas = new fabric.Canvas(null, {
      width: outputWidth,
      height: outputHeight,
    });

    const scaleX = outputWidth / scaledWidth;
    const scaleY = outputHeight / scaledHeight;

    const allObjects = fabricRef.current.getObjects();

    for (const single_obj of allObjects) {
      const clone = await single_obj.clone();
      clone.set({
        left: (clone.left - clipX) * scaleX,
        top: (clone.top - clipY) * scaleY,
        scaleX: clone.scaleX * scaleX,
        scaleY: clone.scaleY * scaleY,
      });
      if (single_obj.type === source) tempCanvas.add(clone);
    }

    tempCanvas.renderAll();

    const dataURL = tempCanvas.toDataURL({
      format: "png",
      quality: 1,
      multiplier: 1,
    });

    const link = document.createElement("a");
    link.href = dataURL;
    link.download = `${source}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useHotKey("meta+s,ctrl+s", handleDownload);

  const handleDrawingMode = (value: boolean) => {
    const fabricInstance = fabricRef.current;
    if (fabricInstance) {
      fabricInstance.isDrawingMode = value;
    }
  };

  const handleCopy = () => {
    const canvas_instance = fabricRef.current;
    if (!canvas_instance) return;
    const target = canvas_instance.getActiveObject();
    if (target) {
      target.clone().then((cloned: FabricObject) => {
        cloned.left += 100;
        cloned.top += 100;
        canvas_instance.add(cloned);
      });
    }
  };

  const handleCut = () => {
    const canvas_instance = fabricRef.current;
    if (!canvas_instance) return;

    if (isCropping.current) {
      isCropping.current = false;
      console.log("crop img");
      return cropImage();
    }

    isCropping.current = true;
    const target = canvas_instance.getActiveObject(); // object
    if (target) {
      const canvas = target.canvas;

      const activeObject = canvas?.getActiveObject();
      if (!activeObject || !canvas) return;

      // Calculate the maximum width and height for the crop rectangle
      const maxWidth = activeObject.width * activeObject.scaleX;
      const maxHeight = activeObject.height * activeObject.scaleY;

      // Calculate initial dimensions of the crop rectangle
      let width = maxWidth * 0.5;
      let height = maxHeight * 0.5;

      const rectangle = new fabric.Rect({
        fill: "rgba(0,0,0,0.3)",
        originX: "center",
        originY: "center",
        stroke: "black",
        opacity: 1,
        width: width,
        height: height,
        left: activeObject.left,
        top: activeObject.top,
        hasRotatingPoint: false,
        transparentCorners: false,
        cornerColor: "white",
        cornerStrokeColor: "black",
        borderColor: "black",
        lockMovementX: true,
        lockMovementY: true,
      });

      // Save selected image and rectangle
      lastActiveObject.current = activeObject;
      rectangleCut.current = rectangle;

      canvas.add(rectangle);
      canvas.setActiveObject(rectangle);
    }
  };

  const handleDelete = () => {
    const canvas_instance = fabricRef.current;
    if (!canvas_instance) return;
    const target = canvas_instance.getActiveObject();
    if (target) {
      canvas_instance?.remove(target);
      canvas_instance?.requestRenderAll();
    }
  };

  const [isFixed, setIsFixed] = useState(false);
  const [isModify, setIsModify] = useState(false);

  const handleViewMenuOpen = () => {
    const canvas_instance = fabricRef.current;
    if (!canvas_instance) return;
    const target = canvas_instance.getActiveObject();
    if (target) {
      console.log(target.img_view);
      setIsFixed(target.img_view === "fixed");
      setIsModify(target.img_view === "modify");
    }
  };

  const handleModifyClick = () => {
    const canvas_instance = fabricRef.current;
    if (!canvas_instance) return;
    const target = canvas_instance.getActiveObject();
    if (target) {
      target.img_view = "modify";
      setIsFixed(false);
      setIsModify(true);
      saveState();
      // canvas_instance.requestRenderAll();
    }
  };

  const handleStayFixedClick = () => {
    const canvas_instance = fabricRef.current;
    if (!canvas_instance) return;
    const target = canvas_instance.getActiveObject();
    if (target) {
      target.img_view = "fixed";
      setIsFixed(true);
      setIsModify(false);
      saveState();
      // canvas_instance.requestRenderAll();
    }
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

  return (
    <div
      className="flex w-screen h-screen justify-center items-center"
      aria-hidden="true"
    >
      <Menubar
        id="button-container"
        style={{
          position: "absolute",
          left: buttonPosition.left,
          top: buttonPosition.top,
          display: buttonVisible ? "flex" : "none", // Toggle visibility
          zIndex: 9999,
        }}
      >
        <MenubarMenu>
          <MenubarTrigger>Edit</MenubarTrigger>
          <MenubarContent>
            <MenubarItem onClick={handleCopy}>
              Copy{" "}
              <MenubarShortcut>
                <Copy />
              </MenubarShortcut>
            </MenubarItem>
            <MenubarItem onClick={handleCut}>
              Cut{" "}
              <MenubarShortcut>
                <Scissors />
              </MenubarShortcut>
            </MenubarItem>
            <MenubarItem onClick={handleDelete}>
              Delete{" "}
              <MenubarShortcut>
                {" "}
                <Trash2 />{" "}
              </MenubarShortcut>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>

        <MenubarMenu>
          <MenubarTrigger>Layer</MenubarTrigger>
          <MenubarContent>
            <MenubarItem onClick={() => handleLayoutControl("toFront")}>
              toFront{" "}
              <MenubarShortcut>
                <ArrowUpIcon className="h-4 w-4" />
              </MenubarShortcut>
            </MenubarItem>
            <MenubarItem onClick={() => handleLayoutControl("toBack")}>
              toBack{" "}
              <MenubarShortcut>
                <ArrowDownIcon className="h-4 w-4" />
              </MenubarShortcut>
            </MenubarItem>
            <MenubarItem onClick={() => handleLayoutControl("toForward")}>
              toForward{" "}
              <MenubarShortcut>
                {" "}
                <DoubleArrowUpIcon className="h-4 w-4" />{" "}
              </MenubarShortcut>
            </MenubarItem>
            <MenubarItem onClick={() => handleLayoutControl("toBackward")}>
              toBackward{" "}
              <MenubarShortcut>
                {" "}
                <DoubleArrowDownIcon className="h-4 w-4" />{" "}
              </MenubarShortcut>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>

        <MenubarMenu>
          <MenubarTrigger onClick={handleViewMenuOpen}>View</MenubarTrigger>
          <MenubarContent>
            <MenubarCheckboxItem
              checked={isFixed}
              onClick={handleStayFixedClick}
            >
              Stay fixed
            </MenubarCheckboxItem>
            <MenubarCheckboxItem checked={isModify} onClick={handleModifyClick}>
              Modify
            </MenubarCheckboxItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>

      {renderCanvas()}
      <div className="fixed flex bottom-5 border px-4 py-2 rounded-[3rem] gap-8 items-center justify-center backdrop-filter backdrop-blur-md bg-background/70">
        <Slider
          className="w-48"
          defaultValue={[50]}
          min={MIN_BRUSH_SIZE}
          max={MAX_BRUSH_SIZE}
          step={1}
          tabIndex={-1}
          value={[baseBrushSize]}
          onValueChange={(vals) => handleSliderChange(vals[0])}
          onClick={() => setShowRefBrush(false)}
        />
        <div className="flex gap-2">
          <IconButton
            tooltip="Reset zoom & pan"
            // disabled={scale === minScale && panned === false}
            onClick={resetZoom}
          >
            <Expand />
          </IconButton>
          <IconButton
            tooltip="Undo"
            onClick={handleUndo}
            disabled={undoDisabled}
          >
            <Undo />
          </IconButton>
          <IconButton
            tooltip="Redo"
            onClick={handleRedo}
            disabled={redoDisabled}
          >
            <Redo />
          </IconButton>
          <IconButton
            tooltip="Show original image"
            onPointerDown={(ev) => {
              ev.preventDefault();
              setShowOriginal(() => {
                window.setTimeout(() => {
                  setSliderPos(100);
                }, 10);
                return true;
              });
            }}
            onPointerUp={() => {
              window.setTimeout(() => {
                // 防止快速点击 show original image 按钮时图片消失
                setSliderPos(0);
              }, 10);

              window.setTimeout(() => {
                setShowOriginal(false);
              }, COMPARE_SLIDER_DURATION_MS);
            }}
            disabled={renders.length === 0}
          >
            <Eye />
          </IconButton>

          <IconButton
            tooltip="Save Image"
            //disabled={!renders.length}
            // onClick={ () => {
            //   download("image");
            //   download("path")
            // }}
            onClick={() => {
              handleDownload("image");
            }}
          >
            <Download />
          </IconButton>

          <IconButton
            tooltip="Run Inpainting"
            disabled={
              isProcessing || (!hadDrawSomething() && extraMasks.length === 0)
            }
            onClick={() => {
              runInpainting("lama");
            }}
          >
            <Eraser />
          </IconButton>

          <Toggle
            aria-label="Toggle italic"
            defaultPressed={settings.showDrawing}
            onPressedChange={(value: boolean) => {
              updateSettings({ showDrawing: value });
              handleDrawingMode(value);
              if (value) {
                updateSettings({ showSelectable: false });
              }
            }}
          >
            <Paintbrush />
          </Toggle>
        </div>
      </div>
    </div>
  );
});

export default Editor;
