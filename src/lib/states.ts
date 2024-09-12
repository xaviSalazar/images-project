import { persist } from "zustand/middleware";
import { shallow } from "zustand/shallow";
import { immer } from "zustand/middleware/immer";
import { castDraft } from "immer";
import { createWithEqualityFn } from "zustand/traditional";
import {
  AdjustMaskOperate,
  CV2Flag,
  ExtenderDirection,
  FreeuConfig,
  LDMSampler,
  ColorStart,
  LightOrientation,
  Line,
  LineGroup,
  ModelInfo,
  PluginParams,
  Point,
  PowerPaintTask,
  ServerConfig,
  Size,
  SortBy,
  SortOrder,
  LanguageState,
  CanvaState,
} from "./types";
import { paintByExampleConfig } from "./models";
import {
  BRUSH_COLOR,
  DEFAULT_BRUSH_SIZE,
  DEFAULT_POSITIVE_PROMPT,
  DEFAULT_NEGATIVE_PROMPT,
  MAX_BRUSH_SIZE,
  MODEL_TYPE_INPAINT,
  PAINT_BY_EXAMPLE,
  LOG_LEVELS,
} from "./const";
import {
  blobToImage,
  canvasToImage,
  dataURItoBlob,
  generateMask,
  generateFromCanvas,
  loadImage,
  srcToFile,
  debugLog,
  base64ToBlob,
} from "./utils";
import inpaint, {
  renderImage,
  uploadImageToDescriptor,
 // getGenInfo,
  postAdjustMask,
  runPlugin,
} from "./api";
import { toast } from "@/components/ui/use-toast";

//
type FileManagerState = {
  sortBy: SortBy;
  sortOrder: SortOrder;
  layout: "rows" | "masonry";
  searchText: string;
  inputDirectory: string;
  outputDirectory: string;
};

type CropperState = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type Settings = {
  model: ModelInfo;
  enableDownloadMask: boolean;
  enableManualInpainting: boolean;
  enableUploadMask: boolean;
  enableAutoExtractPrompt: boolean;
  showCropper: boolean;
  showDrawing: boolean;
  showSelectable: boolean;
  showExtender: boolean;
  extenderDirection: ExtenderDirection;
  isDevModeActive: boolean;

  // For LDM
  ldmSteps: number;
  ldmSampler: LDMSampler;
  lightOrientation: LightOrientation;
  colorStart: ColorStart;

  // For ZITS
  zitsWireframe: boolean;

  // For OpenCV2
  cv2Radius: number;
  cv2Flag: CV2Flag;

  // For Diffusion moel
  prompt: string;
  negativePrompt: string;
  photoLighting: string;
  negativePhotoLighting: string;
  seed: number;
  seedFixed: boolean;

  // For SD
  sdMaskBlur: number;
  sdStrength: number;
  sdSteps: number;
  minimumLight: number;
  maximumLight: number;
  colorTransition: number;
  sdGuidanceScale: number;
  sdSampler: string;
  sdMatchHistograms: boolean;
  sdScale: number;

  // Pix2Pix
  p2pImageGuidanceScale: number;

  // ControlNet
  enableControlnet: boolean;
  controlnetConditioningScale: number;
  controlnetMethod: string;

  enableLCMLora: boolean;
  enableFreeu: boolean;
  freeuConfig: FreeuConfig;

  // PowerPaint
  powerpaintTask: PowerPaintTask;

  // AdjustMask
  adjustMaskKernelSize: number;
};

type InteractiveSegState = {
  isInteractiveSeg: boolean;
  tmpInteractiveSegMask: HTMLImageElement | null;
  clicks: number[][];
};

type EditorState = {
  canvasGroups: CanvaState[];
  currCanvasGroups: CanvaState[];
  lastCanvasGroups: CanvaState[];
  baseBrushSize: number;
  brushSizeScale: number;
  renders: HTMLImageElement[];
  triggerRedoUndo: boolean;
  lineGroups: LineGroup[];
  lastLineGroup: LineGroup;
  curLineGroup: LineGroup;

  // mask from interactive-seg or other segmentation models
  extraMasks: HTMLImageElement[];
  prevExtraMasks: HTMLImageElement[];

  temporaryMasks: HTMLImageElement[];
  // redo 相关
  redoRenders: HTMLImageElement[];
  redoCurLines: Line[];
  redoLineGroups: LineGroup[];
  // redo modified
  redoCurCanvas: CanvaState[];
  // redoLineGroups: LineGroup[];
};

