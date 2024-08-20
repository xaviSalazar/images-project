export const ACCENT_COLOR = "#ffcc00bb";
export const DEFAULT_BRUSH_SIZE = 40;
export const MIN_BRUSH_SIZE = 3;
export const MAX_BRUSH_SIZE = 200;
export const MODEL_TYPE_INPAINT = "inpaint";
export const MODEL_TYPE_DIFFUSERS_SD = "diffusers_sd";
export const MODEL_TYPE_DIFFUSERS_SDXL = "diffusers_sdxl";
export const MODEL_TYPE_DIFFUSERS_SD_INPAINT = "diffusers_sd_inpaint";
export const MODEL_TYPE_DIFFUSERS_SDXL_INPAINT = "diffusers_sdxl_inpaint";
export const MODEL_TYPE_OTHER = "diffusers_other";
export const BRUSH_COLOR = "#ffcc00bb";

export const LDM = "ldm";
export const CV2 = "cv2";

export const PAINT_BY_EXAMPLE = "Fantasy-Studio/Paint-by-Example";
export const INSTRUCT_PIX2PIX = "timbrooks/instruct-pix2pix";
export const KANDINSKY_2_2 =
  "kandinsky-community/kandinsky-2-2-decoder-inpaint";
export const POWERPAINT = "Sanster/PowerPaint-V1-stable-diffusion-inpainting";
export const ANYTEXT = "Sanster/AnyText";

export const DEFAULT_POSITIVE_PROMPT =
  "Lush, vibrant Amazon rainforest at golden hour, showcasing an elegant cosmetic product elegantly positioned on a natural rock amidst exotic flowers using cream colors. Ultra-high definition 4K resolution, capturing breathtaking details with a crystal-clear, cinematic quality. Focus on achieving a serene, tranquil atmosphere that highlights the product’s harmony with nature, ensuring a realistic, highly detailed background that complements the product beautifully without any digital distortion";
export const DEFAULT_NEGATIVE_PROMPT =
  "flat, low contrast, oversaturated, underexposed, overexposed, blurred, noisy, (worst quality, low quality, illustration, 3d, 2d, painting, cartoons, sketch) , tooth, dull, blurry, watermark, low quality";

export const predefinedRatios = [
  { name: "1:1", ratio: 1, width: 1024, height: 1024 },
  { name: "3:2", ratio: 3 / 2, width: 1152, height: 768 },
  { name: "2:3", ratio: 2 / 3, width: 768, height: 1152 },
  { name: "4:3", ratio: 4 / 3, width: 1152, height: 864 },
  { name: "3:4", ratio: 3 / 4, width: 864, height: 1152 },
  { name: "16:9", ratio: 16 / 9, width: 1024, height: 576 },
  { name: "9:16", ratio: 9 / 16, width: 768, height: 1360 },
];

export const LOG_LEVELS = {
  DEBUG: "debug",
  INFO: "info",
  ERROR: "error",
};


export const SUPPORTED_FILE_TYPE = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/bmp",
  "image/tiff",
];
