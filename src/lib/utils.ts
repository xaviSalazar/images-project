import { type ClassValue, clsx } from "clsx";
import { SyntheticEvent } from "react";
import { twMerge } from "tailwind-merge";
import { LineGroup, Size } from "./types";
import { BRUSH_COLOR } from "./const";
import { LOG_LEVELS } from "./const";
import { predefinedRatios } from "@/lib/const";
import * as fabric from "fabric"; // v6
import { toast } from "@/components/ui/use-toast";
import Pica from 'pica';
import { FabricImage } from "fabric";



export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function keepGUIAlive() {
  async function getRequest(url = "") {
    const response = await fetch(url, {
      method: "GET",
      cache: "no-cache",
    });
    return response.json();
  }

  const keepAliveServer = () => {
    const url = document.location;
    const route = "/flaskwebgui-keep-server-alive";
    getRequest(url + route).then((data) => {
      return data;
    });
  };

  const intervalRequest = 3 * 1000;
  keepAliveServer();
  setInterval(keepAliveServer, intervalRequest);
}

export function dataURItoBlob(dataURI: string) {
  const mime = dataURI.split(",")[0].split(":")[1].split(";")[0];
  const binary = atob(dataURI.split(",")[1]);
  const array = [];
  for (let i = 0; i < binary.length; i += 1) {
    array.push(binary.charCodeAt(i));
  }
  return new Blob([new Uint8Array(array)], { type: mime });
}

export async function urlToDataURI(url: string): Promise<string> {
  const response = await fetch(url, {
    method: "GET",
    mode: "cors",
    cache: "no-cache",
    headers: {
      Origin: window.location.origin,
    },
  });
  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result as string);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function loadImage(image: HTMLImageElement, src: string) {
  return new Promise((resolve, reject) => {
    const initSRC = image.src;
    const img = image;
    img.onload = resolve;
    img.onerror = (err) => {
      img.src = initSRC;
      reject(err);
    };
    img.src = src;
  });
}

export async function blobToImage(blob: Blob) {
  const dataURL = URL.createObjectURL(blob);
  const newImage = new Image();
  await loadImage(newImage, dataURL);
  return newImage;
}

export function canvasToImage(
  canvas: HTMLCanvasElement,
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.addEventListener("load", () => {
      resolve(image);
    });

    image.addEventListener("error", (error) => {
      reject(error);
    });

    image.src = canvas.toDataURL();
  });
}

export function fileToImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        resolve(image);
      };
      image.onerror = () => {
        reject("无法加载图像。");
      };
      image.src = reader.result as string;
    };
    reader.onerror = () => {
      reject("无法读取文件。");
    };
    reader.readAsDataURL(file);
  });
}

export function srcToFile(src: string, fileName: string, mimeType: string) {
  return fetch(src)
    .then(function (res) {
      return res.arrayBuffer();
    })
    .then(function (buf) {
      return new File([buf], fileName, { type: mimeType });
    });
}

export function randomNumberInRange(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function askWritePermission() {
  try {
    // The clipboard-write permission is granted automatically to pages
    // when they are the active tab. So it's not required, but it's more safe.
    const { state } = await navigator.permissions.query({
      name: "clipboard-write" as PermissionName,
    });
    return state === "granted";
  } catch (error) {
    // Browser compatibility / Security error (ONLY HTTPS) ...
    return false;
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, mime: string): Promise<any> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(async (d) => {
      if (d) {
        resolve(d);
      } else {
        reject(new Error("Expected toBlob() to be defined"));
      }
    }, mime),
  );
}

export function base64ToBlob(base64String: string) {
  const byteCharacters = atob(base64String);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: "image/png" });

  return blob;
}

const setToClipboard = async (blob: any) => {
  const data = [new ClipboardItem({ [blob.type]: blob })];
  await navigator.clipboard.write(data);
};

export function isRightClick(mouseEvent: fabric.IEvent<MouseEvent>) {
  return mouseEvent.e.button === 2;
}

export function isLeftClick(mouseEvent: fabric.IEvent<MouseEvent>) {
  return mouseEvent.e.button === 0;
}

export function isMidClick(mouseEvent: fabric.IEvent<MouseEvent>) {
  // const mouseEvent = ev.nativeEvent as MouseEvent;
  return mouseEvent.e.button === 1;
}

export async function copyCanvasImage(canvas: HTMLCanvasElement) {
  const blob = await canvasToBlob(canvas, "image/png");
  try {
    await setToClipboard(blob);
  } catch {
    console.log("Copy image failed!");
  }
}

