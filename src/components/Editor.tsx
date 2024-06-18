import React, {
  SyntheticEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
  ForwardedRef,
  MutableRefObject
} from "react";

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
import { Eraser, Eye, Redo, Undo, Expand, Download } from "lucide-react";
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
  applySegmentationMask
} from '@imgly/background-removal';

import {
  loadImage,
} from "@/lib/utils";
const TOOLBAR_HEIGHT = 200;
const COMPARE_SLIDER_DURATION_MS = 300;

type EditorProps = {
  fabricRef: MutableRefObject<fabric.Canvas | null>
  file: File;
}

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
  device: 'cpu',
  // device: 'cpu',
  // model: 'isnet',
  // model: 'isnet_fp16',
  // model: 'isnet_quint8',
  output: {
    quality: 0.8,
    format: 'image/png'
    // format: 'image/jpeg'
    // format: 'image/webp'
    //format: 'image/x-rgba8'
    //format: 'image/x-alpha8'
  }
};

const Editor = React.forwardRef(
  ({ fabricRef, file }: EditorProps, ref: ForwardedRef<HTMLCanvasElement>) => { 

    if (typeof ref === 'function') {
      throw new Error(
        `Only React Refs that are created with createRef or useRef are supported`
      )
    }

  const { toast } = useToast();

  const [
    disableShortCuts,
    windowSize,
    isInpainting,
    imageWidth,
    imageHeight,
    settings,
    enableAutoSaving,
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
    state.windowSize,
    state.isInpainting,
    state.imageWidth,
    state.imageHeight,
    state.settings,
    state.serverConfig.enableAutoSaving,
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
  const [original, isOriginalLoaded] = useImage(file);
  const [context, setContext] = useState<CanvasRenderingContext2D>();
  const [imageContext, setImageContext] = useState<CanvasRenderingContext2D>();
  //
  const [initCanvasState, SetInitCanvasState] = useState<string | null>(null);

  const [{ x, y }, setCoords] = useState({ x: -1, y: -1 });
  const [showBrush, setShowBrush] = useState(false);
  const [showRefBrush, setShowRefBrush] = useState(false);
  const [isPanning, setIsPanning] = useState<boolean>(false);

  const [scale, setScale] = useState<number>(1);
  const [panned, setPanned] = useState<boolean>(false);
  const [minScale, setMinScale] = useState<number>(1.0);
  const windowCenterX = windowSize.width / 2;
  const windowCenterY = windowSize.height / 2;
  const viewportRef = useRef<ReactZoomPanPinchContentRef | null>(null);

  // Indicates that the image has been loaded and is centered on first load
  const [initialCentered, setInitialCentered] = useState(false);

  const [isDraging, setIsDraging] = useState(false);

  const [isCropping, setIsCropping] = useState(false);
  const [activeObject, setActiveObject] = useState<FabricObject | null> (null)


  const [sliderPos, setSliderPos] = useState<number>(0);
  const [isChangingBrushSizeByWheel, setIsChangingBrushSizeByWheel] =
    useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cropperCanvasRef = useRef<HTMLCanvasElement | null>(null);
  // crop
  const lastActiveObject = useRef<fabric.Object | null>(null);
  const rectangleCut = useRef<fabric.Object | null>(null);

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

  // FUNCTION TO CALL WHEN REMOVE BACKGROUND OF SPECIFIC IMAGE 
  const rmBg = (
    eventData: fabric.IEvent<MouseEvent>,
    transform: { target: fabric.Object }
  ): void => {
    const target = transform.target;
    console.log(target)
    removeBackground(target.src, config).then((blob: Blob) => {
      // The result is a blob encoded as PNG. It can be converted to an URL to be used as HTMLImage.src
      const url = URL.createObjectURL(blob);
      const newRender = new Image();
      loadImage(newRender, url)
      .then(() => {
        console.log(newRender)
        const canvas = target.canvas;
        canvas?.remove(target);
        const img_without_background = new fabric.Image(newRender, {
          left: 0,
          top: 0,
        });
        canvas?.add(img_without_background);
        canvas?.requestRenderAll();
      })
      
    }) 
  };


    function cropImage() {

      if (!fabricRef.current || !lastActiveObject.current || !rectangleCut.current)  return
      
      console.log(lastActiveObject.current)
      console.log(rectangleCut.current)

      let height = parseInt(lastActiveObject.current.height * lastActiveObject.current.scaleY); // default height
      let width = parseInt(lastActiveObject.current.width * lastActiveObject.current.scaleX); // default width
      let top = lastActiveObject.current.top; // default top
      let left = lastActiveObject.current.left; // default left

      if (top < rectangleCut.current.top) {
        console.log('case top < rectangular')
        height = height - (rectangleCut.current.top - top);
        top = rectangleCut.current.top;
        console.log(top)
      }

      if (left < rectangleCut.current.left) {
        console.log('case left < rectangular')
        width = width - (rectangleCut.current.left - left);
        left = rectangleCut.current.left;
        console.log(left)
      }

      // validated part
      if (top + height > rectangleCut.current.top + rectangleCut.current.height * rectangleCut.current.scaleY)
      {
        console.log('trim case 1');
        height = rectangleCut.current.top + rectangleCut.current.height * rectangleCut.current.scaleY - top;
      }

      if (left + width > rectangleCut.current.left + rectangleCut.current.width * rectangleCut.current.scaleX)
      {
        console.log('trim case 2')
        width = rectangleCut.current.left + rectangleCut.current.width * rectangleCut.current.scaleX - left;
      }

      //var canvas_crop = new fabric.Canvas("canvas_crop");

      var canvas_crop = new fabric.Canvas(cropperCanvasRef.current, {
      });


      fabricRef.current?.remove(rectangleCut.current)
      rectangleCut.current = null;

      fabric.Image.fromURL(fabricRef.current.toDataURL('png'), function(img) {
        img.set('left', -left);
        img.set('top', -top);
        canvas_crop.add(img)
        canvas_crop.setHeight(height);
        canvas_crop.setWidth(width);
        canvas_crop.renderAll();
        fabric.Image.fromURL(canvas_crop.toDataURL('png'), function(croppedImg) {
          croppedImg.set('left', left);
          croppedImg.set('top', top);
          fabricRef.current?.remove(lastActiveObject.current)
          lastActiveObject.current = null
          fabricRef.current?.add(croppedImg).renderAll();
      });
  });
      //lastActiveObject.current.set({ width: width, left: left, top: top, width: width / lastActiveObject.current.scaleX, height: height / lastActiveObject.current.scaleY});


      //fabricRef.current.renderAll();
}
  // function to crop an image
  const drawCropRect = (
    eventData: fabric.IEvent<MouseEvent>,
    transform: { target: fabric.Object }
  ): void => {
  
    const target = transform.target;
    let selection_object_left = 0;
    let selection_object_top = 0;

    const rectangle = new fabric.Rect({
      fill: 'rgba(0,0,0,0)',
      originX: 'left',
      originY: 'top',
      stroke: '#ccc',
      //strokeDashArray: [2, 2],
      strokeWidth: 1,
      //opacity: 1,
      width: 1,
      height: 1,
      borderColor: '#36fd00',
      cornerColor: 'green',
      hasRotatingPoint: false,
      selectable: true
  });

  const canvas = target.canvas;
  lastActiveObject.current = canvas?.getActiveObject();
  rectangle.left = canvas?.getActiveObject()?.left;
  selection_object_left = canvas?.getActiveObject()?.left;
  selection_object_top = canvas?.getActiveObject()?.top;
  rectangle.top = canvas?.getActiveObject()?.top;
  rectangle.width = canvas?.getActiveObject()?.width * canvas?.getActiveObject()?.scaleX;
  rectangle.height = canvas?.getActiveObject()?.height * canvas?.getActiveObject()?.scaleY;
  rectangleCut.current= rectangle
  canvas?.add(rectangle);
  canvas?.setActiveObject(rectangle);
  }

  useEffect(() => {

    const initMainCanvas = (): Canvas => {
      return new fabric.Canvas(canvasRef.current, {
        fireMiddleClick: true,
      });
    };

    fabricRef.current = initMainCanvas();

    // Activate drawing mode for mask overlay
    fabricRef.current.isDrawingMode = settings.showDrawing;
    fabricRef.current.freeDrawingBrush.width = DEFAULT_BRUSH_SIZE;
    fabricRef.current.freeDrawingBrush.color = hexToRgba(BRUSH_COLOR);

    fabric.Object.prototype.transparentCorners = false;
    fabric.Object.prototype.cornerColor = 'yellow';
    fabric.Object.prototype.cornerStyle = 'circle';

    //################DELETE SECTION#########################
    //const deleteIcon = "data:image/svg+xml,%3C%3Fxml version='1.0' encoding='utf-8'%3F%3E%3C!DOCTYPE svg PUBLIC '-//W3C//DTD SVG 1.1//EN' 'http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd'%3E%3Csvg version='1.1' id='Ebene_1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' x='0px' y='0px' width='595.275px' height='595.275px' viewBox='200 215 230 470' xml:space='preserve'%3E%3Ccircle style='fill:%23F44336;' cx='299.76' cy='439.067' r='218.516'/%3E%3Cg%3E%3Crect x='267.162' y='307.978' transform='matrix(0.7071 -0.7071 0.7071 0.7071 -222.6202 340.6915)' style='fill:white;' width='65.545' height='262.18'/%3E%3Crect x='266.988' y='308.153' transform='matrix(0.7071 0.7071 -0.7071 0.7071 398.3889 -83.3116)' style='fill:white;' width='65.544' height='262.179'/%3E%3C/g%3E%3C/svg%3E";
    const deleteIcon = 'data:image/svg+xml,%3Csvg height="200px" width="200px" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 512 512" xml:space="preserve" fill="%23000000"%3E%3Cg id="SVGRepo_bgCarrier" stroke-width="0"%3E%3C/g%3E%3Cg id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"%3E%3C/g%3E%3Cg id="SVGRepo_iconCarrier"%3E%3Cg transform="translate(0 1)"%3E%3Cpolygon style="fill:%233D83F3;" points="34.712,502.322 477.288,502.322 477.288,7.678 34.712,7.678 "%3E%3C/polygon%3E%3Cpolygon style="fill:%23315ED8;" points="477.288,502.322 503.322,502.322 503.322,7.678 477.288,7.678 "%3E%3C/polygon%3E%3Cpolygon style="fill:%23FFFFFF;" points="8.678,502.322 34.712,502.322 34.712,7.678 8.678,7.678 "%3E%3C/polygon%3E%3Cpath d="M512,511H0V120.492c0-5.207,3.471-8.678,8.678-8.678s8.678,3.471,8.678,8.678v373.153h477.288v-78.102 c0-5.207,3.471-8.678,8.678-8.678c5.207,0,8.678,3.471,8.678,8.678V511z"%3E%3C/path%3E%3Cpath d="M503.322,346.119c-5.207,0-8.678-3.471-8.678-8.678V16.356H17.356v34.712c0,5.207-3.471,8.678-8.678,8.678 S0,56.275,0,51.068V-1h512v338.441C512,342.647,508.529,346.119,503.322,346.119z"%3E%3C/path%3E%3Cpath d="M17.356,85.78c0-5.207-3.471-8.678-8.678-8.678S0,80.573,0,85.78c0,5.207,3.471,8.678,8.678,8.678 S17.356,90.986,17.356,85.78"%3E%3C/path%3E%3Cpath d="M503.322,389.508c-5.207,0-8.678-3.471-8.678-8.678v-8.678c0-5.207,3.471-8.678,8.678-8.678 c5.207,0,8.678,3.471,8.678,8.678v8.678C512,386.037,508.529,389.508,503.322,389.508z"%3E%3C/path%3E%3Cpath style="fill:%23FFE100;" d="M395.715,178.634L303.729,85.78c-8.678-8.678-22.563-8.678-31.241,0L69.424,288.844 c-8.678,8.678-8.678,22.563,0,31.241l73.763,72.895l56.407,13.885l196.122-196.99C404.393,201.197,404.393,187.312,395.715,178.634 "%3E%3C/path%3E%3Cpath style="fill:%23FF8800;" d="M395.715,178.634c8.678,8.678,8.678,22.563,0,31.241l-196.122,196.99h27.77l183.105-183.105 c8.678-8.678,8.678-22.563,0-31.241L395.715,178.634z"%3E%3C/path%3E%3Cpath d="M308.936,333.969c-2.603,0-4.339-0.868-6.075-2.603L167.485,195.99c-3.471-3.471-3.471-8.678,0-12.149 c3.471-3.471,8.678-3.471,12.149,0L315.01,319.217c3.471,3.471,3.471,8.678,0,12.149 C313.275,333.102,311.539,333.969,308.936,333.969z"%3E%3C/path%3E%3Cpath d="M230.834,415.542h-76.366L66.82,327.895c-6.075-6.075-8.678-13.885-8.678-21.695s3.471-15.62,8.678-21.695L269.017,83.176 c12.149-12.149,31.241-12.149,43.39,0l104.136,104.136c6.075,6.075,8.678,13.885,8.678,21.695s-3.471,15.62-8.678,21.695 L230.834,415.542z M161.41,398.186h62.481l180.502-180.502c2.603-2.603,3.471-6.075,3.471-9.546c0-3.471-1.736-6.942-3.471-9.546 l0,0L300.258,94.458c-5.207-5.207-13.885-5.207-19.092,0L78.969,297.522c-2.603,2.603-3.471,6.075-3.471,9.546 c0,3.471,1.736,6.942,3.471,9.546L161.41,398.186z"%3E%3C/path%3E%3Cpath d="M433.898,415.542H286.373c-5.207,0-8.678-3.471-8.678-8.678s3.471-8.678,8.678-8.678h147.525 c5.207,0,8.678,3.471,8.678,8.678S439.105,415.542,433.898,415.542z"%3E%3C/path%3E%3C/g%3E%3C/g%3E%3C/svg%3E'
    const img_rembg = document.createElement('img');
    img_rembg.src = deleteIcon;

    // otro icon
    const cloneIcon = "data:image/svg+xml,%3C%3Fxml version='1.0' encoding='iso-8859-1'%3F%3E%3Csvg version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' viewBox='0 0 55.699 55.699' width='100px' height='100px' xml:space='preserve'%3E%3Cpath style='fill:%23010002;' d='M51.51,18.001c-0.006-0.085-0.022-0.167-0.05-0.248c-0.012-0.034-0.02-0.067-0.035-0.1 c-0.049-0.106-0.109-0.206-0.194-0.291v-0.001l0,0c0,0-0.001-0.001-0.001-0.002L34.161,0.293c-0.086-0.087-0.188-0.148-0.295-0.197 c-0.027-0.013-0.057-0.02-0.086-0.03c-0.086-0.029-0.174-0.048-0.265-0.053C33.494,0.011,33.475,0,33.453,0H22.177 c-3.678,0-6.669,2.992-6.669,6.67v1.674h-4.663c-3.678,0-6.67,2.992-6.67,6.67V49.03c0,3.678,2.992,6.669,6.67,6.669h22.677 c3.677,0,6.669-2.991,6.669-6.669v-1.675h4.664c3.678,0,6.669-2.991,6.669-6.669V18.069C51.524,18.045,51.512,18.025,51.51,18.001z M34.454,3.414l13.655,13.655h-8.985c-2.575,0-4.67-2.095-4.67-4.67V3.414z M38.191,49.029c0,2.574-2.095,4.669-4.669,4.669H10.845 c-2.575,0-4.67-2.095-4.67-4.669V15.014c0-2.575,2.095-4.67,4.67-4.67h5.663h4.614v10.399c0,3.678,2.991,6.669,6.668,6.669h10.4 v18.942L38.191,49.029L38.191,49.029z M36.777,25.412h-8.986c-2.574,0-4.668-2.094-4.668-4.669v-8.985L36.777,25.412z M44.855,45.355h-4.664V26.412c0-0.023-0.012-0.044-0.014-0.067c-0.006-0.085-0.021-0.167-0.049-0.249 c-0.012-0.033-0.021-0.066-0.036-0.1c-0.048-0.105-0.109-0.205-0.194-0.29l0,0l0,0c0-0.001-0.001-0.002-0.001-0.002L22.829,8.637 c-0.087-0.086-0.188-0.147-0.295-0.196c-0.029-0.013-0.058-0.021-0.088-0.031c-0.086-0.03-0.172-0.048-0.263-0.053 c-0.021-0.002-0.04-0.013-0.062-0.013h-4.614V6.67c0-2.575,2.095-4.67,4.669-4.67h10.277v10.4c0,3.678,2.992,6.67,6.67,6.67h10.399 v21.616C49.524,43.26,47.429,45.355,44.855,45.355z'/%3E%3C/svg%3E%0A"
    const cloneImg = document.createElement('img');
    cloneImg.src = cloneIcon;

    function renderIconCorner(icon) {
      return function renderIcon(ctx, left, top, styleOverride, fabricObject) {
        var size = this.cornerSize;
        ctx.save();
        ctx.translate(left, top);
        ctx.rotate(fabric.util.degreesToRadians(fabricObject.angle));
        ctx.drawImage(icon, -size/2, -size/2, size, size);
        ctx.restore();
    }
  }
    fabric.Object.prototype.controls.deleteControl = new fabric.Control({
      x: 0.5,
      y: -0.5,
      offsetY: 16,
      cursorStyle: 'pointer',
      mouseUpHandler: rmBg,
      render: renderIconCorner(img_rembg),
      cornerSize: 44,
    });
    //########### END delete section

    fabric.Object.prototype.controls.clone = new fabric.Control({
      x: -0.5,
      y: -0.5,
      offsetY: 16,
      cursorStyle: 'pointer',
      mouseUpHandler: drawCropRect,
      render: renderIconCorner(cloneImg),
      cornerSize: 44,
    });

    // Event listener for panning
    fabricRef.current.on("mouse:up", (event: fabric.IEvent<MouseEvent>) => {
      console.log(lastActiveObject.current)
      console.log(rectangleCut.current)
      if (isMidClick(event)) {
        setIsPanning(false);
      }
    });

    fabricRef.current.on(
      "mouse:down",
      (event: fabric.IEvent<MouseEvent>) => {
        if (isMidClick(event)) {
          setIsPanning(true);
        }
      },
    );

    fabricRef.current.on("path:created", () => {
      console.log("paht created");
      saveState();
    });

    // #### DISPOSE 

    return () => {
      fabricRef.current?.dispose();
      fabricRef.current = null; // Reset the reference to null
    };
  }, []);


  // load image or coming image from plugins render in fabric js
  useEffect(() => {

    if (!isOriginalLoaded) return;
    if (!fabricRef.current) return

    const [width, height] = getCurrentWidthHeight();
    if (width !== imageWidth || height !== imageHeight) {
      setImageSize(width, height);
    }

    fabricRef.current.setWidth(width);
    fabricRef.current.setHeight(height);

    const img = new fabric.Image(original, {
      left: 0,
      top: 0,
    });

    fabricRef.current.add(img);
    fabricRef.current.renderAll();

  }, [original, isOriginalLoaded]);

  // COMING RENDERS FROM BACKEND
  useEffect(() => {
    if (!fabricRef.current) return;

    const render = renders[renders.length - 1];

    const img = new fabric.Image(render, {
      left: 0,
      top: 0,
    });

    // Clear the canvas
    fabricRef.current.clear();
    fabricRef.current.add(img);
    saveState();
    fabricRef.current.renderAll();
  }, [renders]);

  // REDO / UNDO ACTION
  useEffect(() => {
    if (!fabricRef.current) return;
    if (currCanvasGroups.length === 0) return;
    const state = JSON.parse(currCanvasGroups[currCanvasGroups.length - 1]);
    // console.log(currCanvasGroups[currCanvasGroups.length - 1])
    fabricRef.current.loadFromJSON(
      state,
      fabricRef.current.renderAll.bind(fabricRef.current),
    );
  }, [currCanvasGroups]);

  // CHANGE BRUSH SIZE
  useEffect(() => {
    if (!fabricRef.current) return;
    fabricRef.current.freeDrawingBrush.width = baseBrushSize;
  }, [baseBrushSize]);

  const getCurrentRender = useCallback(async () => {
    let targetFile = file;
    if (renders.length > 0) {
      const lastRender = renders[renders.length - 1];
      targetFile = await srcToFile(lastRender.currentSrc, file.name, file.type);
    }
    return targetFile;
  }, [file, renders]);

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

  // Draw once the original image is loaded
  useEffect(() => {
    if (!isOriginalLoaded) {
      return;
    }

    const [width, height] = getCurrentWidthHeight();
    if (width !== imageWidth || height !== imageHeight) {
      setImageSize(width, height);
    }

    const rW = windowSize.width / width;
    const rH = (windowSize.height - TOOLBAR_HEIGHT) / height;

    let s = 1.0;
    if (rW < 1 || rH < 1) {
      s = Math.min(rW, rH);
    }
    setMinScale(s);
    setScale(s);

    console.log(
      `[on file load] image size: ${width}x${height}, scale: ${s}, initialCentered: ${initialCentered}`,
    );
    // Save initial state
    if (initialCentered) saveState();

    if (context?.canvas) {
      console.log("[on file load] set canvas size");
      if (width != context.canvas.width) {
        context.canvas.width = width;
      }
      if (height != context.canvas.height) {
        context.canvas.height = height;
      }
    }

    if (!initialCentered) {
      // 防止每次擦除以后图片 zoom 还原
      viewportRef.current?.centerView(s, 1);
      console.log("[on file load] centerView");
      setInitialCentered(true);
    }
  }, [
    viewportRef,
    imageHeight,
    imageWidth,
    original,
    isOriginalLoaded,
    windowSize,
    initialCentered,
    getCurrentWidthHeight,
  ]);

  useEffect(() => {
    console.log("[useEffect] centerView");
    // render 改变尺寸以后，undo/redo 重新 center
    viewportRef?.current?.centerView(minScale, 1);
  }, [imageHeight, imageWidth, viewportRef, minScale]);

  // Zoom reset
  const resetZoom = useCallback(() => {
    if (!minScale || !windowSize) {
      return;
    }
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }
    const offsetX = (windowSize.width - imageWidth * minScale) / 2;
    const offsetY = (windowSize.height - imageHeight * minScale) / 2;
    viewport.setTransform(offsetX, offsetY, minScale, 200, "easeOutQuad");
    if (viewport.instance.transformState.scale) {
      viewport.instance.transformState.scale = minScale;
    }

    setScale(minScale);
    setPanned(false);
  }, [
    viewportRef,
    windowSize,
    imageHeight,
    imageWidth,
    windowSize.height,
    minScale,
  ]);

  useEffect(() => {
    window.addEventListener("resize", () => {
      resetZoom();
    });
    return () => {
      window.removeEventListener("resize", () => {
        resetZoom();
      });
    };
  }, [windowSize, resetZoom]);

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

  const runInteractiveSeg = async (newClicks: number[][]) => {
    updateAppState({ isPluginRunning: true });
    const targetFile = await getCurrentRender();
    try {
      const res = await runPlugin(
        true,
        PluginName.InteractiveSeg,
        targetFile,
        undefined,
        newClicks,
      );
      const { blob } = res;
      const img = new Image();
      img.onload = () => {
        updateInteractiveSegState({ tmpInteractiveSegMask: img });
      };
      img.src = blob;
    } catch (e: any) {
      toast({
        variant: "destructive",
        description: e.message ? e.message : e.toString(),
      });
    }
    updateAppState({ isPluginRunning: false });
  };

  const onPointerUp = (ev: SyntheticEvent) => {
    if (isMidClick(ev)) {
      setIsPanning(false);
      return;
    }
    if (!hadDrawSomething()) {
      return;
    }
    if (interactiveSegState.isInteractiveSeg) {
      return;
    }
    if (isPanning) {
      return;
    }
    if (!original.src) {
      return;
    }
    const canvas = context?.canvas;
    if (!canvas) {
      return;
    }
    if (isInpainting) {
      return;
    }
    if (!isDraging) {
      return;
    }

    if (runMannually) {
      setIsDraging(false);
    } else {
      runInpainting();
    }
  };

  const onCanvasMouseUp = (ev: SyntheticEvent) => {
    if (interactiveSegState.isInteractiveSeg) {
      const xy = mouseXY(ev);
      const newClicks: number[][] = [...interactiveSegState.clicks];
      if (isRightClick(ev)) {
        newClicks.push([xy.x, xy.y, 0, newClicks.length]);
      } else {
        newClicks.push([xy.x, xy.y, 1, newClicks.length]);
      }
      runInteractiveSeg(newClicks);
      updateInteractiveSegState({ clicks: newClicks });
    }
  };

  // here adds lines to group
  const onMouseDown = (ev: SyntheticEvent) => {
    if (isProcessing) {
      return;
    }
    if (interactiveSegState.isInteractiveSeg) {
      return;
    }
    if (isPanning) {
      return;
    }
    if (!isOriginalLoaded) {
      return;
    }
    const canvas = context?.canvas;
    if (!canvas) {
      return;
    }

    if (isRightClick(ev)) {
      return;
    }

    if (isMidClick(ev)) {
      console.log("midclick");
      setIsPanning(true);
      return;
    }

    setIsDraging(true);
    handleCanvasMouseDown(mouseXY(ev));
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

  const download = () => {
    const canvas = fabricRef.current;
    if (canvas) {
      const imageObjects = canvas
        .getObjects()
        .filter((obj) => obj.type === "image");
      downloadCanvas(canvas, imageObjects, "image.png");
    }
  };

  // const download = () => {
  //   const canvas = fabricRef.current;
  //   if (canvas) {
  //     console.log(canvas.getObjects())
  //     const maskObjects = canvas
  //       .getObjects()
  //       .filter((obj) => obj.type === "path");
  //     downloadCanvas(canvas, maskObjects, "mask.png");
  //   }
  // };

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

  useHotKey(
    "ctrl+c,meta+c",
    async () => {
      const hasPermission = await askWritePermission();
      if (hasPermission && renders.length > 0) {
        if (context?.canvas) {
          await copyCanvasImage(context?.canvas);
          toast({
            title: "Copy inpainting result to clipboard",
          });
        }
      }
    },
    [renders, context],
  );

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
      <TransformWrapper
        ref={(r) => {
          if (r) {
            viewportRef.current = r;
          }
        }}
        panning={{ disabled: !isPanning, velocityDisabled: true }}
        wheel={{ step: 0.05, wheelDisabled: isChangingBrushSizeByWheel }}
        centerZoomedOut
        alignmentAnimation={{ disabled: true }}
        centerOnInit
        limitToBounds={false}
        doubleClick={{ disabled: true }}
        initialScale={minScale}
        minScale={minScale * 0.3}
        onPanning={() => {
          if (!panned) {
            setPanned(true);
          }
        }}
        onZoom={(ref) => {
          setScale(ref.state.scale);
        }}
      >
        <TransformComponent
          contentStyle={{
            visibility: initialCentered ? "visible" : "hidden",
          }}
        >
          <div className="relative">
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

          <Cropper
            maxHeight={imageHeight}
            maxWidth={imageWidth}
            minHeight={Math.min(512, imageHeight)}
            minWidth={Math.min(512, imageWidth)}
            scale={getCurScale()}
            show={settings.showCropper}
          />

          <Extender
            minHeight={Math.min(512, imageHeight)}
            minWidth={Math.min(512, imageWidth)}
            scale={getCurScale()}
            show={settings.showExtender}
          />

          {interactiveSegState.isInteractiveSeg ? (
            <InteractiveSegPoints />
          ) : (
            <></>
          )}
        </TransformComponent>
      </TransformWrapper>
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

  return (
    <div
      className="flex w-screen h-screen justify-center items-center"
      aria-hidden="true"
      // onMouseMove={onMouseMove}
      // onMouseUp={onPointerUp}
      // onWheel={handleScroll}
    >
      {renderCanvas()}
      {showBrush &&
        !isInpainting &&
        !isPanning &&
        (interactiveSegState.isInteractiveSeg
          ? renderInteractiveSegCursor()
          : renderBrush(getBrushStyle(x, y)))}

      {showRefBrush && renderBrush(getBrushStyle(windowCenterX, windowCenterY))}

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
            disabled={scale === minScale && panned === false}
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
            onClick={download}
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

          <IconButton
            tooltip="CUT IMAGE"
            // disabled={
            //   isProcessing || (!hadDrawSomething() && extraMasks.length === 0)
            // }
            onClick={() => {
              cropImage()
            }}
          >
            <Eraser />
          </IconButton>


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
} 

)

export default Editor;