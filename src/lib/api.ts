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
import { toast } from "@/components/ui/use-toast";

export const API_ENDPOINT = import.meta.env.VITE_BACKEND;
export const API_ENDPOINT_RENDER_IMAGE = import.meta.env
  .VITE_BACKEND_RENDER_IMAGE;
export const API_ENDPOINT_RENDER_IMAGE_STATUS = import.meta.env
  .VITE_BACKEND_RENDER_IMAGE_STATUS;
export const API_ENDPOINT_PROMPT_GENERATOR = import.meta.env
  .VITE_BACKEND_PROMPT_DESCRIPTOR;
export const TOKEN = import.meta.env.VITE_RUNPOD;

const api = axios.create({
  baseURL: API_ENDPOINT,
});


/* STATUS COMPLETED EXAMPLE 
{
  "delayTime": 5026,
  "executionTime": 3385,
  "id": "a94bfa83-5fb8-4470-ab19-b6609a354a60-e1",
  "output": {
    "result": [],
    "status": "success"
  },
  "status": "COMPLETED"
}
*/
const pollStatus = (taskId: string) => {
  return new Promise((resolve, reject) => {
    const intervalId = setInterval(async () => {
      try {

        const statusResponse = await fetch(`${API_ENDPOINT_RENDER_IMAGE_STATUS}/${taskId}`, {
          method: 'GET',
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${TOKEN}`,
          },
        });
        const statusData = await statusResponse.json();
        console.log(statusData)
        if (typeof statusData.output === 'string' && statusData.output.includes('Progress')) {
          const progressMatch = statusData.output.match(/Progress (\d+)\/(\d+)/);
          if (progressMatch) {
            const currentStep = parseInt(progressMatch[1]);
            const totalSteps = parseInt(progressMatch[2]);
            const progressValue = Math.round((currentStep / totalSteps) * 100);
            toast({
              title: "PROGRESS:",
              description: `${progressValue}% PERCENT`,
            });

          }
        }
          else {
            toast({
              title: "IMAGE GENERATION:",
              description: `${statusData.status}`,
            });
          }

        if (statusData.status === 'COMPLETED') {
          // Task is completed, stop polling and retrieve the result
          clearInterval(intervalId);
          resolve({
            output: statusData.output,
            req_id: statusData.id, // Return the id from the response
          });
        } else if (statusData.status === 'FAILED') {
          // Handle failure case
          clearInterval(intervalId);
          reject(new Error('Task failed'));
        }
      } catch (error) {
        clearInterval(intervalId);
        reject(error);
      }
    }, 3000); // Poll every 5 seconds
  });
};

/* POST METHOD TO RENDER AN IMAGE  
*/
export async function renderImage(
  imageFile: File | Blob,
  imageObjects: File | Blob,
  prompt_positive: string,
  prompt_negative: string,
  width: number,
  height: number,
  light_option: string,
) {
  const imageBase64 = await convertToBase64(imageFile);
  const objectsBase64 = await convertToBase64(imageObjects);

  const res = await fetch(`${API_ENDPOINT_RENDER_IMAGE}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify({
      id: randomNumberInRange(1, 65536),
      input: {
        action: "RenderImage",
        image: imageBase64,
        image_objects: objectsBase64,
        prompt_positive: prompt_positive,
        prompt_negative: prompt_negative,
        width: width,
        height: height,
        light_option: light_option
      },
    }),
  });

  if (res.ok) {
    const responseData = await res.json(); // Parse JSON response
    console.log(responseData)
    const { id, status } = responseData;
    toast({
      // variant: "destructive",
      title: "IMAGE GENERATION:",
      description: `${status}`,
    });

    // await the result of pollstatus
    try {
      const { output, req_id } = await pollStatus(id);
      return {
        img_list: output.result, // Assuming result contains the image list
        seed: req_id, // Return the id from the response
      };
    } catch (error){
      throw new Error(`Polling failed: ${error.message}`);
    }
  }
  const errors = await res.json();
  throw new Error(`Something went wrong: ${errors.errors}`);
}
/* POST METHOD TO REMOVE BACKGROUND 
*/
export async function removeBackgroundApi(
  imageFile: File | Blob,
  model: string,
) {
  const imageBase64 = await convertToBase64(imageFile);

  const res = await fetch(`${API_ENDPOINT_RENDER_IMAGE}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify({
      id: randomNumberInRange(1, 65536),
      input: {
        action: "RemoveBackground",
        image: imageBase64,
        model: model,
      },
    }),
  });

  if (res.ok) {
    const responseData = await res.json(); // Parse JSON response
    console.log(responseData)
    const { id, status } = responseData;
    toast({
      // variant: "destructive",
      title: "REMOVE BACKGROUND:",
      description: `${status}`,
    });

    // await the result of pollstatus
    try {
      const { output, req_id } = await pollStatus(id);
      const blob = base64ToBlob(output.result[0]);
      return {
        blob: URL.createObjectURL(blob),
        seed: req_id, // Return the id from the response
      };
    } catch (error){
      throw new Error(`Polling failed: ${error.message}`);
    }
  }
  const errors = await res.json();
  throw new Error(`Something went wrong: ${errors.errors}`);
}

export async function uploadImageToDescriptor(imageFile: Blob) {

  const imageBase64 = await convertToBase64(imageFile);
  const res = await fetch(`${API_ENDPOINT_RENDER_IMAGE}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify({
      id: randomNumberInRange(1, 65536),
      input: {
        action: "TaggerImage",
        image: imageBase64,
      }
    }),
  });

  if (res.ok) {
    const responseData = await res.json(); // Parse JSON response
    console.log(responseData)
    const { id, status } = responseData;
    toast({
      // variant: "destructive",
      title: "PROMPT GENERATE:",
      description: `${status}`,
    });

    // await the result of pollstatus
    try {
      const { output, req_id } = await pollStatus(id);
      return {
        words_list: output.result[0],
      };
    } catch (error){
      throw new Error(`Polling failed: ${error.message}`);
    }
  }
  const errors = await res.json();
  throw new Error(`Something went wrong: ${errors.errors}`);
}


export default async function inpaint(
  imageFile: File | Blob,
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