export function downloadImage(uri: string, name: string) {
  const link = document.createElement("a");
  link.href = uri;
  link.download = name;

  // this is necessary as link.click() does not work on the latest firefox
  link.dispatchEvent(
    new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      view: window,
    }),
  );

  setTimeout(() => {
    // For Firefox it is necessary to delay revoking the ObjectURL
    // window.URL.revokeObjectURL(base64)
    link.remove();
  }, 100);
}

export function mouseXY(ev: SyntheticEvent) {
  const mouseEvent = ev.nativeEvent as MouseEvent;
  return { x: mouseEvent.offsetX, y: mouseEvent.offsetY };
}

export function drawLines(
  ctx: CanvasRenderingContext2D,
  lines: LineGroup,
  color = BRUSH_COLOR,
) {
  ctx.strokeStyle = color;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  lines.forEach((line) => {
    if (!line?.pts.length || !line.size) {
      return;
    }
    ctx.lineWidth = line.size;
    ctx.beginPath();
    ctx.moveTo(line.pts[0].x, line.pts[0].y);
    line.pts.forEach((pt) => ctx.lineTo(pt.x, pt.y));
    ctx.stroke();
  });
}

export const generateMask = (
  imageWidth: number,
  imageHeight: number,
  lineGroups: LineGroup[],
  maskImages: HTMLImageElement[] = [],
  lineGroupsColor: string = "white",
): HTMLCanvasElement => {
  const maskCanvas = document.createElement("canvas");
  maskCanvas.width = imageWidth;
  maskCanvas.height = imageHeight;
  const ctx = maskCanvas.getContext("2d");
  if (!ctx) {
    throw new Error("could not retrieve mask canvas");
  }

  maskImages.forEach((maskImage) => {
    ctx.drawImage(maskImage, 0, 0, imageWidth, imageHeight);
  });

  lineGroups.forEach((lineGroup) => {
    drawLines(ctx, lineGroup, lineGroupsColor);
  });

  return maskCanvas;
};

export const resizeImageWithPica = async (imageSrc, width, height) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = imageSrc;

    img.onload = async () => {
      const pica = new Pica();
      const sourceCanvas = document.createElement('canvas');
      const destCanvas = document.createElement('canvas');
      
      sourceCanvas.width = img.width;
      sourceCanvas.height = img.height;
      destCanvas.width = width;
      destCanvas.height = height;

      const ctx = sourceCanvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      try {
        await pica.resize(sourceCanvas, destCanvas);
        resolve(destCanvas.toDataURL('image/png', 1));
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = (error) => {
      reject(error);
    };
  });
};