type AppState = {
  file: File | null;
  paintByExampleFile: File | null;
  customMask: File | null;
  imageHeight: number;
  imageWidth: number;
  clipWidth: number;
  clipHeight: number;
  scaledWidth: number;
  scaledHeight: number;
  userWindowWidth: number;
  userWindowHeight: number;
  aspectRatio: string;
  isInpainting: boolean;
  isPluginRunning: boolean;
  isAdjustingMask: boolean;
  windowSize: Size;
  editorState: EditorState;
  disableShortCuts: boolean;
  interactiveSegState: InteractiveSegState;
  fileManagerState: FileManagerState;
  cropperState: CropperState;
  extenderState: CropperState;
  isCropperExtenderResizing: boolean;
  serverConfig: ServerConfig;
  settings: Settings;
};

type AppAction = {
  updateAppState: (newState: Partial<AppState>) => void;
  setFile: (file: File | string) => Promise<void>;
  setCustomFile: (file: File) => void;
  setIsInpainting: (newValue: boolean) => void;
  getIsProcessing: () => boolean;
  setBaseBrushSize: (newValue: number) => void;
  decreaseBaseBrushSize: () => void;
  increaseBaseBrushSize: () => void;
  getBrushSize: () => number;
  setImageSize: (width: number, height: number) => void;

  isSD: () => boolean;

  setCropperX: (newValue: number) => void;
  setCropperY: (newValue: number) => void;
  setCropperWidth: (newValue: number) => void;
  setCropperHeight: (newValue: number) => void;

  setExtenderX: (newValue: number) => void;
  setExtenderY: (newValue: number) => void;
  setExtenderWidth: (newValue: number) => void;
  setExtenderHeight: (newValue: number) => void;

  setIsCropperExtenderResizing: (newValue: boolean) => void;
  updateExtenderDirection: (newValue: ExtenderDirection) => void;
  resetExtender: (width: number, height: number) => void;
  updateExtenderByBuiltIn: (
    direction: ExtenderDirection,
    scale: number,
  ) => void;

  setServerConfig: (newValue: ServerConfig) => void;
  setSeed: (newValue: number) => void;
  updateSettings: (newSettings: Partial<Settings>) => void;
  updateServerConfig: (newServerConfig: Partial<ServerConfig>) => void;
  setModel: (newModel: ModelInfo) => void;
  updateFileManagerState: (newState: Partial<FileManagerState>) => void;
  updateInteractiveSegState: (newState: Partial<InteractiveSegState>) => void;
  resetInteractiveSegState: () => void;
  handleInteractiveSegAccept: () => void;
  showPromptInput: () => boolean;

  runInpainting: (modelToCall: string) => Promise<void>;
  runImgRendering: () => Promise<void>;
  runDescribeImg: () => Promise<void>;
  showPrevMask: () => Promise<void>;
  hidePrevMask: () => void;
  runRenderablePlugin: (
    genMask: boolean,
    pluginName: string,
    params?: PluginParams,
  ) => Promise<void>;

  // EditorState
  getCurrentTargetFile: () => Promise<File>;
  updateEditorState: (newState: Partial<EditorState>) => void;
  runMannually: () => boolean;
  handleCanvasMouseDown: (point: Point) => void;
  handleSaveState: (current_canvas: fabric.Canvas) => void;
  handleCanvasMouseMove: (point: Point) => void;
  cleanCurLineGroup: () => void;
  resetRedoState: () => void;
  setTriggerUndoRedo : (newValue: boolean) => void;
  undo: () => void;
  redo: () => void;
  undoDisabled: () => boolean;
  redoDisabled: () => boolean;


  adjustMask: (operate: AdjustMaskOperate) => Promise<void>;
  clearMask: () => void;
};

