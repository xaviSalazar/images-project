import React, {
  SyntheticEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
  ForwardedRef,
  MutableRefObject,
} from "react";
import { predefinedRatios } from "@/lib/const";
import { CursorArrowRaysIcon } from "@heroicons/react/24/outline";
import { useToast } from "@/components/ui/use-toast";
import { TransformIcon } from "@radix-ui/react-icons";
import {
  ReactZoomPanPinchContentRef,
  TransformComponent,
  TransformWrapper,
} from "react-zoom-pan-pinch";
import { useKeyPressEvent } from "react-use";
import { downloadToOutput, runPlugin } from "@/lib/api";
import { Canvas, Object as FabricObject } from "fabric/fabric-impl";
import { IconButton } from "@/components/ui/button";
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
} from "@/lib/utils";
import {
  Eraser,
  Eye,
  Redo,
  Undo,
  Expand,
  Download,
  Paintbrush,
  SignalMedium,
} from "lucide-react";
import { useImage } from "@/hooks/useImage";
import { Slider } from "./ui/slider";
import { PluginName } from "@/lib/types";
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
} from "@/lib/const";
import { Toggle } from "@/components/ui/toggle";
import { fabric } from "fabric";
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

const TOOLBAR_HEIGHT = 200;
const COMPARE_SLIDER_DURATION_MS = 300;
const DELTA_FRAME = 0;