export const generateFromCanvas = async (
  canvasObject: object,
  aspectRatio: string,
  userWindowWidth: number,
  userWindowHeight: number,
): Promise<{
  targetMask: string;
  targetFile: string;
  staticElements: string;
}> => {
  return new Promise(async (resolve, reject) => {
    try {
      const predefinedRatio = predefinedRatios.find(
        (ratio) => ratio.name === aspectRatio,
      );
      if (!predefinedRatio) {
        console.error("Invalid aspect ratio");
        reject(new Error("Invalid aspect ratio"));
        return;
      }

      const { width: outputWidth, height: outputHeight } = predefinedRatio;

      const canvas = new fabric.Canvas(null);
      // to save any drawn path
      const tmpPathCanvas = new fabric.Canvas(null, {
        width: outputWidth,
        height: outputHeight,
      });
      // to store images only
      const tmpImgCanvas = new fabric.Canvas(null, {
        width: outputWidth,
        height: outputHeight,
      });

      const fixedImgCanvas = new fabric.Canvas(null, {
        width: outputWidth,
        height: outputHeight,
        backgroundColor : "#00b140",
      });

      const objCanvas = JSON.parse(canvasObject.data);
      // Retrieve original canvas dimensions from JSON

      const clipX = (userWindowWidth - outputWidth) / 2;
      const clipY = (userWindowHeight - outputHeight) / 2;
      // Set canvas dimensions based on output width and height
      canvas.setWidth(outputWidth);
      canvas.setHeight(outputHeight);

      let image: string;
      let mask: string;
      let elements: string;

      await canvas.loadFromJSON(objCanvas);
      const allObjects = canvas.getObjects();
      let clone: fabric.Object;
      let clone_fixed_elements: fabric.Object;

      for (const single_obj of allObjects) {
        clone = await single_obj.clone();
        clone_fixed_elements = await single_obj.clone();

        clone.set({
          left: clone.left - clipX,
          top: clone.top - clipY,
          scaleX: clone.scaleX,
          scaleY: clone.scaleY,
        });

        clone_fixed_elements.set({
          left: clone_fixed_elements.left - clipX,
          top: clone_fixed_elements.top - clipY,
          scaleX: clone_fixed_elements.scaleX,
          scaleY: clone_fixed_elements.scaleY,
        });

        if (single_obj.type === "path") {
          tmpPathCanvas.add(clone);
        }

        if (single_obj.type === "image") {
          tmpImgCanvas.add(clone);

          // STILL THINKING HOW TO APPLY THIS
          // Step 1: Retrieve the original image source
          // const originalSource = single_obj._originalElement.currentSrc;
          // const width_ = single_obj.width * single_obj.scaleX
          // const heigth_ = single_obj.height * single_obj.scaleY
          // console.log(originalSource)
          // // Step 2: Resize the image using Pica
          // const resizedImageSrc = await resizeImageWithPica(originalSource, width_, heigth_);
          // console.log(resizedImageSrc)
          // // Step 3: Create a new fabric.Image object with the resized image
          // const resizedImage = new FabricImage(resizedImageSrc, {
          //   left: clone.left,
          //   top: clone.top,
          // });
      
          // tmpImgCanvas.add(resizedImage);
      
          // // Add object to fixed image canvas if it's marked as "fixed"
          if (single_obj.img_view === "fixed") {
            fixedImgCanvas.add(clone_fixed_elements);

            // STILL THINKING HOW TO APLY THIS
            // fixedImgCanvas.add(resizedImage.clone());
          }
        }
      }
      tmpPathCanvas.renderAll();
      const pathURL = tmpPathCanvas.toDataURL({
        format: "png",
        quality: 1,
        multiplier: 1,
      });
      mask = pathURL;

      tmpImgCanvas.renderAll();
      const imgURL = tmpImgCanvas.toDataURL({
        format: "png",
        quality: 1,
        multiplier: 1,
      });

      image = imgURL;

      fixedImgCanvas.renderAll();
      const fixedImages = fixedImgCanvas.toDataURL({
        format: "png",
        quality: 1,
        multiplier: 1,
      });

      elements = fixedImages;

      // Resolve with the required data
      resolve({
        targetMask: mask,
        targetFile: image,
        staticElements: elements,
      });

    } catch (error) {
      reject(`Add a background image to canvas`);
    }
  });
};

export const convertToBase64 = (fileOrBlob: File | Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = event.target?.result as string;
      resolve(base64String);
    };
    reader.onerror = (error) => {
      reject(error);
    };
    reader.readAsDataURL(fileOrBlob);
  });
};

// LOGGS
const getLogLevelPriority = (level) => {
  switch (level) {
    case LOG_LEVELS.DEBUG:
      return 0;
    case LOG_LEVELS.INFO:
      return 1;
    case LOG_LEVELS.ERROR:
      return 2;
    default:
      return 0;
  }
};

const currentLogLevel = import.meta.env.VITE_LOG_LEVEL || LOG_LEVELS.DEBUG;
const currentLogLevelPriority = getLogLevelPriority(currentLogLevel);

const getCallerInfo = () => {
  const error = new Error();
  const stack = error.stack.split("\n");

  // Depending on the environment, the stack trace might have different formats.
  // Adjust the index based on your needs. Typically, the caller would be on the 3rd line.
  const callerInfo = stack[3].trim();
  const fileLineInfo = callerInfo.match(/\((.*):(\d+):(\d+)\)/);

  if (fileLineInfo) {
    return `${fileLineInfo[1]}:${fileLineInfo[2]}`;
  } else {
    // For different environments/formats
    const fileInfo = callerInfo.match(/at\s+(.*):(\d+):(\d+)/);
    if (fileInfo) {
      return `${fileInfo[1]}:${fileInfo[2]}`;
    }
  }

  return "unknown";
};

export const debugLog = (level, ...messages) => {
  const logLevelPriority = getLogLevelPriority(level);

  if (logLevelPriority >= currentLogLevelPriority) {
    const callerInfo = getCallerInfo();
    console.log(`[${level.toUpperCase()}] [${callerInfo}] \n`, ...messages);
  }
};