const defaultValues: AppState = {
  file: null,
  paintByExampleFile: null,
  customMask: null,
  imageHeight: 0,
  imageWidth: 0,
  clipWidth: 0,
  clipHeight: 0,
  scaledWidth: 0,
  userWindowWidth: 0,
  userWindowHeight: 0,
  scaledHeight: 0,
  aspectRatio: "1:1",
  isInpainting: false,
  isPluginRunning: false,
  isAdjustingMask: false,
  disableShortCuts: false,

  windowSize: {
    height: 600,
    width: 800,
  },
  editorState: {
    baseBrushSize: DEFAULT_BRUSH_SIZE,
    brushSizeScale: 1,
    renders: [],
    extraMasks: [],
    triggerRedoUndo: false,
    prevExtraMasks: [],
    temporaryMasks: [],
    lineGroups: [],
    lastLineGroup: [],
    curLineGroup: [],
    canvasGroups: [],
    currCanvasGroups: [],
    lastCanvasGroups: [],
    redoRenders: [],
    redoCurLines: [],
    redoLineGroups: [],
    redoCurCanvas: [],
  },

  interactiveSegState: {
    isInteractiveSeg: false,
    tmpInteractiveSegMask: null,
    clicks: [],
  },

  cropperState: {
    x: 0,
    y: 0,
    width: 512,
    height: 512,
  },
  extenderState: {
    x: 0,
    y: 0,
    width: 512,
    height: 512,
  },
  isCropperExtenderResizing: false,

  fileManagerState: {
    sortBy: SortBy.CTIME,
    sortOrder: SortOrder.DESCENDING,
    layout: "masonry",
    searchText: "",
    inputDirectory: "",
    outputDirectory: "",
  },

  serverConfig: paintByExampleConfig,

  settings: {
    model: {
      name: "lama",
      path: "lama",
      model_type: "inpaint",
      support_controlnet: false,
      support_strength: false,
      support_outpainting: false,
      controlnets: [],
      support_freeu: false,
      support_lcm_lora: false,
      is_single_file_diffusers: false,
      need_prompt: false,
    },
    enableControlnet: false,
    showCropper: false,
    showExtender: false,
    showDrawing: false,
    showSelectable: false,
    isDevModeActive: false,
    extenderDirection: ExtenderDirection.xy,
    enableDownloadMask: false,
    enableManualInpainting: false,
    enableUploadMask: false,
    enableAutoExtractPrompt: true,
    ldmSteps: 30,
    ldmSampler: LDMSampler.ddim,
    lightOrientation: LightOrientation.vertical,
    colorStart: ColorStart.black_to_white,
    zitsWireframe: true,
    cv2Radius: 5,
    cv2Flag: CV2Flag.INPAINT_NS,
    prompt: DEFAULT_POSITIVE_PROMPT,
    negativePrompt: DEFAULT_NEGATIVE_PROMPT,
    photoLighting: "environment light",
    negativePhotoLighting: "black, white, flat, low contrast, oversaturated, underexposed, overexposed, blurred, noisy, (worst quality, low quality, illustration, painting, cartoons, sketch), blurry, watermark, low quality",
    seed: 42,
    seedFixed: false,
    sdMaskBlur: 12,
    sdStrength: 1.0,
    sdSteps: 50,
    minimumLight: 0.0,
    maximumLight: 0.9,
    colorTransition: 0.25,
    sdGuidanceScale: 7.5,
    sdSampler: "DPM++ 2M",
    sdMatchHistograms: false,
    sdScale: 1.0,
    p2pImageGuidanceScale: 1.5,
    controlnetConditioningScale: 0.4,
    controlnetMethod: "lllyasviel/control_v11p_sd15_canny",
    enableLCMLora: false,
    enableFreeu: false,
    freeuConfig: { s1: 0.9, s2: 0.2, b1: 1.2, b2: 1.4 },
    powerpaintTask: PowerPaintTask.text_guided,
    adjustMaskKernelSize: 12,
  },
};

export const useLanguageStore = createWithEqualityFn<LanguageState>((set) => ({
  language: "",
  setLanguage: (lang) => set({ language: lang }),
}));

