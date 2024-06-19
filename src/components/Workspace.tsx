import React from "react";
import { useEffect } from "react";
import Editor from "./Editor";
import { currentModel } from "@/lib/api";
import { useStore } from "@/lib/states";
import ImageSize from "./ImageSize";
import Plugins from "./Plugins";
// import { InteractiveSeg } from "./InteractiveSeg"
import RightSidePanel from "./RightSidePanel";
// import DiffusionProgress from "./DiffusionProgress"
import { ModelInfo } from "@/lib/types";
import LeftSidePanel from "./LeftSidePanel";

const model: ModelInfo = {
  name: "Fantasy-Studio/Paint-by-Example",
  path: "Fantasy-Studio/Paint-by-Example",
  model_type: "diffusers_other",
  is_single_file_diffusers: false,
  need_prompt: false,
  controlnets: [],
  support_strength: false,
  support_outpainting: false,
  support_lcm_lora: false,
  support_controlnet: false,
  support_freeu: false,
};

const Workspace = () => {
  // remember only valid inside function
  const fabricRef = React.useRef<fabric.Canvas | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  const [file, updateSettings] = useStore((state) => [
    state.file,
    state.updateSettings,
  ]);

  // TO UPDATE TO SELECT CURRENT MODEL WITHIN INTERFACE
  useEffect(() => {
    // const fetchCurrentModel = async () => {
    //   const model = await currentModel();
    //   updateSettings({ model });
    // };
    // fetchCurrentModel();
    updateSettings({ model });
  }, []);

  return (
    <>
      <div className="flex gap-3 absolute top-[68px] left-[24px] items-center">
        {/* <Plugins />
        <ImageSize /> */}
      </div>
      {/* <InteractiveSeg />
      <DiffusionProgress />*/}
      <LeftSidePanel fabricRef={fabricRef} />
      <RightSidePanel />
      {file ? (
        <Editor fabricRef={fabricRef} file={file} ref={canvasRef} />
      ) : (
        <></>
      )}
    </>
  );
};

export default Workspace;