const hexToRgba = (hex: string): string => {
  hex = hex.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const a = parseInt(hex.substring(6, 8), 16) / 255;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};

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
    const temporaryMasks = useStore(
      (state) => state.editorState.temporaryMasks,
    );
    const lineGroups = useStore((state) => state.editorState.lineGroups);
    const curLineGroup = useStore((state) => state.editorState.curLineGroup);
    const currCanvasGroups = useStore(
      (state) => state.editorState.currCanvasGroups,
    );

    // Local State
    const [showOriginal, setShowOriginal] = useState(false);
    const [original, isOriginalLoaded] = useImage(null);
    const [zoomLevel, setZoomLevel] = useState<number> (0.7); // Initial zoom level

    const [{ x, y }, setCoords] = useState({ x: -1, y: -1 });
    const [showBrush, setShowBrush] = useState(false);
    const [showRefBrush, setShowRefBrush] = useState(false);
    const [isPanning, setIsPanning] = useState<boolean>(false);

    const [scale, setScale] = useState<number>(1);
    const [panned, setPanned] = useState<boolean>(false);
    const [minScale, setMinScale] = useState<number>(1.0);
    const isDragging = useRef(false);
    const lastPosX = useRef(0);
    const lastPosY = useRef(0);  
    const windowSize = useWindowSize();

    // const windowCenterX = windowSize.width / 2;
    // const windowCenterY = windowSize.height / 2;
    const viewportRef = useRef<ReactZoomPanPinchContentRef | null>(null);

    const [isDraging, setIsDraging] = useState(false);

    const [sliderPos, setSliderPos] = useState<number>(0);
    const [isChangingBrushSizeByWheel, setIsChangingBrushSizeByWheel] =
      useState<boolean>(false);

    const cropperCanvasRef = useRef<HTMLCanvasElement | null>(null);
    // crop
    const lastActiveObject = useRef<fabric.Object | null>(null);
    const rectangleCut = useRef<fabric.Object | null>(null);
    const isCropping = useRef<boolean>(false);

    const hadDrawSomething = useCallback(() => {
      return currCanvasGroups.length !== 0;
    }, [currCanvasGroups]);

    const saveState = useCallback(() => {
      console.log("save state");
      if (fabricRef.current) {
        const state = fabricRef.current.toJSON();
        handleSaveState(JSON.stringify(state));
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
      eventData: fabric.IEvent<MouseEvent>,
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
      const objectTop = current_active.top;
      const objectLeft = current_active.left;

      let CvRef: HTMLCanvasElement | null = null;
      // Create a temporary canvas
      var tempCanvas = new fabric.Canvas(CvRef, {
        width: objectWidth,
        height: objectHeight,
      });
      // Clone the active object to the temporary canvas
      current_active.clone((clonedObject: fabric.Object) => {
        clonedObject.set({
          left: 0,
          top: 0,
          scaleX: current_active.scaleX,
          scaleY: current_active.scaleX,
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
            const img_without_background = new fabric.Image(newRender, {
              left: objectLeft,
              top: objectTop,
            });
            single_instance?.add(img_without_background);
            single_instance?.requestRenderAll();
          });
        });
      });
    };

    function cropImage() {
      if (
        !fabricRef.current ||
        !lastActiveObject.current ||
        !rectangleCut.current
      )
        return;

      console.log(lastActiveObject.current);
      console.log(rectangleCut.current);

      let height = parseInt(
        lastActiveObject.current.height * lastActiveObject.current.scaleY,
      ); // default height
      let width = parseInt(
        lastActiveObject.current.width * lastActiveObject.current.scaleX,
      ); // default width
      let top = lastActiveObject.current.top; // default top
      let left = lastActiveObject.current.left; // default left

      if (top < rectangleCut.current.top) {
        console.log("case top < rectangular");
        height = height - (rectangleCut.current.top - top);
        top = rectangleCut.current.top;
        console.log(top);
      }

      if (left < rectangleCut.current.left) {
        console.log("case left < rectangular");
        width = width - (rectangleCut.current.left - left);
        left = rectangleCut.current.left;
        console.log(left);
      }

      // validated part
      if (
        top + height >
        rectangleCut.current.top +
          rectangleCut.current.height * rectangleCut.current.scaleY
      ) {
        console.log("trim case 1");
        height =
          rectangleCut.current.top +
          rectangleCut.current.height * rectangleCut.current.scaleY -
          top;
      }

      if (
        left + width >
        rectangleCut.current.left +
          rectangleCut.current.width * rectangleCut.current.scaleX
      ) {
        console.log("trim case 2");
        width =
          rectangleCut.current.left +
          rectangleCut.current.width * rectangleCut.current.scaleX -
          left;
      }

      //var canvas_crop = new fabric.Canvas("canvas_crop");

      var canvas_crop = new fabric.Canvas(cropperCanvasRef.current, {});

      fabricRef.current?.remove(rectangleCut.current);
      rectangleCut.current = null;

      fabric.Image.fromURL(
        fabricRef.current.toDataURL({ format: "png" }),
        function (img) {
          img.set("left", -left);
          img.set("top", -top);
          canvas_crop.add(img);
          canvas_crop.setHeight(height);
          canvas_crop.setWidth(width);
          canvas_crop.renderAll();
          fabric.Image.fromURL(
            canvas_crop.toDataURL({ format: "png" }),
            function (croppedImg) {
              croppedImg.set("left", left);
              croppedImg.set("top", top);
              fabricRef.current?.remove(lastActiveObject.current);
              lastActiveObject.current = null;
              fabricRef.current?.add(croppedImg).renderAll();
            },
          );
        },
      );
    }

    const deleteObject = (
      eventData: fabric.IEvent<MouseEvent>,
      transform: { target: fabric.Object },
    ): void => {
      const target = transform.target;
      const canvas = target.canvas;
      canvas?.remove(target);
      canvas?.requestRenderAll();
    };

    // function to crop an image
    const drawCropRect = (
      eventData: fabric.IEvent<MouseEvent>,
      transform: { target: fabric.Object },
    ): void => {
      if (isCropping.current) {
        isCropping.current = false;
        return cropImage();
      }
      // continue to draw rectangle
      isCropping.current = true;

      const target = transform.target;
      let selection_object_left = 0;
      let selection_object_top = 0;

      const rectangle = new fabric.Rect({
        fill: "rgba(0,0,0,0)",
        originX: "left",
        originY: "top",
        stroke: "#ccc",
        hasBorders: true,
        lockMovementX: true,
        lockMovementY: true,
        //strokeDashArray: [2, 2],
        strokeWidth: 5,
        //opacity: 1,
        width: 1,
        height: 1,
        borderColor: "yellow",
        cornerColor: "green",
        hasRotatingPoint: false,
        selectable: true,
      });

      const canvas = target.canvas;
      lastActiveObject.current = canvas?.getActiveObject();
      rectangle.left = canvas?.getActiveObject()?.left;
      selection_object_left = canvas?.getActiveObject()?.left;
      selection_object_top = canvas?.getActiveObject()?.top;
      rectangle.top = canvas?.getActiveObject()?.top;
      rectangle.width =
        canvas?.getActiveObject()?.width * canvas?.getActiveObject()?.scaleX;
      rectangle.height =
        canvas?.getActiveObject()?.height * canvas?.getActiveObject()?.scaleY;
      rectangleCut.current = rectangle;
      canvas?.add(rectangle);
      console.log("added crop rectangle");
      canvas?.setActiveObject(rectangle);
    };

    useEffect(() => {

      const initMainCanvas = (): Canvas => {
        return new fabric.Canvas(canvasRef.current, {
          width: windowSize.width,
          height: windowSize.height,
          backgroundColor:  "#f0f0f0",
          fireMiddleClick: true,
          stopContextMenu: true, // 禁止默认右键菜单
          enableRetinaScaling: true,
          controlsAboveOverlay: true,
          preserveObjectStacking: true,
        });
      };

      (fabricRef as MutableRefObject<fabric.Canvas | null>).current = initMainCanvas();

      // Activate drawing mode for mask overlay
      if(fabricRef.current) 
      {
        fabricRef.current.isDrawingMode = settings.showDrawing;
        fabricRef.current.freeDrawingBrush.width = DEFAULT_BRUSH_SIZE;
        fabricRef.current.freeDrawingBrush.color = hexToRgba(BRUSH_COLOR);
        fabricRef.current?.zoomToPoint({x: fabricRef.current?.width / 2, y: fabricRef.current?.height / 2}, zoomLevel);
        setZoomLevel(fabricRef.current.getZoom())
      }

      // modify around image contour
      fabric.Object.prototype.set({
        transparentCorners: false,
        borderColor: "#51B9F9",
        cornerColor: "yellow",
        borderScaleFactor: 2.5,
        cornerStyle: "rect",
        cornerStrokeColor: "#0E98FC",
        borderOpacityWhenMoving: 1,
      });

      //################DELETE SECTION#########################
      //const eraseBgIcon = "data:image/svg+xml,%3C%3Fxml version='1.0' encoding='utf-8'%3F%3E%3C!DOCTYPE svg PUBLIC '-//W3C//DTD SVG 1.1//EN' 'http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd'%3E%3Csvg version='1.1' id='Ebene_1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' x='0px' y='0px' width='595.275px' height='595.275px' viewBox='200 215 230 470' xml:space='preserve'%3E%3Ccircle style='fill:%23F44336;' cx='299.76' cy='439.067' r='218.516'/%3E%3Cg%3E%3Crect x='267.162' y='307.978' transform='matrix(0.7071 -0.7071 0.7071 0.7071 -222.6202 340.6915)' style='fill:white;' width='65.545' height='262.18'/%3E%3Crect x='266.988' y='308.153' transform='matrix(0.7071 0.7071 -0.7071 0.7071 398.3889 -83.3116)' style='fill:white;' width='65.544' height='262.179'/%3E%3C/g%3E%3C/svg%3E";
      const eraseBgIcon =
        'data:image/svg+xml,%3Csvg height="200px" width="200px" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 512 512" xml:space="preserve" fill="%23000000"%3E%3Cg id="SVGRepo_bgCarrier" stroke-width="0"%3E%3C/g%3E%3Cg id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"%3E%3C/g%3E%3Cg id="SVGRepo_iconCarrier"%3E%3Cg transform="translate(0 1)"%3E%3Cpolygon style="fill:%233D83F3;" points="34.712,502.322 477.288,502.322 477.288,7.678 34.712,7.678 "%3E%3C/polygon%3E%3Cpolygon style="fill:%23315ED8;" points="477.288,502.322 503.322,502.322 503.322,7.678 477.288,7.678 "%3E%3C/polygon%3E%3Cpolygon style="fill:%23FFFFFF;" points="8.678,502.322 34.712,502.322 34.712,7.678 8.678,7.678 "%3E%3C/polygon%3E%3Cpath d="M512,511H0V120.492c0-5.207,3.471-8.678,8.678-8.678s8.678,3.471,8.678,8.678v373.153h477.288v-78.102 c0-5.207,3.471-8.678,8.678-8.678c5.207,0,8.678,3.471,8.678,8.678V511z"%3E%3C/path%3E%3Cpath d="M503.322,346.119c-5.207,0-8.678-3.471-8.678-8.678V16.356H17.356v34.712c0,5.207-3.471,8.678-8.678,8.678 S0,56.275,0,51.068V-1h512v338.441C512,342.647,508.529,346.119,503.322,346.119z"%3E%3C/path%3E%3Cpath d="M17.356,85.78c0-5.207-3.471-8.678-8.678-8.678S0,80.573,0,85.78c0,5.207,3.471,8.678,8.678,8.678 S17.356,90.986,17.356,85.78"%3E%3C/path%3E%3Cpath d="M503.322,389.508c-5.207,0-8.678-3.471-8.678-8.678v-8.678c0-5.207,3.471-8.678,8.678-8.678 c5.207,0,8.678,3.471,8.678,8.678v8.678C512,386.037,508.529,389.508,503.322,389.508z"%3E%3C/path%3E%3Cpath style="fill:%23FFE100;" d="M395.715,178.634L303.729,85.78c-8.678-8.678-22.563-8.678-31.241,0L69.424,288.844 c-8.678,8.678-8.678,22.563,0,31.241l73.763,72.895l56.407,13.885l196.122-196.99C404.393,201.197,404.393,187.312,395.715,178.634 "%3E%3C/path%3E%3Cpath style="fill:%23FF8800;" d="M395.715,178.634c8.678,8.678,8.678,22.563,0,31.241l-196.122,196.99h27.77l183.105-183.105 c8.678-8.678,8.678-22.563,0-31.241L395.715,178.634z"%3E%3C/path%3E%3Cpath d="M308.936,333.969c-2.603,0-4.339-0.868-6.075-2.603L167.485,195.99c-3.471-3.471-3.471-8.678,0-12.149 c3.471-3.471,8.678-3.471,12.149,0L315.01,319.217c3.471,3.471,3.471,8.678,0,12.149 C313.275,333.102,311.539,333.969,308.936,333.969z"%3E%3C/path%3E%3Cpath d="M230.834,415.542h-76.366L66.82,327.895c-6.075-6.075-8.678-13.885-8.678-21.695s3.471-15.62,8.678-21.695L269.017,83.176 c12.149-12.149,31.241-12.149,43.39,0l104.136,104.136c6.075,6.075,8.678,13.885,8.678,21.695s-3.471,15.62-8.678,21.695 L230.834,415.542z M161.41,398.186h62.481l180.502-180.502c2.603-2.603,3.471-6.075,3.471-9.546c0-3.471-1.736-6.942-3.471-9.546 l0,0L300.258,94.458c-5.207-5.207-13.885-5.207-19.092,0L78.969,297.522c-2.603,2.603-3.471,6.075-3.471,9.546 c0,3.471,1.736,6.942,3.471,9.546L161.41,398.186z"%3E%3C/path%3E%3Cpath d="M433.898,415.542H286.373c-5.207,0-8.678-3.471-8.678-8.678s3.471-8.678,8.678-8.678h147.525 c5.207,0,8.678,3.471,8.678,8.678S439.105,415.542,433.898,415.542z"%3E%3C/path%3E%3C/g%3E%3C/g%3E%3C/svg%3E';
      const img_rembg = document.createElement("img");
      img_rembg.src = eraseBgIcon;

      // otro icon
      const cropIcon =
        "data:image/svg+xml,%3Csvg height='200px' width='200px' version='1.1' id='Layer_1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' viewBox='0 0 512.002 512.002' xml:space='preserve' fill='%23000000'%3E%3Cg id='SVGRepo_bgCarrier' stroke-width='0'%3E%3C/g%3E%3Cg id='SVGRepo_tracerCarrier' stroke-linecap='round' stroke-linejoin='round'%3E%3C/g%3E%3Cg id='SVGRepo_iconCarrier'%3E%3Cpath style='fill:%23E6E6E6;' d='M330.391,299.581l-64.844,40.281l-139.48-224.536C103.82,79.513,114.818,32.447,150.63,10.2l0,0 L330.391,299.581z'%3E%3C/path%3E%3Cpath style='fill:%23E8655A;' d='M330.196,299.702l-64.65,40.16l78.278,126.013c22.18,35.706,69.105,46.669,104.809,24.49l0,0 c35.706-22.18,46.669-69.105,24.49-104.809l-38.118-61.362C412.826,288.488,365.901,277.523,330.196,299.702z M436.024,402.695 c10.36,16.678,5.239,38.596-11.439,48.955l0,0c-16.678,10.36-38.596,5.239-48.956-11.439l-32.824-52.841 c-10.36-16.678-5.239-38.596,11.439-48.955l0,0c16.678-10.36,38.596-5.239,48.955,11.439L436.024,402.695z'%3E%3C/path%3E%3Cpath style='fill:%23E6E6E6;' d='M181.61,299.581l64.844,40.281l139.48-224.536C408.18,79.513,397.183,32.447,361.37,10.2l0,0 L181.61,299.581z'%3E%3C/path%3E%3Cpath style='fill:%23E8655A;' d='M76.995,324.192l-38.118,61.362c-22.18,35.706-11.215,82.63,24.49,104.809l0,0 c35.706,22.18,82.63,11.215,104.809-24.49l78.278-126.013l-64.65-40.16C146.1,277.523,99.174,288.488,76.995,324.192z M108.801,349.855c10.36-16.678,32.278-21.799,48.956-11.439l0,0c16.678,10.36,21.799,32.278,11.439,48.955l-32.824,52.841 c-10.36,16.678-32.278,21.799-48.956,11.439l0,0c-16.678-10.36-21.799-32.278-11.439-48.955L108.801,349.855z'%3E%3C/path%3E%3Cg%3E%3Cpath style='fill:%23603813;' d='M218.398,160.423l-3.71-5.971c-2.97-4.784-9.259-6.254-14.046-3.281 c-4.785,2.973-6.254,9.261-3.281,14.046l3.71,5.971c1.932,3.109,5.263,4.818,8.674,4.818c1.837,0,3.697-0.497,5.373-1.537 C219.902,171.496,221.37,165.207,218.398,160.423z'%3E%3C/path%3E%3Cpath style='fill:%23603813;' d='M481.787,380.172l-38.118-61.362c-23.248-37.425-70.666-50.855-109.652-32.721l-21.076-33.929 l81.657-131.452c25.179-40.533,12.687-93.992-27.846-119.172c-2.297-1.427-5.067-1.883-7.703-1.268 c-2.635,0.616-4.915,2.252-6.343,4.55L256,160.497L159.294,4.818c-1.427-2.298-3.709-3.934-6.343-4.55 c-2.634-0.616-5.406-0.159-7.703,1.268c-40.532,25.179-53.024,78.639-27.846,119.172l81.658,131.453l-21.076,33.929 c-38.986-18.135-86.405-4.705-109.652,32.721l-38.118,61.362C5.102,420.599,17.56,473.917,57.986,499.029 c14.142,8.785,29.862,12.972,45.402,12.972c28.878,0,57.129-14.461,73.455-40.744l78.277-126.012l0.882-1.421l0.882,1.421 l78.277,126.012c16.328,26.285,44.574,40.744,73.455,40.744c15.536,0,31.26-4.188,45.401-12.972 C494.441,473.916,506.899,420.598,481.787,380.172z M316.344,296.299l-38.522,23.93l-8.993,5.586l-0.821-1.322l32.926-53.004 L316.344,296.299z M134.731,109.944c-10.809-17.401-12.527-37.917-6.473-55.971l50.651,81.539c1.932,3.11,5.263,4.819,8.674,4.819 c1.837,0,3.696-0.497,5.372-1.537c4.785-2.973,6.256-9.261,3.282-14.046l-56.73-91.324c2.461-3.045,5.216-5.897,8.255-8.509 l96.23,154.913l-32.926,53.004L134.731,109.944z M364.238,24.915c3.039,2.613,5.795,5.464,8.255,8.509l-38.222,61.53 c-2.973,4.785-1.503,11.074,3.282,14.046c1.676,1.041,3.535,1.537,5.372,1.537c3.411,0,6.742-1.709,8.674-4.819l32.144-51.746 c6.055,18.054,4.336,38.57-6.473,55.971L243.171,325.815l-47.515-29.516L364.238,24.915z M159.513,460.492 c-12.469,20.072-34.04,31.116-56.094,31.114c-11.864,0-23.872-3.198-34.67-9.906c-30.87-19.177-40.383-59.892-21.207-90.763 l38.118-61.362c19.177-30.871,59.892-40.384,90.763-21.207l55.985,34.777L159.513,460.492z M443.252,481.7 c-30.873,19.177-71.589,9.661-90.764-21.207l-72.894-117.348l55.985-34.777c30.871-19.177,71.587-9.662,90.763,21.207 l38.118,61.362C483.634,421.807,474.121,462.523,443.252,481.7z'%3E%3C/path%3E%3Cpath style='fill:%23603813;' d='M411.864,344.472c-6.448-10.38-16.553-17.628-28.452-20.409c-11.899-2.781-24.169-0.761-34.55,5.687 c-21.429,13.312-28.032,41.575-14.721,63.002l32.824,52.841c8.655,13.933,23.628,21.598,38.937,21.597 c8.235,0,16.57-2.219,24.065-6.876c21.429-13.312,28.032-41.575,14.721-63.002L411.864,344.472z M419.203,442.986 c-11.874,7.375-27.532,3.718-34.911-8.158l-32.824-52.841c-7.374-11.874-3.717-27.533,8.157-34.909 c4.067-2.526,8.657-3.826,13.328-3.826c1.935,0,3.885,0.223,5.816,0.674c6.593,1.541,12.192,5.557,15.765,11.309l32.825,52.841 C434.735,419.951,431.077,435.611,419.203,442.986z'%3E%3C/path%3E%3Cpath style='fill:%23603813;' d='M163.138,329.751c-10.379-6.447-22.649-8.469-34.55-5.687c-11.899,2.78-22.003,10.028-28.451,20.408 l-32.825,52.841C54,418.74,60.605,447.003,82.033,460.315c7.497,4.656,15.829,6.876,24.065,6.876 c15.308,0,30.282-7.666,38.937-21.597l32.824-52.841C191.171,371.325,184.566,343.063,163.138,329.751z M160.531,381.988 l-32.824,52.841c-7.377,11.876-23.037,15.532-34.911,8.158c-11.874-7.375-15.532-23.035-8.157-34.909l32.825-52.841l0,0 c3.573-5.752,9.172-9.767,15.765-11.308c1.933-0.451,3.881-0.674,5.816-0.674c4.671,0,9.261,1.299,13.328,3.826 C164.247,354.456,167.906,370.116,160.531,381.988z'%3E%3C/path%3E%3Cpath style='fill:%23603813;' d='M257.295,266.804c5.632,0,10.2-4.566,10.2-10.2v-9.115c0-5.633-4.568-10.2-10.2-10.2 c-5.632,0-10.2,4.566-10.2,10.2v9.115C247.095,262.237,251.663,266.804,257.295,266.804z'%3E%3C/path%3E%3C/g%3E%3C/g%3E%3C/svg%3E";
      const cropImg = document.createElement("img");
      cropImg.src = cropIcon;

      // delete icon
      const deleteIcon =
        "data:image/svg+xml,%3Csvg viewBox='0 0 1024 1024' class='icon' version='1.1' xmlns='http://www.w3.org/2000/svg' fill='%23000000'%3E%3Cg id='SVGRepo_bgCarrier' stroke-width='0'%3E%3C/g%3E%3Cg id='SVGRepo_tracerCarrier' stroke-linecap='round' stroke-linejoin='round'%3E%3C/g%3E%3Cg id='SVGRepo_iconCarrier'%3E%3Cpath d='M724.3 198H296.1l54.1-146.6h320z' fill='%23FAFCFB'%3E%3C/path%3E%3Cpath d='M724.3 216.5H296.1c-6.1 0-11.7-3-15.2-7.9-3.5-5-4.3-11.3-2.2-17L332.8 45c2.7-7.3 9.6-12.1 17.4-12.1h320c7.7 0 14.7 4.8 17.4 12.1l54.1 146.6c2.1 5.7 1.3 12-2.2 17-3.5 4.9-9.2 7.9-15.2 7.9z m-401.6-37h375.1L657.3 69.9H363.1l-40.4 109.6z' fill='%230F0F0F'%3E%3C/path%3E%3Cpath d='M664.3 981.6H339.7c-54.2 0-98.5-43.3-99.6-97.5L223.7 235h572.9l-32.8 651.4c-2.3 53.2-46.1 95.2-99.5 95.2z' fill='%239DC6AF'%3E%3C/path%3E%3Cpath d='M664.3 995H339.7c-29.7 0-57.8-11.4-79-32.2-21.2-20.8-33.3-48.6-34-78.3L210 221.6h600.7L777.2 887c-2.6 60.5-52.2 108-112.9 108zM237.4 248.3l16 635.5c0.5 22.7 9.7 44 25.9 59.8 16.2 15.9 37.7 24.6 60.4 24.6h324.6c46.3 0 84.2-36.2 86.2-82.5l32.1-637.4H237.4z' fill='%23191919'%3E%3C/path%3E%3Cpath d='M827.1 239.5H193.3c-22.2 0-40.4-18.2-40.4-40.4v-2.2c0-22.2 18.2-40.4 40.4-40.4h633.8c22.2 0 40.4 18.2 40.4 40.4v2.2c0 22.2-18.2 40.4-40.4 40.4z' fill='%23D39E33'%3E%3C/path%3E%3Cpath d='M826 252.9H194.4c-30.3 0-54.9-24.6-54.9-54.9 0-30.3 24.6-54.9 54.9-54.9H826c30.3 0 54.9 24.6 54.9 54.9s-24.7 54.9-54.9 54.9z m-631.6-83.1c-15.5 0-28.2 12.6-28.2 28.2s12.6 28.2 28.2 28.2H826c15.5 0 28.2-12.6 28.2-28.2 0-15.5-12.6-28.2-28.2-28.2H194.4z' fill='%23111111'%3E%3C/path%3E%3Cpath d='M354.6 430.3v369.6' fill='%23FAFCFB'%3E%3C/path%3E%3Cpath d='M354.6 813.3c-7.4 0-13.4-6-13.4-13.4V430.3c0-7.4 6-13.4 13.4-13.4s13.4 6 13.4 13.4v369.6c-0.1 7.4-6 13.4-13.4 13.4z' fill='%230F0F0F'%3E%3C/path%3E%3Cpath d='M458.3 430.3v369.6' fill='%23FAFCFB'%3E%3C/path%3E%3Cpath d='M458.3 813.3c-7.4 0-13.4-6-13.4-13.4V430.3c0-7.4 6-13.4 13.4-13.4s13.4 6 13.4 13.4v369.6c0 7.4-6 13.4-13.4 13.4z' fill='%230F0F0F'%3E%3C/path%3E%3Cpath d='M562.1 430.3v369.6' fill='%23FAFCFB'%3E%3C/path%3E%3Cpath d='M562.1 813.3c-7.4 0-13.4-6-13.4-13.4V430.3c0-7.4 6-13.4 13.4-13.4s13.4 6 13.4 13.4v369.6c-0.1 7.4-6.1 13.4-13.4 13.4z' fill='%230F0F0F'%3E%3C/path%3E%3Cpath d='M665.8 430.3v369.6' fill='%23FAFCFB'%3E%3C/path%3E%3Cpath d='M665.8 813.3c-7.4 0-13.4-6-13.4-13.4V430.3c0-7.4 6-13.4 13.4-13.4s13.4 6 13.4 13.4v369.6c0 7.4-6 13.4-13.4 13.4z' fill='%230F0F0F'%3E%3C/path%3E%3C/g%3E%3C/svg%3E";
      const deleteImg = document.createElement("img");
      deleteImg.src = deleteIcon;

      function renderIconCorner(icon) {
        return function renderIcon(
          ctx,
          left,
          top,
          styleOverride,
          fabricObject,
        ) {
          var size = this.cornerSize;
          ctx.save();
          ctx.translate(left, top);
          ctx.rotate(fabric.util.degreesToRadians(fabricObject.angle));
          ctx.drawImage(icon, -size / 2, -size / 2, size, size);
          ctx.restore();
        };
      }
      fabric.Object.prototype.controls.removeBg = new fabric.Control({
        x: -0.48,
        y: -0.41,
        offsetY: 16,
        cursorStyle: "pointer",
        mouseUpHandler: rmBg,
        render: renderIconCorner(img_rembg),
        cornerSize: 60,
      });
      //########### END delete section

      fabric.Object.prototype.controls.crop = new fabric.Control({
        x: -0.48,
        y: -0.48,
        offsetY: 16,
        cursorStyle: "pointer",
        mouseUpHandler: drawCropRect,
        render: renderIconCorner(cropImg),
        cornerSize: 60,
      });

      fabric.Object.prototype.controls.delete = new fabric.Control({
        x: 0.5,
        y: -0.48,
        offsetY: 16,
        cursorStyle: "pointer",
        mouseUpHandler: deleteObject,
        render: renderIconCorner(deleteImg),
        cornerSize: 60,
      });

      // Event listener for panning
      fabricRef.current?.on("mouse:up",stopPanning);

      fabricRef.current?.on("mouse:down",startPanning);

      fabricRef.current?.on("mouse:move", panCanvas);

      fabricRef.current?.on("path:created", () => {
        saveState();
      });

      fabricRef.current?.on('mouse:wheel', function(opt) {
        const delta = opt.e.deltaY;
        let zoom = fabricRef.current?.getZoom();
        zoom *= (0.999 ** delta);
        if (zoom > 20) zoom = 20;
        if (zoom < 0.01) zoom = 0.01;
        console.log(fabricRef.current?.width, fabricRef.current?.height)
        fabricRef.current?.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
        opt.e.preventDefault();
        opt.e.stopPropagation();
      });


      // #### DISPOSE
      return () => {
        fabricRef.current?.dispose();
      };
    }, []);

    useEffect(() => {
      // Your existing useEffect logic
      if(!fabricRef.current) return;

      const handleAfterRender = (e) => {

        // console.log("aspect ratio on render")
        const { ctx } = e;
        const fillStyle = "rgba(0, 0, 0, 0.7)";
        const width = fabricRef.current?.width ?? 0;
        const height = fabricRef.current?.height ?? 0;
  
        if (ctx) {
          ctx.save();
          // Clear only the specific area where the dark overlay was applied
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(width, 0);
          ctx.lineTo(width, height);
          ctx.lineTo(0, height);
          ctx.closePath();
  
          // Apply the viewport transformation
          ctx.transform.apply(ctx, Array.from(fabricRef.current.viewportTransform));
  
          // Adjust clipping area based on the aspect ratio
          let clipWidth, clipHeight, scale;

          const [ratioWidth, ratioHeight] = aspectRatio.split(':').map(Number);
  
          if (ratioWidth >= ratioHeight) {
            clipWidth = width;
            scale = (ratioHeight / ratioWidth)
            clipHeight = width * scale;
          } else {
            clipHeight = height;
            scale = (ratioWidth / ratioHeight)
            clipWidth = height * scale;
          }
          // console.log("clip width", clipWidth, "clip height", clipHeight, "scale", scale)

          updateAppState({ scaledWidth: clipWidth, scaledHeight: clipHeight });
  
          const clipX = (width - clipWidth) / 2;
          const clipY = (height - clipHeight) / 2;
  
          ctx.moveTo(clipX, clipY);
          ctx.lineTo(clipX, clipY + clipHeight);
          ctx.lineTo(clipX + clipWidth, clipY + clipHeight);
          ctx.lineTo(clipX + clipWidth, clipY);
          ctx.closePath();
          ctx.fillStyle = fillStyle;
          ctx.fill();
          ctx.restore();
        }
      }

      // Attach the event listener
    fabricRef.current.on("after:render", handleAfterRender);

      return () => {
        if (fabricRef.current) {
          fabricRef.current.off("after:render", handleAfterRender);
        }
      };

    }, [aspectRatio])

    const stopPanning = useCallback((opt: fabric.IEvent<MouseEvent>) => {
      if (isMidClick(opt)) {
      isDragging.current = false;
      }
    }, []);

    const startPanning = useCallback((opt: fabric.IEvent<MouseEvent>) => {
      if (isMidClick(opt)) {
        const evt = opt.e;
        isDragging.current = true;
        lastPosX.current = evt.clientX;
        lastPosY.current = evt.clientY;
      }
    }, []);
  
    const panCanvas = useCallback((opt: fabric.IEvent<MouseEvent>) => {
      if (isDragging.current) {
        if(!fabricRef.current) return;
        const e = opt.e;
        const vpt = fabricRef.current.viewportTransform;
        vpt[4] += e.clientX - lastPosX.current;
        vpt[5] += e.clientY - lastPosY.current;
        fabricRef.current.requestRenderAll();
        lastPosX.current = e.clientX;
        lastPosY.current = e.clientY;
      }
    }, [fabricRef.current]);

    // useEffect(() => {
    //   // Your existing useEffect logic
    //   if(!fabricRef.current) return;
    //   console.log("zoom level")
    //   const width = fabricRef.current.width ?? 1024;
    //   const height = fabricRef.current.height ?? 1024
    //   fabricRef.current.zoomToPoint({ x: width / 2, y: height / 2 },zoomLevel);
    // }, [zoomLevel])


        // useEffect(() => {
    //   if (!fabricRef.current) return;

    //   const render = renders[renders.length - 1];

    //   const img = new fabric.Image(render, {
    //     left: 0,
    //     top: 0,
    //   });

    //   // Clear the canvas
    //   fabricRef.current.clear();
    //   fabricRef.current.add(img);
    //   saveState();
    //   fabricRef.current.renderAll();
    // }, [renders]);

    // COMING RENDERS FROM BACKEND
    // useEffect(() => {
    //   if (!fabricRef.current) return;

    //   const render = renders[renders.length - 1];

    //   const img = new fabric.Image(render, {
    //     left: 0,
    //     top: 0,
    //   });

    //   // Clear the canvas
    //   fabricRef.current.clear();
    //   fabricRef.current.add(img);
    //   saveState();
    //   fabricRef.current.renderAll();
    // }, [renders]);

    // REDO / UNDO ACTION
    // useEffect(() => {
    //   if (!fabricRef.current) return;
    //   if (currCanvasGroups.length === 0) return;
    //   const state = JSON.parse(currCanvasGroups[currCanvasGroups.length - 1]);
    //   // console.log(currCanvasGroups[currCanvasGroups.length - 1])
    //   fabricRef.current.loadFromJSON(
    //     state,
    //     fabricRef.current.renderAll.bind(fabricRef.current),
    //   );
    // }, [currCanvasGroups]);

    // CHANGE BRUSH SIZE
    useEffect(() => {
      if (!fabricRef.current) return;
      fabricRef.current.freeDrawingBrush.width = baseBrushSize;
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

    const getCurrentWidthHeight = useCallback(() => {
      let width = 512;
      let height = 512;
      if (!isOriginalLoaded) {
        return [width, height];
      }
      if (renders.length === 0) {
        width = original.naturalWidth;
        height = original.naturalHeight;
      } else if (renders.length !== 0) {
        width = renders[renders.length - 1].width;
        height = renders[renders.length - 1].height;
      }

      return [width, height];
    }, [original, isOriginalLoaded, renders]);


    // useEffect(() => {
    //   console.log("[useEffect] centerView");
    //   // render 改变尺寸以后，undo/redo 重新 center
    //   viewportRef?.current?.centerView(minScale, 1);
    // }, [imageHeight, imageWidth, viewportRef, minScale]);

    // Zoom reset
    const resetZoom = useCallback(() => {
      console.log("called zoom")
      if (fabricRef.current) {
        fabricRef.current.zoomToPoint({ x: fabricRef.current.width / 2, y: fabricRef.current.height / 2 }, zoomLevel);
        fabricRef.current.setViewportTransform([1, 0, 0, 1, 0, 0]); // Reset panning
        fabricRef.current.requestRenderAll();
      }
      // if (!minScale || !windowSize) {
      //   return;
      // }
      // const viewport = viewportRef.current;
      // if (!viewport) {
      //   return;
      // }
      // const offsetX = (windowSize.width - imageWidth * minScale) / 2;
      // const offsetY = (windowSize.height - imageHeight * minScale) / 2;
      // viewport.setTransform(offsetX, offsetY, minScale, 200, "easeOutQuad");
      // if (viewport.instance.transformState.scale) {
      //   viewport.instance.transformState.scale = minScale;
      // }

      // setScale(minScale);
      // setPanned(false);
    }, [
      // viewportRef,
      // windowSize,
      // imageHeight,
      // imageWidth,
      // windowSize.height,
      // minScale,
    ]);

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

    const downloadCanvas = (
      canvas: Canvas,
      objectsToShow: FabricObject[],
      filename: string,
    ) => {
      // Hide all objects first
      canvas.getObjects().forEach((obj) => obj.set({ visible: false }));

      // Show only the specified objects
      objectsToShow.forEach((obj) => obj.set({ visible: true }));

      // Render and download the canvas
      canvas.renderAll();
      const link = document.createElement("a");
      link.href = canvas.toDataURL({ format: "png" });
      link.download = filename;
      link.click();

      // Reset the visibility of all objects
      canvas.getObjects().forEach((obj) => obj.set({ visible: true }));
      canvas.renderAll();
    };

    const download = (chooseObject:string) => {
      const canvas = fabricRef.current;
      if (canvas) {
        const imageObjects = canvas
          .getObjects()
          .filter((obj) => obj.type === chooseObject);
        downloadCanvas(canvas, imageObjects, `${chooseObject}.png`);
      }
    };

    useHotKey("meta+s,ctrl+s", download);

    const toggleShowBrush = (newState: boolean) => {
      if (newState !== showBrush && !isPanning && !isCropperExtenderResizing) {
        setShowBrush(newState);
      }
    };

    const getCursor = useCallback(() => {
      if (isProcessing) {
        return "default";
      }
      if (isPanning) {
        return "grab";
      }
      if (showBrush) {
        return "none";
      }
      return undefined;
    }, [showBrush, isPanning, isProcessing]);

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

    const getCurScale = (): number => {
      let s = minScale;
      if (viewportRef.current?.instance?.transformState.scale !== undefined) {
        s = viewportRef.current?.instance?.transformState.scale;
      }
      return s!;
    };

    const getBrushStyle = (_x: number, _y: number) => {
      const curScale = getCurScale();
      return {
        width: `${brushSize * curScale}px`,
        height: `${brushSize * curScale}px`,
        left: `${_x}px`,
        top: `${_y}px`,
        transform: "translate(-50%, -50%)",
      };
    };

    const renderBrush = (style: any) => {
      return (
        <div
          className="absolute rounded-[50%] border-[1px] border-[solid] border-[#ffcc00] pointer-events-none bg-[#ffcc00bb]"
          style={style}
        />
      );
    };

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

            <div className="relative top-[60px] bg-stone-600">
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
                  border: `1px solid white`,
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

    const handleScroll = (event: React.WheelEvent<HTMLDivElement>) => {
      // deltaY 是垂直滚动增量，正值表示向下滚动，负值表示向上滚动
      // deltaX 是水平滚动增量，正值表示向右滚动，负值表示向左滚动
      if (!isChangingBrushSizeByWheel) {
        return;
      }

      const { deltaY } = event;
      // console.log(`水平滚动增量: ${deltaX}, 垂直滚动增量: ${deltaY}`)
      if (deltaY > 0) {
        increaseBaseBrushSize();
      } else if (deltaY < 0) {
        decreaseBaseBrushSize();
      }
    };

      // kind of work 
    // const handleDownload = () => {

    //   const clipX = (fabricRef.current.width - scaledWidth) / 2;
    //   const clipY = (fabricRef.current.height - scaledHeight) / 2;
  
    //   const tempCanvas = new fabric.Canvas(null, {
    //     width: scaledWidth,
    //     height: scaledHeight,
    //   });
  
    //   fabricRef.current.getObjects().forEach((obj) => {
    //     const clone = fabric.util.object.clone(obj);
    //     clone.set({
    //       left: clone.left - clipX,
    //       top: clone.top - clipY,
    //     });
    //     tempCanvas.add(clone);
    //   });
  
    //   tempCanvas.renderAll();
    //   const dataURL = tempCanvas.toDataURL({
    //     format: 'png',
    //     quality: 1,
    //   });
  
    //   const link = document.createElement('a');
    //   link.href = dataURL;
    //   link.download = 'canvas.png';
    //   document.body.appendChild(link);
    //   link.click();
    //   document.body.removeChild(link);
    // };
    const handleDownload = () => {

      const predefinedRatio = predefinedRatios.find(ratio => ratio.name === aspectRatio);
      console.log(predefinedRatio)
      if (!predefinedRatio) {
        console.error("Invalid aspect ratio");
        return;
      }

      const { width: outputWidth, height: outputHeight } = predefinedRatio;

      const clipX = (fabricRef.current.width - scaledWidth) / 2;
      const clipY = (fabricRef.current.height - scaledHeight) / 2;
  
      const tempCanvas = new fabric.Canvas(null, {
        width: outputWidth,
        height: outputHeight,
      });
  
      const scaleX = outputWidth / scaledWidth;
      const scaleY = outputHeight / scaledHeight;
  
      fabricRef.current.getObjects().forEach((obj) => {
        const clone = fabric.util.object.clone(obj);
        clone.set({
          left: (clone.left - clipX) * scaleX,
          top: (clone.top - clipY) * scaleY,
          scaleX: clone.scaleX * scaleX,
          scaleY: clone.scaleY * scaleY,
        });
        tempCanvas.add(clone);
      });
  
      tempCanvas.renderAll();
      const dataURL = tempCanvas.toDataURL({
        format: 'png',
        quality: 1,
      });
  
      const link = document.createElement('a');
      link.href = dataURL;
      link.download = 'canvas.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    const handleDrawingMode = (value: boolean) => {
      const fabricInstance = fabricRef.current;
      if (fabricInstance) {
        fabricInstance.isDrawingMode = value;
      }
    };

    return (
      <div
        className="flex w-screen h-screen justify-center items-center"
        aria-hidden="true"
        // onMouseMove={onMouseMove}
        // onMouseUp={onPointerUp}
        // onWheel={handleScroll}
      >
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
              onClick={() => handleDownload()}
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

            {/* {settings.enableManualInpainting &&
          settings.model.model_type === "inpaint" ? (
            <IconButton
              tooltip="Run Inpainting"
              disabled={
                isProcessing || (!hadDrawSomething() && extraMasks.length === 0)
              }
              onClick={() => {
                runInpainting();
              }}
            >
              <Eraser />
            </IconButton>
          ) : (
            <></>
          )} */}
          </div>
        </div>
      </div>
    );
  },
);

export default Editor;