export const useStore = createWithEqualityFn<AppState & AppAction>()(
  persist(
    immer((set, get) => ({
      ...defaultValues,

      showPrevMask: async () => {
        if (get().settings.showExtender) {
          return;
        }
        const { lastLineGroup, curLineGroup, prevExtraMasks, extraMasks } =
          get().editorState;
        if (curLineGroup.length !== 0 || extraMasks.length !== 0) {
          return;
        }
        const { imageWidth, imageHeight } = get();

        const maskCanvas = generateMask(
          imageWidth,
          imageHeight,
          [lastLineGroup],
          prevExtraMasks,
          BRUSH_COLOR,
        );
        try {
          const maskImage = await canvasToImage(maskCanvas);
          set((state) => {
            state.editorState.temporaryMasks.push(castDraft(maskImage));
          });
        } catch (e) {
          console.error(e);
          return;
        }
      },
      hidePrevMask: () => {
        set((state) => {
          state.editorState.temporaryMasks = [];
        });
      },

      getCurrentTargetFile: async (): Promise<File> => {
        const file = get().file!; // 一定是在 file 加载了以后才可能调用这个函数
        const renders = get().editorState.renders;

        let targetFile = file;
        if (renders.length > 0) {
          const lastRender = renders[renders.length - 1];
          targetFile = await srcToFile(
            lastRender.currentSrc,
            file.name,
            file.type,
          );
        }
        return targetFile;
      },

      runInpainting: async (modelToCall: String) => {
        const {
          isInpainting,
          aspectRatio,
          file,
          paintByExampleFile,
          imageWidth,
          imageHeight,
          settings,
          cropperState,
          extenderState,
          userWindowWidth,
          userWindowHeight,
        } = get();
        if (isInpainting || file === null) {
          return;
        }
        if (
          get().settings.model.support_outpainting &&
          settings.showExtender &&
          extenderState.height === imageHeight &&
          extenderState.width === imageWidth
        ) {
          return;
        }

        const {
          // lastLineGroup,
          // curLineGroup,
          lineGroups,
          renders,
          // prevExtraMasks,
          // extraMasks,
          currCanvasGroups, // added to support fabric js
        } = get().editorState;

        let maskImages: HTMLImageElement[] = [];
        let maskLineGroup: LineGroup = [];

        if (currCanvasGroups.length === 0) {
          toast({
            variant: "destructive",
            description: "Please draw mask on picture",
          });
          return;
        }

        const newLineGroups = [...lineGroups, maskLineGroup];

        set((state) => {
          state.isInpainting = true;
        });

        console.log("run inpainging");
        // Generate mask and image separately


        try {
          const { targetMask, targetFile } = await generateFromCanvas(
            currCanvasGroups[currCanvasGroups.length - 1],
            aspectRatio,
            userWindowWidth,
            userWindowHeight,
          );

          const res = await inpaint(
            dataURItoBlob(targetFile),
            settings,
            cropperState,
            extenderState,
            dataURItoBlob(targetMask),
            paintByExampleFile,
            modelToCall,
          );

          const { blob, seed } = res;
          if (seed) {
            get().setSeed(parseInt(seed, 10));
          }
          const newRender = new Image();
          await loadImage(newRender, blob);
          const newRenders = [...renders, newRender];
          get().setImageSize(newRender.width, newRender.height);
          get().updateEditorState({
            renders: newRenders,
            lineGroups: newLineGroups,
            lastLineGroup: maskLineGroup,
            curLineGroup: [],
            extraMasks: [],
            prevExtraMasks: maskImages,
          });
        } catch (e: any) {
          toast({
            variant: "destructive",
            description: e.message ? e.message : e.toString(),
          });
        }

        get().resetRedoState();
        set((state) => {
          state.isInpainting = false;
          state.editorState.temporaryMasks = [];
        });
      },

      runDescribeImg: async () => {

        const { isInpainting, aspectRatio, userWindowWidth, userWindowHeight } = get();

        if (isInpainting) {
          return;
        }

        const {
          currCanvasGroups, // added to support fabric js
        } = get().editorState;

        const { isDevModeActive } = get().settings;

        try {
          const { targetFile } = await generateFromCanvas(
            currCanvasGroups[currCanvasGroups.length - 1],
            aspectRatio,
            userWindowWidth,
            userWindowHeight,
          );

          set((state) => {
            state.isInpainting = true;
          });

          const res = await uploadImageToDescriptor(
            dataURItoBlob(targetFile),
            isDevModeActive
          );

          const { words_list } = res;
          // set prompt input to this words list
          set((state) => {
            state.settings.prompt = words_list;
          });
  
          toast({
            description: `Created image description`,
          });

        } catch (e: any) {
          toast({
            variant: "destructive",
            title: "Uh oh! Something went wrong.",
            description: e.message ? e.message : e.toString(),
          });
        }
        set((state) => {
          state.isInpainting = false;
          state.editorState.temporaryMasks = [];
        });
      },

      runImgRendering: async () => {
        const { isInpainting, aspectRatio, userWindowWidth, userWindowHeight, scaledWidth, scaledHeight } = get();

        if (isInpainting) {
          return;
        }

        const { prompt, negativePrompt,
               photoLighting, negativePhotoLighting,
               minimumLight, maximumLight, colorStart, lightOrientation, colorTransition,
               isDevModeActive } = get().settings;

        const {
          renders,
          currCanvasGroups, // added to support fabric js
        } = get().editorState;

        if (!prompt.trim()) {
          toast({
            variant: "destructive",
            title: "Uh oh! Something went wrong.",
            description: "Please write a prompt",
          });
          return;
        }

        try {

          const { targetFile, staticElements } = await generateFromCanvas(
            currCanvasGroups[currCanvasGroups.length - 1],
            aspectRatio,
            userWindowWidth,
            userWindowHeight,
          );

          set((state) => {
            state.isInpainting = true;
          });
  
          console.log(targetFile)
          console.log(staticElements)
          // console.log(scaledWidth,scaledHeight)

          const res = await renderImage(
            dataURItoBlob(targetFile),
            dataURItoBlob(staticElements),
            prompt,
            photoLighting,
            negativePrompt,
            negativePhotoLighting,
            scaledWidth,
            scaledHeight,
            minimumLight,
            maximumLight,
            colorStart,
            lightOrientation,
            colorTransition,
            isDevModeActive
          );
          const { img_list, seed } = res;
          for (const base64Image of img_list) {
            const blob = base64ToBlob(base64Image);
            const newRender = new Image();
            await loadImage(newRender, URL.createObjectURL(blob));
            const newRenders = [...renders, newRender];
            get().updateEditorState({
              renders: newRenders,
            });
          }

          // if (seed) {
          //   get().setSeed(parseInt(seed, 10));
          // }
          //get().setImageSize(newRender.width, newRender.height);
          toast({
            variant: "success",
            description: `LOADED NEW IMAGE SUCCESS`,
          });
        } catch (e: any) {
          toast({
            variant: "destructive",
            title: "Uh oh! Something went wrong.",
            description: e.message ? e.message : e.toString(),
          });
        }
        // get().resetRedoState();
        set((state) => {
          state.isInpainting = false;
          state.editorState.temporaryMasks = [];
        });
      },

      runRenderablePlugin: async (
        genMask: boolean,
        pluginName: string,
        params: PluginParams = { upscale: 1 },
      ) => {
        const { renders, lineGroups } = get().editorState;
        set((state) => {
          state.isPluginRunning = true;
        });

        try {
          const start = new Date();
          const targetFile = await get().getCurrentTargetFile();
          const res = await runPlugin(
            genMask,
            pluginName,
            targetFile,
            get().serverConfig,
            params.upscale,
          );
          const { blob } = res;

          if (!genMask) {
            const newRender = new Image();
            await loadImage(newRender, blob);
            get().setImageSize(newRender.width, newRender.height);
            const newRenders = [...renders, newRender];
            const newLineGroups = [...lineGroups, []];
            get().updateEditorState({
              renders: newRenders,
              lineGroups: newLineGroups,
            });
          } else {
            const newMask = new Image();
            await loadImage(newMask, blob);
            set((state) => {
              state.editorState.extraMasks.push(castDraft(newMask));
            });
          }
          const end = new Date();
          const time = end.getTime() - start.getTime();
          toast({
            description: `Run ${pluginName} successfully in ${time / 1000}s`,
          });
        } catch (e: any) {
          toast({
            variant: "destructive",
            description: e.message ? e.message : e.toString(),
          });
        }
        set((state) => {
          state.isPluginRunning = false;
        });
      },

      // Edirot State //
      updateEditorState: (newState: Partial<EditorState>) => {
        set((state) => {
          state.editorState = castDraft({ ...state.editorState, ...newState });
        });
      },

      cleanCurLineGroup: () => {
        get().updateEditorState({ curLineGroup: [] });
      },

      handleCanvasMouseDown: (point: Point) => {
        let lineGroup: LineGroup = [];
        const state = get();
        if (state.runMannually()) {
          lineGroup = [...state.editorState.curLineGroup];
        }
        lineGroup.push({ size: state.getBrushSize(), pts: [point] });
        set((state) => {
          state.editorState.curLineGroup = lineGroup;
        });
      },

      handleSaveState: (current_canvas: fabric.Canvas) => {
        let canvaGroup: CanvaState[] = []; // initialized variable
        const state = get();
        canvaGroup = [...state.editorState.currCanvasGroups];
        debugLog(LOG_LEVELS.DEBUG, "canvaGroup\n", canvaGroup);

        const jsonData = current_canvas.toJSON([
          "lockMovementX",
          "lockMovementY",
          "lockRotation",
          "lockScalingX",
          "lockScalingY",
          "gradientAngle",
          "selectable",
          "hasControls",
          "source",
          "editable",
          "top",
          "left",
        ]);
        const stringData = JSON.stringify(jsonData);
        const id = Date.now() + "_" + Math.floor(Math.random() * 10000);
        const newElement = { id, data: stringData };
        debugLog(
          LOG_LEVELS.DEBUG,
          "newElement data\n",
          JSON.parse(newElement.data),
        );
        canvaGroup.push(newElement);
        set((state) => {
          state.editorState.currCanvasGroups = canvaGroup;
        });
      },

      handleCanvasMouseMove: (point: Point) => {
        set((state) => {
          const curLineGroup = state.editorState.curLineGroup;
          if (curLineGroup.length) {
            curLineGroup[curLineGroup.length - 1].pts.push(point);
          }
        });
      },

      runMannually: (): boolean => {
        const state = get();
        return (
          state.settings.enableManualInpainting ||
          state.settings.model.model_type !== MODEL_TYPE_INPAINT
        );
      },

      getIsProcessing: (): boolean => {
        return (
          get().isInpainting || get().isPluginRunning || get().isAdjustingMask
        );
      },

      isSD: (): boolean => {
        return get().settings.model.model_type !== MODEL_TYPE_INPAINT;
      },

      setTriggerUndoRedo: (newValue: boolean) => 
        set((state) => {
          state.editorState.triggerRedoUndo = newValue;
      }),

      // undo/redo

      undoDisabled: (): boolean => {
        const editorState = get().editorState;
        if (editorState.renders.length > 0) {
          return false;
        }
        if (get().runMannually()) {
          //if (editorState.curLineGroup.length === 0) {
          if (editorState.currCanvasGroups.length === 0) {
            return true;
          }
        } else if (editorState.renders.length === 0) {
          return true;
        }
        return false;
      },


      undo: () => {
        if (
          // get().runMannually() &&
          get().editorState.currCanvasGroups.length !== 0
          //get().editorState.curLineGroup.length !== 0
        ) {
          // undoStroke
          set((state) => {
            const editorState = state.editorState;
            // if (editorState.curLineGroup.length === 0) {
            if (editorState.currCanvasGroups.length === 0) {
              return;
            }
            //editorState.lastLineGroup = [];
            editorState.lastCanvasGroups = [];
            const lastLine = editorState.currCanvasGroups.pop()!;
            debugLog(
              LOG_LEVELS.DEBUG,
              "lastSaved\n",
              JSON.parse(lastLine.data),
            );
            editorState.redoCurCanvas.push(lastLine);
            editorState.triggerRedoUndo = true;
          });
        } 
      },

      redoDisabled: (): boolean => {
        const editorState = get().editorState;
        if (editorState.redoRenders.length > 0) {
          return false;
        }
        if (get().runMannually()) {
          //if (editorState.redoCurLines.length === 0) {
          if (editorState.redoCurCanvas.length === 0) {
            return true;
          }
        } else if (editorState.redoRenders.length === 0) {
          return true;
        }
        return false;
      },

      redo: () => {
        if (
          get().runMannually() &&
          get().editorState.redoCurCanvas.length !== 0
        ) {
          set((state) => {
            const editorState = state.editorState;
            // if (editorState.redoCurLines.length === 0) {
            if (editorState.redoCurCanvas.length === 0) {
              return;
            }
            // const line = editorState.redoCurLines.pop()!;
            const draw = editorState.redoCurCanvas.pop()!;
            editorState.currCanvasGroups.push(draw);
            editorState.triggerRedoUndo = true;
          });
        } 
      },

      resetRedoState: () => {
        set((state) => {
          state.editorState.redoCurLines = [];
          state.editorState.redoLineGroups = [];
          state.editorState.redoRenders = [];
        });
      },

      //****//

      updateAppState: (newState: Partial<AppState>) => {
        set(() => newState);
      },

      getBrushSize: (): number => {
        return (
          get().editorState.baseBrushSize * get().editorState.brushSizeScale
        );
      },

      showPromptInput: (): boolean => {
        const model = get().settings.model;
        return (
          model.model_type !== MODEL_TYPE_INPAINT &&
          model.name !== PAINT_BY_EXAMPLE
        );
      },

      setServerConfig: (newValue: ServerConfig) => {
        set((state) => {
          state.serverConfig = newValue;
          state.settings.enableControlnet = newValue.enableControlnet;
          state.settings.controlnetMethod = newValue.controlnetMethod;
        });
      },

      updateServerConfig: (newServerConfig: Partial<ServerConfig>) => {
        set((state) => {
          state.serverConfig = {
            ...state.serverConfig,
            ...newServerConfig,
          };
          console.log(state.serverConfig);
        });
      },

      updateSettings: (newSettings: Partial<Settings>) => {
        set((state) => {
          state.settings = {
            ...state.settings,
            ...newSettings,
          };
        });
      },

      setModel: (newModel: ModelInfo) => {
        set((state) => {
          state.settings.model = newModel;

          if (
            newModel.support_controlnet &&
            !newModel.controlnets.includes(state.settings.controlnetMethod)
          ) {
            state.settings.controlnetMethod = newModel.controlnets[0];
          }
        });
      },

      updateFileManagerState: (newState: Partial<FileManagerState>) => {
        set((state) => {
          state.fileManagerState = {
            ...state.fileManagerState,
            ...newState,
          };
        });
      },

      updateInteractiveSegState: (newState: Partial<InteractiveSegState>) => {
        set((state) => {
          return {
            ...state,
            interactiveSegState: {
              ...state.interactiveSegState,
              ...newState,
            },
          };
        });
      },

      resetInteractiveSegState: () => {
        get().updateInteractiveSegState(defaultValues.interactiveSegState);
      },

      handleInteractiveSegAccept: () => {
        set((state) => {
          if (state.interactiveSegState.tmpInteractiveSegMask) {
            state.editorState.extraMasks.push(
              castDraft(state.interactiveSegState.tmpInteractiveSegMask),
            );
          }
          state.interactiveSegState = castDraft({
            ...defaultValues.interactiveSegState,
          });
        });
      },

      setIsInpainting: (newValue: boolean) =>
        set((state) => {
          state.isInpainting = newValue;
        }),

      setFile: async (file: File | string) => {
        // if (get().settings.enableAutoExtractPrompt) {
        //   try {
        //     const res = await getGenInfo(file);
        //     if (res.prompt) {
        //       set((state) => {
        //         state.settings.prompt = res.prompt;
        //       });
        //     }
        //     if (res.negative_prompt) {
        //       set((state) => {
        //         state.settings.negativePrompt = res.negative_prompt;
        //       });
        //     }
        //   } catch (e: any) {
        //     toast({
        //       variant: "destructive",
        //       description: e.message ? e.message : e.toString(),
        //     });
        //   }
        // }
        set((state) => {
          state.file = file;
          // state.interactiveSegState = castDraft(
          //   defaultValues.interactiveSegState,
          // );
          // state.editorState = castDraft(defaultValues.editorState);
          // state.cropperState = defaultValues.cropperState;
        });
      },

      setCustomFile: (file: File) =>
        set((state) => {
          state.customMask = file;
        }),

      setBaseBrushSize: (newValue: number) =>
        set((state) => {
          state.editorState.baseBrushSize = newValue;
        }),

      decreaseBaseBrushSize: () => {
        const baseBrushSize = get().editorState.baseBrushSize;
        let newBrushSize = baseBrushSize;
        if (baseBrushSize > 10) {
          newBrushSize = baseBrushSize - 10;
        }
        if (baseBrushSize <= 10 && baseBrushSize > 0) {
          newBrushSize = baseBrushSize - 3;
        }
        get().setBaseBrushSize(newBrushSize);
      },

      increaseBaseBrushSize: () => {
        const baseBrushSize = get().editorState.baseBrushSize;
        const newBrushSize = Math.min(baseBrushSize + 10, MAX_BRUSH_SIZE);
        get().setBaseBrushSize(newBrushSize);
      },

      setImageSize: (width: number, height: number) => {
        // 根据图片尺寸调整 brushSize 的 scale
        set((state) => {
          state.imageWidth = width;
          state.imageHeight = height;
          state.editorState.brushSizeScale =
            Math.max(Math.min(width, height), 512) / 512;
        });
        get().resetExtender(width, height);
      },

      setCropperX: (newValue: number) =>
        set((state) => {
          state.cropperState.x = newValue;
        }),

      setCropperY: (newValue: number) =>
        set((state) => {
          state.cropperState.y = newValue;
        }),

      setCropperWidth: (newValue: number) =>
        set((state) => {
          state.cropperState.width = newValue;
        }),

      setCropperHeight: (newValue: number) =>
        set((state) => {
          state.cropperState.height = newValue;
        }),

      setExtenderX: (newValue: number) =>
        set((state) => {
          state.extenderState.x = newValue;
        }),

      setExtenderY: (newValue: number) =>
        set((state) => {
          state.extenderState.y = newValue;
        }),

      setExtenderWidth: (newValue: number) =>
        set((state) => {
          state.extenderState.width = newValue;
        }),

      setExtenderHeight: (newValue: number) =>
        set((state) => {
          state.extenderState.height = newValue;
        }),

      setIsCropperExtenderResizing: (newValue: boolean) =>
        set((state) => {
          state.isCropperExtenderResizing = newValue;
        }),

      updateExtenderDirection: (newValue: ExtenderDirection) => {
        console.log(
          `updateExtenderDirection: ${JSON.stringify(get().extenderState)}`,
        );
        set((state) => {
          state.settings.extenderDirection = newValue;
          state.extenderState.x = 0;
          state.extenderState.y = 0;
          state.extenderState.width = state.imageWidth;
          state.extenderState.height = state.imageHeight;
        });
        get().updateExtenderByBuiltIn(newValue, 1.5);
      },

      updateExtenderByBuiltIn: (
        direction: ExtenderDirection,
        scale: number,
      ) => {
        const newExtenderState = { ...defaultValues.extenderState };
        let { x, y, width, height } = newExtenderState;
        const { imageWidth, imageHeight } = get();
        width = imageWidth;
        height = imageHeight;

        switch (direction) {
          case ExtenderDirection.x:
            x = -Math.ceil((imageWidth * (scale - 1)) / 2);
            width = Math.ceil(imageWidth * scale);
            break;
          case ExtenderDirection.y:
            y = -Math.ceil((imageHeight * (scale - 1)) / 2);
            height = Math.ceil(imageHeight * scale);
            break;
          case ExtenderDirection.xy:
            x = -Math.ceil((imageWidth * (scale - 1)) / 2);
            y = -Math.ceil((imageHeight * (scale - 1)) / 2);
            width = Math.ceil(imageWidth * scale);
            height = Math.ceil(imageHeight * scale);
            break;
          default:
            break;
        }

        set((state) => {
          state.extenderState.x = x;
          state.extenderState.y = y;
          state.extenderState.width = width;
          state.extenderState.height = height;
        });
      },

      resetExtender: (width: number, height: number) => {
        set((state) => {
          state.extenderState.x = 0;
          state.extenderState.y = 0;
          state.extenderState.width = width;
          state.extenderState.height = height;
        });
      },

      setSeed: (newValue: number) =>
        set((state) => {
          state.settings.seed = newValue;
        }),

      adjustMask: async (operate: AdjustMaskOperate) => {
        const { imageWidth, imageHeight } = get();
        const { curLineGroup, extraMasks } = get().editorState;
        const { adjustMaskKernelSize } = get().settings;
        if (curLineGroup.length === 0 && extraMasks.length === 0) {
          return;
        }

        set((state) => {
          state.isAdjustingMask = true;
        });

        const maskCanvas = generateMask(
          imageWidth,
          imageHeight,
          [curLineGroup],
          extraMasks,
          BRUSH_COLOR,
        );
        const maskBlob = dataURItoBlob(maskCanvas.toDataURL());
        const newMaskBlob = await postAdjustMask(
          maskBlob,
          operate,
          adjustMaskKernelSize,
        );
        const newMask = await blobToImage(newMaskBlob);

        // TODO: currently ignore stroke undo/redo
        set((state) => {
          state.editorState.extraMasks = [castDraft(newMask)];
          state.editorState.curLineGroup = [];
        });

        set((state) => {
          state.isAdjustingMask = false;
        });
      },
      clearMask: () => {
        set((state) => {
          state.editorState.extraMasks = [];
          state.editorState.curLineGroup = [];
        });
      },
    })),
    {
      name: "ZUSTAND_STATE", // name of the item in the storage (must be unique)
      version: 1,
      partialize: (state) =>
        Object.fromEntries(
          Object.entries(state).filter(([key]) =>
            ["fileManagerState", "settings"].includes(key),
          ),
        ),
    },
  ),
  shallow,
);
