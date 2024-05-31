import {
  Filename,
  GenInfo,
  ModelInfo,
  PowerPaintTask,
  Rect,
  ServerConfig,
} from "@/lib/types";
import { Settings } from "@/lib/states";
import {
  convertToBase64,
  srcToFile,
  randomNumberInRange,
  base64ToBlob,
} from "@/lib/utils";
import axios from "axios";

export const API_ENDPOINT = import.meta.env.VITE_BACKEND;
export const TOKEN = import.meta.env.VITE_RUNPOD;

const api = axios.create({
  baseURL: API_ENDPOINT,
});

export default async function inpaint(
  imageFile: File,
  settings: Settings,
  croperRect: Rect,
  extenderState: Rect,
  mask: File | Blob,
  paintByExampleImage: File | null = null,
  modelToCall: String,
) {
  const imageBase64 = await convertToBase64(imageFile);
  const maskBase64 = await convertToBase64(mask);
  const exampleImageBase64 = paintByExampleImage
    ? await convertToBase64(paintByExampleImage)
    : null;

  const res = await fetch(`${API_ENDPOINT}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify({
      id: randomNumberInRange(1, 65536),
      input: {
        image: imageBase64,
        mask: maskBase64,
        call_to_api: {
          api_call: "inpainting",
        },
        model: modelToCall,
        ldm_steps: settings.ldmSteps,
        ldm_sampler: settings.ldmSampler,
        zits_wireframe: settings.zitsWireframe,
        cv2_flag: settings.cv2Flag,
        cv2_radius: settings.cv2Radius,
        hd_strategy: "Crop",
        hd_strategy_crop_triger_size: 640,
        hd_strategy_crop_margin: 128,
        hd_trategy_resize_imit: 2048,
        prompt: settings.prompt,
        negative_prompt: settings.negativePrompt,
        use_croper: settings.showCropper,
        croper_x: croperRect.x,
        croper_y: croperRect.y,
        croper_height: croperRect.height,
        croper_width: croperRect.width,
        use_extender: settings.showExtender,
        extender_x: extenderState.x,
        extender_y: extenderState.y,
        extender_height: extenderState.height,
        extender_width: extenderState.width,
        sd_mask_blur: settings.sdMaskBlur,
        sd_strength: settings.sdStrength,
        sd_steps: settings.sdSteps,
        sd_guidance_scale: settings.sdGuidanceScale,
        sd_sampler: settings.sdSampler,
        sd_seed: settings.seedFixed ? settings.seed : -1,
        sd_match_histograms: settings.sdMatchHistograms,
        sd_freeu: settings.enableFreeu,
        sd_freeu_config: settings.freeuConfig,
        sd_lcm_lora: settings.enableLCMLora,
        paint_by_example_example_image: exampleImageBase64,
        p2p_image_guidance_scale: settings.p2pImageGuidanceScale,
        enable_controlnet: settings.enableControlnet,
        controlnet_conditioning_scale: settings.controlnetConditioningScale,
        controlnet_method: settings.controlnetMethod
          ? settings.controlnetMethod
          : "",
        powerpaint_task: settings.showExtender
          ? PowerPaintTask.outpainting
          : settings.powerpaintTask,
      },
    }),
  });

  if (res.ok) {
    const responseData = await res.json(); // Parse JSON response
    const { output } = responseData;
    // Convert base64 image data to a Blob object
    const blob = base64ToBlob(output);

    return {
      blob: URL.createObjectURL(blob),
      seed: "42", // Return the id from the response
    };
  }
  const errors = await res.json();
  throw new Error(`Something went wrong: ${errors.errors}`);
}

export async function getServerConfig(): Promise<ServerConfig> {
  const res = await api.get(`/server-config`);
  return res.data;
}

export async function switchModel(name: string): Promise<ModelInfo> {
  const res = await api.post(`/model`, { name });
  return res.data;
}

export async function switchPluginModel(
  plugin_name: string,
  model_name: string,
) {
  return api.post(`/switch_plugin_model`, { plugin_name, model_name });
}

export async function currentModel(): Promise<ModelInfo> {
  const res = await api.get("/model");
  return res.data;
}

export async function runPlugin(
  genMask: boolean,
  name: string,
  imageFile: File,
  serverconfig: ServerConfig,
  upscale?: number,
  clicks?: number[][],
) {
  const imageBase64 = await convertToBase64(imageFile);
  // const p = genMask ? "run_plugin_gen_mask" : "run_plugin_gen_image";
  const res = await fetch(`${API_ENDPOINT}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify({
      id: randomNumberInRange(1, 65536),
      input: {
        call_to_api: {
          api_call: name,
          plugin_name: name,
          model_name: serverconfig.removeBGModel,
        },
        name,
        image: imageBase64,
        upscale,
        clicks,
      },
    }),
  });
  if (res.ok) {
    const responseData = await res.json(); // Parse JSON response
    const { output } = responseData;
    const blob = base64ToBlob(output);
    // const blob = await res.blob();
    return { blob: URL.createObjectURL(blob) };
  }
  const errMsg = await res.json();
  throw new Error(errMsg);
}

export async function getMediaFile(tab: string, filename: string) {
  const res = await fetch(
    `${API_ENDPOINT}/media_file?tab=${tab}&filename=${encodeURIComponent(
      filename,
    )}`,
    {
      method: "GET",
    },
  );
  if (res.ok) {
    const blob = await res.blob();
    const file = new File([blob], filename, {
      type: res.headers.get("Content-Type") ?? "image/png",
    });
    return file;
  }
  const errMsg = await res.json();
  throw new Error(errMsg.errors);
}

export async function getMedias(tab: string): Promise<Filename[]> {
  const res = await api.get(`medias`, { params: { tab } });
  return res.data;
}

/**
 * Asynchronously downloads an image from an HTMLImageElement to the server.
 * @param {HTMLImageElement} image - The HTMLImageElement from which the image will be downloaded.
 * @param {string} filename - The desired filename for the downloaded image.
 * @param {string} mimeType - The MIME type of the image.
 * @throws {Error} Throws an error if the download process fails.
 * @returns {Promise<void>} A Promise that resolves when the download is successful.
 */

export async function downloadToOutput(
  image: HTMLImageElement,
  filename: string,
  mimeType: string,
) {
  const file = await srcToFile(image.src, filename, mimeType);
  const fd = new FormData();
  fd.append("file", file);

  try {
    const res = await fetch(`${API_ENDPOINT}/save_image`, {
      method: "POST",
      body: fd,
    });
    if (!res.ok) {
      const errMsg = await res.text();
      throw new Error(errMsg);
    }
  } catch (error) {
    throw new Error(`Something went wrong: ${error}`);
  }
}

export async function getGenInfo(file: File): Promise<GenInfo> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await api.post(`/gen-info`, fd);
  return res.data;
}

export async function getSamplers(): Promise<string[]> {
  const res = await api.post("/samplers");
  return res.data;
}

export async function postAdjustMask(
  mask: File | Blob,
  operate: "expand" | "shrink" | "reverse",
  kernel_size: number,
) {
  const maskBase64 = await convertToBase64(mask);
  const res = await fetch(`${API_ENDPOINT}/adjust_mask`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      mask: maskBase64,
      operate: operate,
      kernel_size: kernel_size,
    }),
  });
  if (res.ok) {
    const blob = await res.blob();
    return blob;
  }
  const errMsg = await res.json();
  throw new Error(errMsg);
}
