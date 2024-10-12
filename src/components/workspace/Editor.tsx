import React, {
  SyntheticEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
  MutableRefObject,
} from "react";
import { predefinedRatios } from "@/lib/const";
import { useToast } from "@/components/ui/use-toast";
import { useKeyPressEvent } from "react-use";
import { IconButton } from "@/components/ui/button";
import { Button } from "../ui/button";
import { removeBackgroundApi } from "@/lib/api";
import { useTranslation } from "react-i18next";
import { resizeImageWithPica } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import useResolution from "@/hooks/useResolution";

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

import { cn, isLeftClick, dataURItoBlob, debugLog } from "@/lib/utils";
import {
  Eraser,
  Redo,
  Undo,
  Copy,
  Scissors,
  Trash2,
  Expand,
  Download,
  Paintbrush,
  GrabIcon,
} from "lucide-react";
import {
  DoubleArrowDownIcon,
  DoubleArrowUpIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  CookieIcon,
  PersonIcon,
} from "@radix-ui/react-icons";
import { useImage } from "@/hooks/useImage";
import { Slider } from "../ui/slider";
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
import { FabricObject, FabricImage, FabricText, Point } from "fabric"; // migration path

// import {
//   preload,
//   removeBackground,
//   removeForeground,
//   segmentForeground,
//   alphamask,
//   applySegmentationMask,
// } from "@imgly/background-removal";
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
    quality: 1,
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
  const resolution = useResolution();
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
    setTriggerUndoRedo,
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
    state.setTriggerUndoRedo,
  ]);
  const baseBrushSize = useStore((state) => state.editorState.baseBrushSize);
  const triggerRedoUndo = useStore(
    (state) => state.editorState.triggerRedoUndo,
  );
  const brushSize = useStore((state) => state.getBrushSize());
  const renders = useStore((state) => state.editorState.renders);
  const extraMasks = useStore((state) => state.editorState.extraMasks);
  const temporaryMasks = useStore((state) => state.editorState.temporaryMasks);
  const lineGroups = useStore((state) => state.editorState.lineGroups);
  const curLineGroup = useStore((state) => state.editorState.curLineGroup);
  const showDrawing = useStore((state) => state.settings.showDrawing);
  const isPanningActive = useStore((state) => state.settings.isPanningActive);
  const isPanningActiveRef = useRef(isPanningActive);

  const dev_mode = useStore((state) => state.settings.isDevModeActive);
  const currCanvasGroups = useStore(
    (state) => state.editorState.currCanvasGroups,
  );
  const { t } = useTranslation();

  // Local State
  const [showOriginal, setShowOriginal] = useState(false);
  const [original, isOriginalLoaded] = useImage(null);

  const [{ x, y }, setCoords] = useState({ x: -1, y: -1 });
  const [showBrush, setShowBrush] = useState(false);
  const [showRefBrush, setShowRefBrush] = useState(false);

  const rectangleGroupRef = useRef<fabric.Group | undefined>(undefined);
  const groupCoordinatesRef = useRef<{ offsetX: number; offsetY: number }>();
  const isDragging = useRef(false);
  const lastPosX = useRef(0);
  const lastPosY = useRef(0);
  const windowSize = useWindowSize();

  const [compatibleWidth, setCompatibleWidth] = useState<number>(
    window.innerWidth,
  );
  const [compatibleHeight, setCompatibleHeight] = useState<number>(
    window.innerHeight,
  );

  const [isDraging, setIsDraging] = useState(false);

  const [sliderPos, setSliderPos] = useState<number>(0);
  const [isChangingBrushSizeByWheel, setIsChangingBrushSizeByWheel] =
    useState<boolean>(false);

  const [buttonPosition, setButtonPosition] = useState({ left: 0, top: 0 });
  const [buttonVisible, setButtonVisible] = useState(false);
  const [BottomButtonPosition, setBottomButtonPosition] = useState({
    left: 0,
    top: 0,
  });
  const [BottomButtonVisible, setBottomButtonVisible] = useState(false);

  // crop
  const lastActiveObject = useRef<fabric.Object | null>(null);
  const rectangleCut = useRef<fabric.Object | null>(null);
  const isCropping = useRef<boolean>(false);

  const oldWindowSize = useRef<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  const hadDrawSomething = useCallback(() => {
    return currCanvasGroups.length !== 0;
  }, [currCanvasGroups]);

  const saveState = useCallback(() => {
    if (fabricRef.current) {
      const canva_instance = fabricRef.current;
      handleSaveState(canva_instance);
    }
  }, [fabricRef.current]);

  function animateImageOpacity(object, duration, toOpacity, animationIdRef) {
    if (!object) return;

    const startOpacity = object.get("opacity");
    const startTime = performance.now();

    function step(timestamp) {
      if (!animationIdRef.current) return; // If animationIdRef.current is null, stop the animation

      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const newOpacity = startOpacity + (toOpacity - startOpacity) * progress;

      object.set("opacity", newOpacity);
      object.canvas?.renderAll();

      if (progress < 1) {
        animationIdRef.current = requestAnimationFrame(step);
      } else {
        const nextOpacity = toOpacity === 1 ? 0 : 1;
        animateImageOpacity(object, duration, nextOpacity, animationIdRef);
      }
    }

    animationIdRef.current = requestAnimationFrame(step);
  }

  function stopAnimation(object, animationIdRef) {
    if (animationIdRef.current !== null) {
      cancelAnimationFrame(animationIdRef.current);
      animationIdRef.current = null;
      object.set("opacity", 1);
      object.canvas?.renderAll();
    }
  }

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
    const objectBoundingBox = objectToCrop.getBoundingRect();
    const cropBoundingBox = rectCrop.getBoundingRect();

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

  /* positionBtn: menu bar that displays on top of image */
  function positionBtn(obj: FabricObject | undefined) {
    if (!obj) return;
    const btnContainer = document.getElementById("upper-button-options");
    if (!btnContainer) return;
    if (!fabricRef.current) return;
    const zoom = fabricRef.current.getZoom();
    const viewportTransform = fabricRef.current.viewportTransform;
    const mTotal = fabric.util.multiplyTransformMatrices(
      viewportTransform,
      obj.calcTransformMatrix(),
    );
    const left = mTotal[4] - 150;
    // const top = mTotal[5] - (zoom * obj.height * obj.scaleY) / 2; /* size of div i guess */
    const top = mTotal[5] - (zoom * obj.getScaledHeight()) / 2 + 10;
    setButtonPosition({ left, top });
    setButtonVisible(true);
  }

  /* positionBottomBtn: menu bar that displays on bottom of image */
  function positionBottomBtn(obj: FabricObject | undefined) {
    if (!obj) return;
    const btnContainer = document.getElementById("bottom-button-options");
    if (!btnContainer) return;
    if (!fabricRef.current) return;
    const zoom = fabricRef.current.getZoom();
    const viewportTransform = fabricRef.current.viewportTransform;
    const mTotal = fabric.util.multiplyTransformMatrices(
      viewportTransform,
      obj.calcTransformMatrix(),
    );
    const left = mTotal[4] - 100;
    // const top = mTotal[5] + (zoom * obj.height * obj.scaleY) / 2 + 77; /* size of div i guess */
    const top =
      mTotal[5] +
      (zoom * obj.getScaledHeight()) / 2 +
      100; /* size of div i guess */
    setBottomButtonPosition({ left, top });
    setBottomButtonVisible(true);
  }

  useEffect(() => {
    const initMainCanvas = (): fabric.Canvas => {
      oldWindowSize.current = {
        width: window.innerWidth,
        height: window.innerHeight,
      };

      updateAppState({
        userWindowWidth: window.innerWidth,
        userWindowHeight: window.innerHeight,
      });

      debugLog(LOG_LEVELS.DEBUG, " <<screen window size>>  width, heigth ", [
        window.innerWidth,
        window.innerHeight,
      ]);

      return new fabric.Canvas(canvasRef.current || undefined, {
        width: window.innerWidth,
        height: window.innerHeight,
        backgroundColor: "#27272a",
        imageSmoothingEnabled: false,
        fireMiddleClick: true,
        stopContextMenu: true, // 禁止默认右键菜单
        enableRetinaScaling: false,
        controlsAboveOverlay: false,
        preserveObjectStacking: true,
        selection: false,
      });
    };

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
    // Activate drawing mode for mask overlay
    if (fabricRef.current) {
      const brush = new fabric.PencilBrush(fabricRef.current);
      brush.color = BRUSH_COLOR;
      brush.width = DEFAULT_BRUSH_SIZE;
      fabricRef.current.isDrawingMode = settings.showDrawing;
      fabricRef.current.freeDrawingBrush = brush;
    }

    fabric.InteractiveFabricObject.ownDefaults = {
      ...fabric.InteractiveFabricObject.ownDefaults,
      noScaleCache: true,
      cornerStyle: "rect",
      cornerStrokeColor: "#0E98FC",
      cornerColor: "white",
      padding: 7,
      transparentCorners: false,
      cornerDashArray: [2, 2],
      borderColor: "#51B9F9",
      borderDashArray: [3, 1, 3],
      borderScaleFactor: 2.0,
      borderOpacityWhenMoving: 1,
    };

    // SEE DOCUMENTATION https://fabricjs.github.io/docs/configuring-controls/
    fabric.FabricObject.createControls = () => {
      const controls = fabric.controlsUtils.createObjectDefaultControls();
      delete controls.mtr;
      return {
        controls: {
          ...controls,
          mySpecialControl: new fabric.Control({
            x: 0.55,
            y: -0.55,
            withConnection: true,
            actionName: "rotate",
            actionHandler: fabric.controlsUtils.rotationWithSnapping,
            cursorStyleHandler: fabric.controlsUtils.rotationStyleHandler,
            sizeX: 50, // Increase the hit area width
            sizeY: 50, // Increase the hit area height
            render: function (ctx, left, top) {
              // Custom icon image
              const rotateImgIcon = new Image();
              rotateImgIcon.src =
                "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAACXBIWXMAAAsTAAALEwEAmpwYAAAGn0lEQVR4nO1ae2xTVRz+cCA+AEFRwYjGF5GHCDHKQzYyHmVsIxKiECX6jyYYDaKJJEJMQBIhxnXjoRDkMdzO7WBgFgcIW9eOVxRBBiELbOvKNkUHZIDIQ3lsnzm3LVvb2+62u7ed2C/5Jdt6e7/zfed3fud37h2QQAIJJJBAAgkkECdwDe7Bfw0sSZlCR+pK2lPns3xc73av3zb8GZYmf0x7yhaWTaikc3ITnWkt3J1JNRxp1+lMa6Jj4mGWpW6ifewcFg9+DJ0RLBu/9NbAPYOvY+mYR4Ku2zX4fpaOXUzHxGqWZ7Rerzfkd4oeP0SBd7kOPdEZwO1j+7A845+gwTosFSwcfKd6TfELfWlPWUtn2tWg6/a9Sh6ZR1YtJ90byIbNnp93Tw02wDmZLOhGKpBxngKLWYj74mtAacqMkDNmTy3iztFz6Zx80e/vB2eTJ/PIS26SLdRE5ecBs59OfvewT3xrCDRS4M34GeBIXak7hSvmkU0HQ4tui2MLW9O+ZBS5pXeweH8jtjIXveNggOWALvG1a7WFttwgLx73pP7xL8mjn5J7pnlSvaA7aUsKL9zfhFrm4enYiS98LYnl6Zd1GdB0oI3oZvLUNnL/THJzD/0C9cUZCgyPjQElY0fqTv/DH5LnK0h3Llk80GjRgZlwmgV4ynwD7OM+0RQrq7U9hXRaPLHrJXLrg+aKDg6X6TsEyyZ8HyS+9GXS1rUjs3eJCq4YlAmbzTXAmfZrkAFaW1X4QTpowxwKPMdC3H3r3rm4izaMoMD7FNhNgZYojZhljvjtL/ZjeWZr6+qL1kalvdjDPAzVzafgWQoURWHAH6Z0jbQnzwpufMZFMvONLMCAiHkFXqGCixGasMgEA1JXBxmwY1ik6V/BPNwbMbcNQ6jgtwi4mqLhCQs6LIeCDCgaEM0a/SIq/nwMVs8D+nlmR8OjCRJdWJ4efLAp7BlNpT6BKEGB6RFw7YmWJwjylMfyjGb/vd9CKl2iMeBHdAAU2K6Tq5mF6NcRLj/QObHEf/0PjSb9m2VRQwcg217dfDbM6AiXH7gzuT+dlj3qVuiY5Dm4tJJd8a7PM1Tg9sZhKviFCvZSgZ0CgjaMhwGggp/CCW8W4J9rwTOrsNoIPj/Ix18sHtiXCvrI2oA4gALzQ4m/mgvWZoPVWaArG7txO4L5SNYSfz1PFa2K9xrQgNsRzMNDWgY0ft0qXg0rLuJ2BAtxp5YB7hx/A2qycBO3IygPTgHiW0TA7HsMuGbOAARSqGAbBc6qDyMUOKlgmilkWvz5eDTQgBt5wQZUZ+GC8eQCH6j7uXYVXh6LnYH5sARy/71RMwNcxhLbMDKMeF+nN9NQUq1xKFgSyCv3/UADanNQYjTxJh2tbrWZWaCeSwRqAnlPrwo2wJWFHGPJFZzU2e9PMZS47RgEpujZAWTU5Rhcl6igXmcffoSFSDJh+0vytth+fJc3aBbAa03L0cvYAQhsjeDgsyBWLfDvX2kasNNofsitTrcBAjdoQ4aB3OnqPXVUfzX9V+B1o7hvgeXoGsEy8JwSBaajg6CCqaEenTes0DSgwYwlqIICb0dggMyEFgp8xh/QHdEZvogCN7XufW6N9uy7s/FRpFyRDUqgMiITPOGSPYLs49vlWIg7KPAGFVSFup8sfDVWjebHihNyjDATVDC63YYodEaco8BaKniH+Rgl3+5SwZMswBj53t/72Zlw95Drvu2x1xdVVjS7l2GSqeJ9oMDSqAzoYFzJ1Ravpv4ygxsfHXtyWayEy9NeU4g1r3Z9VuznGnRDLMF89KLAIbPFy/Vevzy0+Borqo4vwQMxFe8DFcjng0eMFu17sBlOuPfEV1mfjf6IJ7gOPSmwI1KRN/PBa996ipqc5b/Wg2dXe/Z2rQqvMfN7G1ahDzoD6KkJC6jgenvCL61vf2bbiZvuHCyV2yU6G+h5x78vlPgLGuf2SMJlRUWNFaPQ2UH5Hk/g58DH1npSO0RUuqx4q1POejiozY7ACio4FW4bC7HGm2qs2Fi/wpg3SnEFiS6N32BI3TK8587B6tps7KrNwdGaLBxzZaPaZcUhlxVl3s/m1uVgeLzePCWQQAJRQ575ZWMiO7MnAAwCMALAGADJAFIAtaBNADDZG5ne8P0+wXtNivc7Y7z3GOS9Z38vR8TPF8xAD0D9F9WRACxtxMQqLF5uOQZj/ylKB54H1Gd+mZ0k5FiGIYYY9n83AN60i+cSmBTPJQANhCqCowOKoIxQRdD3ua8Iyu+aWgT/BW3tWWiM65+6AAAAAElFTkSuQmCC";
              rotateImgIcon.onload = function () {
                const size = 60;
                ctx.save();
                ctx.translate(left, top);
                ctx.drawImage(rotateImgIcon, -size / 2, -size / 2, size, size);
                ctx.restore();
              };
            },
          }),
        },
      };
    };

    // Event listener for panning
    fabricRef.current?.on("mouse:up", stopPanning);
    fabricRef.current?.on("mouse:down", startPanning);
    fabricRef.current?.on("mouse:move", panCanvas);

    fabricRef.current?.on("selection:updated", function (e) {
      positionBtn(e.selected[0]);
      positionBottomBtn(e.selected[0]);
    });

    fabricRef.current?.on("selection:created", function (e) {
      /*do not drag canvas when object selected */
      positionBtn(e.selected[0]);
      positionBottomBtn(e.selected[0]);
    });

    fabricRef.current?.on("object:moving", function () {
      setButtonVisible(false);
      setBottomButtonVisible(false);
    });

    fabricRef.current?.on("selection:cleared", function () {
      setButtonVisible(false);
      setBottomButtonVisible(false);
    });

    fabricRef.current?.on("path:created", () => {
      saveState();
    });

    fabricRef.current?.on("object:modified", (e) => {
      console.log("object:modified");
      const active_object = e.target.canvas?.getActiveObject();
      positionBtn(active_object);
      positionBottomBtn(active_object);
      saveState();
    });

    fabricRef.current?.on("mouse:wheel", function (opt) {
      const delta = opt.e.deltaY;
      let zoom = fabricRef.current?.getZoom() ?? 1;
      zoom *= 0.999 ** delta;
      if (zoom > 20) zoom = 20;
      if (zoom < 0.01) zoom = 0.01;
      const point_zoom = new Point(opt.e.offsetX, opt.e.offsetY);
      fabricRef.current?.zoomToPoint(point_zoom, zoom);
      setButtonVisible(false);
      setBottomButtonVisible(false);
      opt.e.preventDefault();
      opt.e.stopPropagation();
    });

    initAligningGuidelines();
    // #### DISPOSE
    return () => {
      fabricRef.current?.dispose();
    };
  }, []);

  // Update the ref whenever isPanningActive changes
  useEffect(() => {
    isPanningActiveRef.current = isPanningActive;
  }, [isPanningActive]);

  useEffect(() => {
    const canvas_instance = fabricRef.current;
    if (!canvas_instance) return;

    const width = canvas_instance?.width ?? 0;
    const height = canvas_instance?.height ?? 0;

    // Adjust clipping area based on the aspect ratio
    let clipWidth, clipHeight;

    const ratioObject = predefinedRatios.find(
      (ratio) => ratio.name === aspectRatio,
    );

    if (ratioObject) {
      debugLog(LOG_LEVELS.DEBUG, "Aspect Ratio ", ratioObject);
      const { width: ratioWidth, height: ratioHeight } = ratioObject;
      clipWidth = ratioWidth;
      clipHeight = ratioHeight;
    }

    debugLog(LOG_LEVELS.DEBUG, " <<user canvas window>>  width, heigth ", [
      canvas_instance.width,
      canvas_instance.height,
    ]);
    // debugLog(LOG_LEVELS.DEBUG, "<<user choosedWidth, choosedHeigth>> ", [
    //   clipWidth,
    //   clipHeight,
    // ]);
    debugLog(
      LOG_LEVELS.DEBUG,
      "<<user transf canvas  matrix>>\n",
      canvas_instance.viewportTransform,
    );

    const zoomX = width / clipWidth;
    const zoomY = height / clipHeight;

    debugLog(LOG_LEVELS.DEBUG, " <<zoom initial>>  zoomX, zoomY ", [
      zoomX,
      zoomY,
    ]);

    let calculated_zoom;

    if (resolution === "desktop") {
      calculated_zoom = Math.min(zoomX, zoomY) - 0.25;
    } else {
      calculated_zoom = Math.min(zoomX, zoomY);
    }

    debugLog(LOG_LEVELS.DEBUG, " <<calculated zoom>> ", calculated_zoom);
    const point_zoom = new Point(
      fabricRef.current?.width / 2,
      fabricRef.current?.height / 2,
    );
    // Here i can move to X and Y axis to show initial square working area
    fabricRef.current.setViewportTransform([1, 0, 0, 1, 0, 0]);
    fabricRef.current?.zoomToPoint(point_zoom, calculated_zoom);

    updateAppState({ scaledWidth: clipWidth, scaledHeight: clipHeight });
    setImageSize(clipWidth, clipHeight);

    const centerX = width / 2;
    const centerY = height / 2;
    // Calculate corner points of the rectangle
    const topLeft = {
      x: centerX - clipWidth / 2,
      y: centerY - clipHeight / 2,
    };
    const topRight = {
      x: centerX + clipWidth / 2,
      y: centerY - clipHeight / 2,
    };
    const bottomRight = {
      x: centerX + clipWidth / 2,
      y: centerY + clipHeight / 2,
    };
    const bottomLeft = {
      x: centerX - clipWidth / 2,
      y: centerY + clipHeight / 2,
    };

    // Create lines for the rectangle outline
    const topLine = new fabric.Line(
      [topLeft.x, topLeft.y, topRight.x, topRight.y],
      {
        stroke: "#84CC16",
        strokeWidth: 3,
        strokeLineCap: "round",
        selectable: false,
      },
    );
    const rightLine = new fabric.Line(
      [topRight.x, topRight.y, bottomRight.x, bottomRight.y],
      {
        stroke: "#84CC16",
        strokeWidth: 3,
        strokeLineCap: "round",
        selectable: false,
      },
    );
    const bottomLine = new fabric.Line(
      [bottomRight.x, bottomRight.y, bottomLeft.x, bottomLeft.y],
      {
        stroke: "#84CC16",
        strokeWidth: 3,
        strokeLineCap: "round",
        selectable: false,
      },
    );
    const leftLine = new fabric.Line(
      [bottomLeft.x, bottomLeft.y, topLeft.x, topLeft.y],
      {
        stroke: "#84CC16",
        strokeWidth: 3,
        strokeLineCap: "round",
        selectable: false,
      },
    );

    const place_img_instruction = new FabricText(t("Place image"), {
      left: centerX - clipWidth / 2 + 250,
      top: centerY - clipHeight / 2 - 50,
      fill: "#84CC16",
      fontFamily: "Comic Sans",
      fontSize: 35,
      textAlign: "left",
      Shadow: "rgba(0,0,0,0.2) 0 0 5px",
      selectable: false,
    });

    const results_instruction = new FabricText(t("Results image msg"), {
      left: centerX + clipWidth - 280,
      top: centerY - clipHeight / 2 - 50,
      fill: "#84CC16",
      fontFamily: "Comic Sans",
      fontSize: 35,
      Shadow: "rgba(0,0,0,0.2) 0 0 5px",
      textAlign: "left",
      selectable: false,
    });
    // Group the lines into a single fabric.Group
    const rectangleGroup = new fabric.Group(
      [
        topLine,
        rightLine,
        bottomLine,
        leftLine,
        place_img_instruction,
        results_instruction,
      ],
      { selectable: false },
    );

    rectangleGroupRef.current = rectangleGroup;
    groupCoordinatesRef.current = {
      offsetX: rectangleGroup.left,
      offsetY: rectangleGroup.top,
    };
    canvas_instance.overlayImage = rectangleGroupRef.current;
  }, [aspectRatio, t]);

  // Mouse events for panning
  const stopPanning = useCallback((opt: fabric.TEvent<MouseEvent>) => {
    if (isLeftClick(opt)) {
      isDragging.current = false;
    }
  }, []);

  const startPanning = useCallback((opt: fabric.TEvent<MouseEvent>) => {
    if (fabricRef.current?.getActiveObject()) return;
    if (isLeftClick(opt) && isPanningActiveRef.current) {
      isDragging.current = true;
      const evt = opt.e;
      lastPosX.current = evt.clientX;
      lastPosY.current = evt.clientY;
    }
  }, []);

  const panCanvas = useCallback((opt: fabric.TEvent<MouseEvent>) => {
    if (isLeftClick(opt) && isDragging.current) {
      const e = opt.e;
      const vpt = fabricRef.current.viewportTransform;
      vpt[4] += e.clientX - lastPosX.current;
      vpt[5] += e.clientY - lastPosY.current;
      fabricRef.current.requestRenderAll();
      lastPosX.current = e.clientX;
      lastPosY.current = e.clientY;
    }
  }, []);

  const aligningLineOffset = 5;
  const aligningLineMargin = 4;
  const aligningLineWidth = 5;
  const aligningLineColor = "rgb(160,198,58)";
  const aligningDash = [15, 2];

  function initAligningGuidelines() {
    const canvas = fabricRef.current;
    if (!canvas) return;
    let ctx = canvas.getSelectionContext();
    let viewportTransform;
    let zoom = 1;
    let verticalLines = [];
    let horizontalLines = [];

    canvas.on("mouse:down", function () {
      viewportTransform = canvas.viewportTransform;
      zoom = canvas.getZoom();
    });

    canvas.on("object:moving", function (e) {
      if (!canvas._currentTransform) return;
      let activeObject = e.target;
      let activeObjectCenter = activeObject.getCenterPoint();
      //let activeObjectBoundingRect = activeObject.getBoundingRect()
      let activeObjectHalfWidth = activeObject.getScaledWidth() / 2;
      let activeObjectHalfHeight = activeObject.getScaledHeight() / 2;

      canvas
        .getObjects()
        .filter((object) => object !== activeObject && object.visible)
        .forEach((object) => {
          let objectCenter = object.getCenterPoint();
          //let objectBoundingRect = object.getBoundingRect()
          let objectHalfHeight = object.getScaledWidth() / 2;
          let objectHalfWidth = object.getScaledHeight() / 2;

          // snap by the horizontal center line
          snapVertical(objectCenter.x, activeObjectCenter.x, objectCenter.x);
          // snap by the left object edge matching left active edge
          snapVertical(
            objectCenter.x - objectHalfWidth,
            activeObjectCenter.x - activeObjectHalfWidth,
            objectCenter.x - objectHalfWidth + activeObjectHalfWidth,
          );
          // snap by the left object edge matching right active edge
          snapVertical(
            objectCenter.x - objectHalfWidth,
            activeObjectCenter.x + activeObjectHalfWidth,
            objectCenter.x - objectHalfWidth - activeObjectHalfWidth,
          );
          // snap by the right object edge matching right active edge
          snapVertical(
            objectCenter.x + objectHalfWidth,
            activeObjectCenter.x + activeObjectHalfWidth,
            objectCenter.x + objectHalfWidth - activeObjectHalfWidth,
          );
          // snap by the right object edge matching left active edge
          snapVertical(
            objectCenter.x + objectHalfWidth,
            activeObjectCenter.x - activeObjectHalfWidth,
            objectCenter.x + objectHalfWidth + activeObjectHalfWidth,
          );

          function snapVertical(objEdge, activeEdge, snapCenter) {
            if (isInRange(objEdge, activeEdge)) {
              verticalLines.push({
                x: objEdge,
                y1:
                  objectCenter.y < activeObjectCenter.y
                    ? objectCenter.y - objectHalfHeight - aligningLineOffset
                    : objectCenter.y + objectHalfHeight + aligningLineOffset,
                y2:
                  activeObjectCenter.y > objectCenter.y
                    ? activeObjectCenter.y +
                      activeObjectHalfHeight +
                      aligningLineOffset
                    : activeObjectCenter.y -
                      activeObjectHalfHeight -
                      aligningLineOffset,
              });
              activeObject.setPositionByOrigin(
                new fabric.Point(snapCenter, activeObjectCenter.y),
                "center",
                "center",
              );
            }
          }

          // snap by the vertical center line
          snapHorizontal(objectCenter.y, activeObjectCenter.y, objectCenter.y);
          // snap by the top object edge matching the top active edge
          snapHorizontal(
            objectCenter.y - objectHalfHeight,
            activeObjectCenter.y - activeObjectHalfHeight,
            objectCenter.y - objectHalfHeight + activeObjectHalfHeight,
          );
          // snap by the top object edge matching the bottom active edge
          snapHorizontal(
            objectCenter.y - objectHalfHeight,
            activeObjectCenter.y + activeObjectHalfHeight,
            objectCenter.y - objectHalfHeight - activeObjectHalfHeight,
          );
          // snap by the bottom object edge matching the bottom active edge
          snapHorizontal(
            objectCenter.y + objectHalfHeight,
            activeObjectCenter.y + activeObjectHalfHeight,
            objectCenter.y + objectHalfHeight - activeObjectHalfHeight,
          );
          // snap by the bottom object edge matching the top active edge
          snapHorizontal(
            objectCenter.y + objectHalfHeight,
            activeObjectCenter.y - activeObjectHalfHeight,
            objectCenter.y + objectHalfHeight + activeObjectHalfHeight,
          );

          function snapHorizontal(objEdge, activeObjEdge, snapCenter) {
            if (isInRange(objEdge, activeObjEdge)) {
              horizontalLines.push({
                y: objEdge,
                x1:
                  objectCenter.x < activeObjectCenter.x
                    ? objectCenter.x - objectHalfWidth - aligningLineOffset
                    : objectCenter.x + objectHalfWidth + aligningLineOffset,
                x2:
                  activeObjectCenter.x > objectCenter.x
                    ? activeObjectCenter.x +
                      activeObjectHalfWidth +
                      aligningLineOffset
                    : activeObjectCenter.x -
                      activeObjectHalfWidth -
                      aligningLineOffset,
              });
              activeObject.setPositionByOrigin(
                new fabric.Point(activeObjectCenter.x, snapCenter),
                "center",
                "center",
              );
            }
          }
        });
    });

    canvas.on("before:render", () => {
      canvas.clearContext(canvas.contextTop);
    });

    canvas.on("after:render", function () {
      verticalLines.forEach((line) => drawVerticalLine(line));
      horizontalLines.forEach((line) => drawHorizontalLine(line));

      verticalLines = [];
      horizontalLines = [];
    });

    canvas.on("mouse:up", function () {
      canvas.renderAll();
    });

    function drawVerticalLine(coords) {
      drawLine(
        // coords.x + 0.5,
        coords.x,
        coords.y1 > coords.y2 ? coords.y2 : coords.y1,
        // coords.x + 0.5,
        coords.x,
        coords.y2 > coords.y1 ? coords.y2 : coords.y1,
      );
    }

    function drawHorizontalLine(coords) {
      drawLine(
        coords.x1 > coords.x2 ? coords.x2 : coords.x1,
        //coords.y + 0.5,
        coords.y,
        coords.x2 > coords.x1 ? coords.x2 : coords.x1,
        // coords.y + 0.5,
        coords.y,
      );
    }

    function drawLine(x1, y1, x2, y2) {
      ctx.save();
      ctx.lineWidth = aligningLineWidth;
      ctx.strokeStyle = aligningLineColor;
      ctx.setLineDash(aligningDash);
      ctx.beginPath();
      ctx.moveTo(
        x1 * zoom + viewportTransform[4],
        y1 * zoom + viewportTransform[5],
      );
      ctx.lineTo(
        x2 * zoom + viewportTransform[4],
        y2 * zoom + viewportTransform[5],
      );
      ctx.stroke();
      ctx.restore();
    }
    /**
     * return true if value2 is within value1 +/- aligningLineMargin
     * @param {number} value1
     * @param {number} value2
     * @returns Boolean
     */
    function isInRange(value1, value2) {
      return (
        value2 > value1 - aligningLineMargin &&
        value2 < value1 + aligningLineMargin
      );
    }
  }

  // COMING RENDERS FROM BACKEND
  useEffect(() => {
    const render = renders[renders.length - 1];

    if (!fabricRef.current || !render) return;

    debugLog(LOG_LEVELS.DEBUG, "renders", render);

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

    const offset = scaledWidth + 20;

    scaledImage.set({
      left: centerX + offset,
      top: centerY,
    });

    fabricRef.current.add(scaledImage);
    fabricRef.current.renderAll();

    handleSaveState(fabricRef.current);
  }, [renders]);

  // REDO / UNDO ACTION
  useEffect(() => {
    if (!fabricRef.current) return;
    if (currCanvasGroups.length === 0) return;

    const lastElement = currCanvasGroups[currCanvasGroups.length - 1];
    const state = JSON.parse(lastElement.data);

    fabricRef.current.loadFromJSON(state).then(() => {
      fabricRef.current?.renderAll();
    });
    // Reset Trigger
    setTriggerUndoRedo(false);
  }, [triggerRedoUndo]);

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

  // Zoom reset
  const resetZoom = useCallback(() => {
    if (fabricRef.current) {
      const zoomX = fabricRef.current?.width / scaledWidth;
      const zoomY = fabricRef.current?.height / scaledHeight;
      const calculated_zoom = Math.min(zoomX, zoomY) - 0.35;
      fabricRef.current.setViewportTransform([1, 0, 0, 1, 0, 0]); // Reset panning
      const zoom_point = new Point(
        fabricRef.current?.width / 2,
        fabricRef.current?.height / 2,
      );
      fabricRef.current?.zoomToPoint(zoom_point, calculated_zoom);
    }
  }, [scaledWidth, scaledHeight]);

  // Function to move the group by an offset
  const moveGroupByOffset = (
    group: fabric.Group,
    offsetX: number,
    offsetY: number,
  ) => {
    group.set({
      left: groupCoordinatesRef.current?.offsetX - offsetX / 2,
      top: groupCoordinatesRef.current?.offsetY - offsetY / 2,
    });
    group.setCoords(); // Update the coordinates
    fabricRef.current?.renderAll(); // Re-render the canvas
  };

  useEffect(() => {
    window.addEventListener("resize", () => {
      const offsetX = oldWindowSize.current.width - window.innerWidth;
      const offsetY = oldWindowSize.current.height - window.innerHeight;
      setCompatibleWidth(window.innerWidth);
      setCompatibleHeight(window.innerHeight);
      updateAppState({
        userWindowWidth: window.innerWidth,
        userWindowHeight: window.innerHeight,
      });

      // fabricRef.current?.setDimensions({
      //   width: window.innerWidth,
      //   height: window.innerHeight,
      // });
      fabricRef.current?.setWidth(window.innerWidth);
      fabricRef.current?.setHeight(window.innerHeight);
      moveGroupByOffset(rectangleGroupRef.current, offsetX, offsetY);
    });
    return () => {
      window.removeEventListener("resize", () => {});
    };
  }, []);

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
      }
    },
    (ev) => {
      if (!disableShortCuts) {
        ev?.preventDefault();
        ev?.stopPropagation();
        setShowBrush(true);
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

  // const renderInteractiveSegCursor = () => {
  //   return (
  //     <div
  //       className="absolute h-[20px] w-[20px] pointer-events-none rounded-[50%] bg-[rgba(21,_215,_121,_0.936)] [box-shadow:0_0_0_0_rgba(21,_215,_121,_0.936)] animate-pulse"
  //       style={{
  //         left: `${x}px`,
  //         top: `${y}px`,
  //         transform: "translate(-50%, -50%)",
  //       }}
  //     >
  //       <CursorArrowRaysIcon />
  //     </div>
  //   );
  // };

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

  const handleDownload = async (source: string) => {
    if (!fabricRef.current) return;
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

    const tempCanvas = new fabric.Canvas(undefined, {
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
      saveState();
    }
  };

  const handleDownloadObject = async () => {
    const canvas_instance = fabricRef.current;
    if (!canvas_instance) return;
    const current_active = canvas_instance.getActiveObject();
    if (!current_active) return;

    const objectWidth =
      (current_active.width ?? 0) * (current_active.scaleX ?? 0);
    const objectHeight =
      (current_active.height ?? 0) * (current_active.scaleY ?? 0);
    let CvRef: HTMLCanvasElement | undefined = undefined;
    var tempCanvas = new fabric.Canvas(CvRef, {
      width: objectWidth,
      height: objectHeight,
    });
    // Clone the active object to the temporary canvas
    const cloned_object = await current_active.clone();

    cloned_object.set({
      left: objectWidth / 2,
      top: objectHeight / 2,
      scaleX: current_active.scaleX,
      scaleY: current_active.scaleY,
      originX: "center",
      originY: "center",
    });

    tempCanvas.add(cloned_object);
    tempCanvas.renderAll();

    const dataURL = tempCanvas.toDataURL({
      format: "png",
      quality: 1,
      multiplier: 1,
    });

    const link = document.createElement("a");
    link.href = dataURL;
    link.download = `generated_image.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
    if (!target) return;

    const canvas = target.canvas;

    const activeObject = canvas?.getActiveObject();
    if (!activeObject || !canvas) return;

    // Calculate the maximum width and height for the crop rectangle
    const maxWidth = activeObject.getScaledWidth();
    const maxHeight = activeObject.getScaledHeight();

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
  };

  const handleDelete = () => {
    const canvas_instance = fabricRef.current;
    if (!canvas_instance) return;
    const target = canvas_instance.getActiveObject();
    if (target) {
      canvas_instance?.remove(target);
      canvas_instance?.requestRenderAll();
      saveState();
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

  const handleRemoveBg = async (model: string) => {
    const fabricInstance = fabricRef.current;
    const current_active = fabricInstance?.getActiveObject();
    console.log(current_active);

    if (!current_active) return;

    const objectWidth =
      (current_active.width ?? 0) * (current_active.scaleX ?? 0);
    const objectHeight =
      (current_active.height ?? 0) * (current_active.scaleY ?? 0);
    const objectCenterTop = current_active.top ?? 0;
    const objectCenterLeft = current_active.left ?? 0;

    const originalSource = current_active._originalElement.currentSrc;

    const resizedImageSrc = await resizeImageWithPica(
      originalSource,
      objectWidth,
      objectHeight,
    );

    // Create a temporary canvas
    // let CvRef: HTMLCanvasElement | null = null;

    // var tempCanvas = new fabric.Canvas(CvRef, {
    //   width: objectWidth,
    //   height: objectHeight,
    // });
    // // Clone the active object to the temporary canvas
    // const cloned_object = await current_active.clone();

    // cloned_object.set({
    //   left: objectWidth / 2,
    //   top: objectHeight / 2,
    //   scaleX: current_active.scaleX,
    //   scaleY: current_active.scaleY,
    //   originX: "center",
    //   originY: "center",
    // });

    //   tempCanvas.add(cloned_object);
    //   tempCanvas.renderAll();

    // Get the data URL of the cloned object

    //const objectDataUrl = tempCanvas.toDataURL({format: "png",quality: 1,multiplier: 1});

    // // preview download
    // const link = document.createElement("a");
    // link.href = resizedImageSrc;
    // link.download = `objectDataUrl.png`;
    // document.body.appendChild(link);
    // link.click();
    // document.body.removeChild(link);

    const animationIdRef = { current: null };

    try {
      animateImageOpacity(current_active, 1000, 0, animationIdRef); // Start the continuous animation
      const res = await removeBackgroundApi(
        dataURItoBlob(resizedImageSrc),
        model,
        dev_mode,
      );
      const { blob, seed } = res;
      const newRender = new Image();
      loadImage(newRender, blob).then(() => {
        fabricInstance?.remove(current_active);
        const img_without_background = new FabricImage(newRender, {
          left: objectCenterLeft,
          top: objectCenterTop,
          originX: "center",
          originY: "center",
        });
        fabricInstance?.add(img_without_background);
        fabricInstance?.requestRenderAll();
      });
    } catch (e: any) {
      stopAnimation(current_active, animationIdRef);
      toast({
        variant: "destructive",
        description: e.message ? e.message : e.toString(),
      });
    }

    // remove background free version
    // removeBackground(objectDataUrl, config).then((blob: Blob) => {
    //   // The result is a blob encoded as PNG. It can be converted to an URL to be used as HTMLImage.src
    //   const url = URL.createObjectURL(blob);
    //   const newRender = new Image();
    //   loadImage(newRender, url).then(() => {
    //     console.log(newRender);
    //     fabricInstance?.remove(current_active);
    //     const img_without_background = new FabricImage(newRender, {
    //       left: objectCenterLeft,
    //       top: objectCenterTop,
    //       originX: "center",
    //       originY: "center",
    //     });
    //     fabricInstance?.add(img_without_background);
    //     fabricInstance?.requestRenderAll();
    //   });
    // });
  };

  const lastDistance = useRef(0);

  const handleGestureStart = (event) => {
    console.log("touch start");
    const touchCount = event.touches.length;
    if (touchCount === 2) {
      // Two-finger gesture started
      const point1 = event.touches[0];
      const point2 = event.touches[1];

      // Calculate initial distance
      const initialDistance = Math.hypot(
        point2.pageX - point1.pageX,
        point2.pageY - point1.pageY,
      );

      lastDistance.current = initialDistance;
    }

    if (touchCount === 1 && !fabricRef.current?.getActiveObject()) {
      isDragging.current = true;
      const touch = event.touches[0];
      lastPosX.current = touch.clientX;
      lastPosY.current = touch.clientY;
    }
  };

  const handleGestureMove = (event) => {
    const touchCount = event.touches.length;
    if (touchCount === 2) {
      // Calculate new distance between the two fingers
      const point1 = event.touches[0];
      const point2 = event.touches[1];
      const currentDistance = Math.hypot(
        point2.pageX - point1.pageX,
        point2.pageY - point1.pageY,
      );

      // Calculate the zoom factor
      const zoomFactor = currentDistance / lastDistance.current;

      let zoom = fabricRef.current?.getZoom() ?? 1;
      zoom *= zoomFactor;
      // Set boundaries for the zoom level
      if (zoom > 20) zoom = 20;
      if (zoom < 0.01) zoom = 0.01;
      // Zoom the canvas at the center point between the two fingers
      // const centerPoint = {
      //   x: (point1.pageX + point2.pageX) / 2,
      //   y: (point1.pageY + point2.pageY) / 2,
      // };
      const zoom_point = new Point(
        (point1.pageX + point2.pageX) / 2,
        (point1.pageY + point2.pageY) / 2,
      );
      fabricRef.current?.zoomToPoint(zoom_point, zoom);
      // Update last distance
      lastDistance.current = currentDistance;

      //event.preventDefault();
    }
    if (touchCount === 1 && isDragging.current) {
      const touch = event.touches[0];
      const vpt = fabricRef.current?.viewportTransform;
      vpt[4] += touch.clientX - lastPosX.current;
      vpt[5] += touch.clientY - lastPosY.current;
      fabricRef.current?.requestRenderAll();
      lastPosX.current = touch.clientX;
      lastPosY.current = touch.clientY;
      //event.preventDefault(); // Prevent scrolling
    }
  };

  const handleGestureEnd = () => {
    lastDistance.current = 0; // Reset distance when gesture ends
    isDragging.current = false;
  };

  return (
    <div
      className="flex w-screen h-screen justify-center items-center"
      onTouchStart={handleGestureStart}
      onTouchMove={handleGestureMove}
      onTouchEnd={handleGestureEnd}
      aria-hidden="true"
    >
      <Menubar
        id="upper-button-options"
        className="bg-[#349981]"
        style={{
          position: "absolute",
          left: buttonPosition.left,
          top: buttonPosition.top,
          display: buttonVisible ? "flex" : "none", // Toggle visibility
          zIndex: 9999,
        }}
      >
        <MenubarMenu>
          <MenubarTrigger>{t("Edit")}</MenubarTrigger>
          <MenubarContent className="bg-[#349981]">
            <MenubarItem onClick={handleDownloadObject}>
              {t("Descargar")}
              <MenubarShortcut>
                <Download />
              </MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem onClick={handleCopy}>
              {t("Copy")}
              <MenubarShortcut>
                <Copy />
              </MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem onClick={handleCut}>
              {t("Cut")}
              <MenubarShortcut>
                <Scissors />
              </MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem
              onClick={handleDelete}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              {t("Delete")}
              <MenubarShortcut>
                {" "}
                <Trash2 />{" "}
              </MenubarShortcut>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>

        <Separator orientation="vertical" />

        <MenubarMenu>
          <MenubarTrigger onClick={handleViewMenuOpen}>
            {t("Variation")}
          </MenubarTrigger>
          <MenubarContent className="bg-[#349981]">
            <MenubarCheckboxItem
              checked={isFixed}
              onClick={handleStayFixedClick}
            >
              {t("Fixed image")}
            </MenubarCheckboxItem>
            <MenubarSeparator />
            <MenubarCheckboxItem checked={isModify} onClick={handleModifyClick}>
              {t("Modify image")}
            </MenubarCheckboxItem>
          </MenubarContent>
        </MenubarMenu>

        <Separator orientation="vertical" />

        <MenubarMenu>
          <MenubarTrigger>{t("RemoveBG")}</MenubarTrigger>
          <MenubarContent className="bg-[#349981]">
            <MenubarItem onClick={() => handleRemoveBg("u2netp")}>
              Producto
              <MenubarShortcut>
                <CookieIcon className="h-4 w-4" />
              </MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem onClick={() => handleRemoveBg("u2net_human_seg")}>
              Persona
              <MenubarShortcut>
                <PersonIcon className="h-4 w-4" />
              </MenubarShortcut>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>

      <Menubar
        id="bottom-button-options"
        className="bg-[#349981]"
        style={{
          position: "absolute",
          left: BottomButtonPosition.left,
          top: BottomButtonPosition.top,
          display: BottomButtonVisible ? "flex" : "none", // Toggle visibility
          zIndex: 9999,
        }}
      >
        <MenubarMenu>
          <MenubarTrigger
            onClick={() => handleLayoutControl("toForward")}
            asChild
          >
            <Button variant="secondary" className="bg-[#349981]">
              {t("toFront")}
              <ArrowUpIcon className="h-4 w-4" />
            </Button>
          </MenubarTrigger>
          <Separator orientation="vertical" />
          <MenubarTrigger
            onClick={() => handleLayoutControl("toBackward")}
            asChild
          >
            <Button variant="secondary" className="bg-[#349981]">
              {t("toBack")}
              <ArrowDownIcon className="h-4 w-4" />
            </Button>
          </MenubarTrigger>
        </MenubarMenu>
      </Menubar>

      {renderCanvas()}
      {resolution !== "mobile" && (
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
              defaultPressed={showDrawing}
              disabled={isPanningActive}
              onPressedChange={(value: boolean) => {
                updateSettings({ showDrawing: value });
                const fabricInstance = fabricRef.current;
                if (fabricInstance) {
                  fabricInstance.isDrawingMode = value;
                }
                if (value) {
                  updateSettings({ isPanningActive: false });
                }
              }}
            >
              <div className="icon-button-icon-wrapper">
                <Paintbrush />
              </div>
            </Toggle>

            <Toggle
              aria-label="Toggle italic"
              defaultPressed={isPanningActive}
              disabled={showDrawing}
              onPressedChange={(value: boolean) => {
                updateSettings({ isPanningActive: value });
                if (value) {
                  updateSettings({ showDrawing: false });
                }
              }}
            >
              <div className="icon-button-icon-wrapper">
                <GrabIcon />
              </div>
            </Toggle>
          </div>
        </div>
      )}
    </div>
  );
});

export default Editor;
