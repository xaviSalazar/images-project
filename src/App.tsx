import { useCallback, useEffect, useRef } from "react";
import { Toaster } from "./components/ui/toaster";
import Header from "@/components/Header";
import Workspace from "@/components/Workspace";
import { useStore } from "./lib/states";
import FileSelect from "@/components/FileSelect";
import { useWindowSize } from "react-use";

const SUPPORTED_FILE_TYPE = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/bmp",
  "image/tiff",
];

function Home() {
  const [file, updateAppState, setServerConfig, setFile] = useStore((state) => [
    state.file,
    state.updateAppState,
    state.setServerConfig,
    state.setFile,
  ]);

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
    const data = event.dataTransfer;
    if (data?.files && data.files.length > 0) {
      const dragFile = data.files[0];
      const fileType = dragFile.type;

      if (SUPPORTED_FILE_TYPE.includes(fileType)) {
        setFile(dragFile);
      } else {
        // setToastState({
        //   open: true,
        //   desc: "Please drag and drop an image file",
        //   state: "error",
        //   duration: 3000,
        // })
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

    // TODO: add confirm dialog

    const item = items[0];
    // Get the blob of image
    const blob = item.getAsFile();
    if (blob) {
      setFile(blob);
    }
  }, []);

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
    <main className="flex min-h-screen flex-col items-center justify-between w-full bg-[radial-gradient(circle_at_1px_1px,_#8e8e8e8e_1px,_transparent_0)] [background-size:20px_20px] bg-repeat">
      <Toaster />
      <Header />
      <Workspace />
      {!file ? (
        <FileSelect
          onSelection={async (f) => {
            setFile(f);
          }}
        />
      ) : (
        <></>
      )}
    </main>
  );
}

export default Home;