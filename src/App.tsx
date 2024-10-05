import { useCallback, useEffect, useRef } from "react";
import { Toaster } from "./components/ui/toaster";
import Header from "@/components/workspace/Header";
import Workspace from "@/components/workspace/Workspace";
import { useStore } from "./lib/states";
import { useWindowSize } from "react-use";
import { useRefContext } from "@/components/workspace/RefCanvas";
import { useImage } from "@/hooks/useImage";
import { FabricImage } from "fabric";
import { useToast } from "./components/ui/use-toast";

import { LOG_LEVELS } from "./lib/const";
import { debugLog } from "./lib/utils";
import { SUPPORTED_FILE_TYPE } from "@/lib/const";

function Home() {
  const [
    file,
    handleSaveState,
    updateAppState,
    setFile,
    scaledWidth,
    scaledHeight,
  ] = useStore((state) => [
    state.file,
    state.handleSaveState,
    state.updateAppState,
    state.setFile,
    state.scaledWidth,
    state.scaledHeight,
  ]);

  const { fabricRef } = useRefContext();
  const [image, isLoaded] = useImage(file);
  const { toast } = useToast();

  const windowSize = useWindowSize();

  useEffect(() => {
    updateAppState({ windowSize });
  }, [windowSize]);

  const dragCounter = useRef(0);

  const handleDrag = useCallback((event: any) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleDragIn = useCallback((event: any) => {
    event.preventDefault();
    event.stopPropagation();
    dragCounter.current += 1;
  }, []);

  const handleDragOut = useCallback((event: any) => {
    event.preventDefault();
    event.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current > 0) return;
  }, []);

  const handleDrop = useCallback((event: any) => {
    event.preventDefault();
    event.stopPropagation();
    if (!fabricRef.current) return;
    const data = event.dataTransfer;
    if (data?.files && data.files.length > 0) {
      const dragFile = data.files[0];
      const fileType = dragFile.type;

      if (SUPPORTED_FILE_TYPE.includes(fileType)) {
        setFile(dragFile);
      } else {
        toast({
          variant: "destructive",
          description: "Please drag and drop an image file",
        });
      }
    } else {
      const url = data?.getData("text/plain");
      if (url) {
        setFile(url);
      }
    }
    event.dataTransfer.clearData();
  }, []);

  const onPaste = useCallback((event: any) => {
    // TODO: when sd side panel open, ctrl+v not work
    // https://htmldom.dev/paste-an-image-from-the-clipboard/
    if (!event.clipboardData) {
      return;
    }
    const clipboardItems = event.clipboardData.items;
    const items: DataTransferItem[] = [].slice
      .call(clipboardItems)
      .filter((item: DataTransferItem) => {
        // Filter the image items only
        return item.type.indexOf("image") !== -1;
      });

    if (items.length === 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    toast({
      title: "NUEVA IMAGEN",
      description: "Haz pegado una imagen",
    });

    const item = items[0];
    // Get the blob of image
    const blob = item.getAsFile();
    if (blob) {
      setFile(blob);
    }
  }, []);

  useEffect(() => {
    if (isLoaded && fabricRef.current && image) {
      // Ensure that fabricRef.current and scaledImage's dimensions are defined
      const canvasWidth = fabricRef.current.width ?? 0;
      const canvasHeight = fabricRef.current.height ?? 0;
      const imageWidth = image?.width ?? 1;
      const imageHeight = image?.height ?? 1;
      let scaleX = 1; // default
      let scaleY = 1; // default
      if (imageWidth + imageHeight > scaledWidth + scaledHeight) {
        scaleX = scaledWidth / imageWidth;
        scaleY = scaledHeight / imageHeight;
      }
      // Calculate integer scale factor
      const integerScale = Math.floor(Math.min(scaleX, scaleY) * 100) / 100;

      // Scale the image with integer scale factor
      const scaledImage = new FabricImage(image, {
        originX: "center",
        originY: "center",
      });

      //   scaledImage.resizeFilter = new fabric.filters.Resize({
      //     resizeType: 'lanczos', // typo fixed
      //     lanczosLobes: 3 // typo fixed
      // })

      scaledImage.scaleX = integerScale;
      scaledImage.scaleY = integerScale;

      //********* How to apply filters */
      // const filter = new fabric.filters.Convolute({
      //   matrix: [ -1, -1,  -1,
      //            -1,  9, -1,
      //            -1, -1,  -1 ]
      // });
      // scaledImage.filters.push(filter)
      // scaledImage.applyFilters();

      const centerX = canvasWidth / 2;
      const centerY = canvasHeight / 2;

      scaledImage.set({
        left: centerX,
        top: centerY,
        img_view: "modify", // created custom property in object
      });

      debugLog(LOG_LEVELS.DEBUG, "imageWidth, imageHeigth", [
        imageWidth,
        imageHeight,
      ]);
      debugLog(LOG_LEVELS.DEBUG, "img scale added", integerScale);
      debugLog(
        LOG_LEVELS.DEBUG,
        "img canvas plane Matrix Transf\n",
        scaledImage.calcTransformMatrix(),
      );
      debugLog(
        LOG_LEVELS.DEBUG,
        "img Object plane Matrix Transf\n",
        scaledImage.calcOwnMatrix(),
      );

      // add image
      fabricRef.current.add(scaledImage);
      toast({
        variant: "success",
        title: "NUEVA IMAGEN",
        description: "Nueva imagen agregada",
      });
      handleSaveState(fabricRef.current);
    }
  }, [image, isLoaded]);

  useEffect(() => {
    window.addEventListener("dragenter", handleDragIn);
    window.addEventListener("dragleave", handleDragOut);
    window.addEventListener("dragover", handleDrag);
    window.addEventListener("drop", handleDrop);
    window.addEventListener("paste", onPaste);
    return function cleanUp() {
      window.removeEventListener("dragenter", handleDragIn);
      window.removeEventListener("dragleave", handleDragOut);
      window.removeEventListener("dragover", handleDrag);
      window.removeEventListener("drop", handleDrop);
      window.removeEventListener("paste", onPaste);
    };
  });

  return (
    // <main className="flex min-h-screen flex-col items-center justify-between w-full bg-[radial-gradient(circle_at_1px_1px,_#8e8e8e8e_1px,_transparent_0)] [background-size:20px_20px] bg-repeat">
    <main className="flex min-h-screen flex-col items-center [background-size:20px_20px]">
      <Toaster />
      <Header />
      <Workspace />
    </main>
  );
}

export default Home;
