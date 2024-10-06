import { IconButton } from "@/components/ui/button";
import { useToggle } from "@uidotdev/usehooks";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "../ui/dialog";
import { MessageCircleQuestion } from "lucide-react";
import ReactPlayer from 'react-player/lazy'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"

import { useEffect, useState } from "react";
// import { useQuery } from "@tanstack/react-query";
import { ModelInfo, PluginName } from "@/lib/types";
import { useStore } from "@/lib/states";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogDescription
} from "../ui/alert-dialog";
import { useTranslation } from "react-i18next";

import useHotKey from "@/hooks/useHotkey";

const domain_dist = "https://d1d5i0xjsb5dtw.cloudfront.net/";



export interface Artwork {
    artist: string;
    art: string;
  }

export const works: Artwork[] = [
    {
      artist: "Adobe photos 1",
      art: `${domain_dist}photo-ai/Choose_background_youtube.mp4`,
    },
    {
      artist: "Adobe photos 2",
      art: `${domain_dist}photo-ai/Add_product_youtube.mp4`,
    },
    {
      artist: "Adobe photos 3",
      art: `${domain_dist}photo-ai/RemoveBackground_youtube.mp4`,
    },
    {
      artist: "Adobe photos 4",
      art: `${domain_dist}photo-ai/Keep_Original_image_youtube.mp4`,
    },
    {
      artist: "Adobe photos 5",
      art: `${domain_dist}photo-ai/Generate_prompt_and_image_youtube.mp4`,
    },
];

export function InstructionsDialog() {

  const { t } = useTranslation();

  const TAB_ADD_EXAMPLE_BACKGROUND = t("CHOOSE BACKGROUND SAMPLES");
  const TAB_ADD_IMAGES = t("ADD OWN IMAGES");
  const TAB_MODIFY_IMAGE = t("REMOVE BACKGROUND");
  const TAB_KEEP_ORIGINAL_OBJECT = t("KEEP ORIGINAL IMAGE");
  const TAB_PLACE_OBJECTS = t("PLACE YOUR OBJECTS");

  const TAB_INSTR = [TAB_ADD_EXAMPLE_BACKGROUND, 
    TAB_ADD_IMAGES, 
    TAB_MODIFY_IMAGE,  
    TAB_KEEP_ORIGINAL_OBJECT,
    TAB_PLACE_OBJECTS, 
    ]

const tabToVideoIndex = {
  [TAB_ADD_EXAMPLE_BACKGROUND]: 0,
  [TAB_ADD_IMAGES]: 1,
  [TAB_MODIFY_IMAGE]: 2,
  [TAB_KEEP_ORIGINAL_OBJECT]: 3,
  [TAB_PLACE_OBJECTS]: 4,
};
  const [tab, setTab] = useState(TAB_ADD_EXAMPLE_BACKGROUND);

  const [open, toggleOpen] = useToggle(false);

  const [
    updateAppState,
    settings,
    updateSettings,
    fileManagerState,
    setAppModel,
    serverConfig,
    updateServerConfig,
    setServerConfig,
  ] = useStore((state) => [
    state.updateAppState,
    state.settings,
    state.updateSettings,
    state.fileManagerState,
    state.setModel,
    state.serverConfig,
    state.updateServerConfig,
    state.setServerConfig,
  ]);
  // const { toast } = useToast();
  const [model, setModel] = useState<ModelInfo>(settings.model);
  const [modelSwitchingTexts, setModelSwitchingTexts] = useState<string[]>([]);
  const openModelSwitching = modelSwitchingTexts.length > 0;

  useEffect(() => {
    setModel(settings.model);
  }, [settings.model]);


  useHotKey(
    "s",
    () => {
      toggleOpen();
    },
    [open, model, serverConfig],
  );

  function onOpenChange(value: boolean) {
    toggleOpen();
  }

function CarouselDemo() {
  return (
    <Carousel className="w-full h-full">
      <CarouselContent>
        {TAB_INSTR.map((item) => (
          <CarouselItem key={item}>
            <div className="flex flex-col w-full justify-center">
            <span className="font-semibold">{item }</span> 
                  <div className="flex flex-grow w-full justify-center">
                  {tabToVideoIndex[item] !== undefined && renderInstructions(tabToVideoIndex[item])}
                 </div>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  )
}

  function renderInstructions(videoIndex: number) {  
    return (
      <div className="relative w-full h-full overflow-hidden rounded-md">
        <figure key={works[videoIndex].artist} className="w-full h-full">
        <ReactPlayer
          url={works[videoIndex].art}
          controls
          width="100%"
          height="auto"
          className="max-h-[200px] sm:max-h-[400px] md:max-h-[600px]"
        />
          <figcaption className="pt-2 text-xs text-muted-foreground">
            Video by{" "}
            <span className="font-semibold text-foreground">
              {works[videoIndex].artist}
            </span>
          </figcaption>
        </figure>
      </div>
    );
  }

  return (
    <>
      <AlertDialog open={openModelSwitching}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogDescription>
            <div className="flex flex-col justify-center items-center gap-4">
              <div role="status">
                <svg
                  aria-hidden="true"
                  className="w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-primary"
                  viewBox="0 0 100 101"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                    fill="currentColor"
                  />
                  <path
                    d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                    fill="currentFill"
                  />
                </svg>
                <span className="sr-only">Loading...</span>
              </div>
            </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogTrigger asChild>
          <IconButton tooltip="Help">
            <MessageCircleQuestion />
          </IconButton>
        </DialogTrigger>
        <DialogContent
  className="w-full max-w-md h-[500px] sm:max-w-xl sm:h-[700px] md:max-w-7xl md:h-[800px]"
>
  <DialogTitle>Instructions (swipe or click next for more) </DialogTitle>
  {CarouselDemo()}
</DialogContent>

      </Dialog>
    </>
  );
}

export default InstructionsDialog;
