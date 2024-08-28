// import { PlayIcon } from "@radix-ui/react-icons";
// import { useState } from "react";
import Shortcuts from "@/components/Shortcuts";
// import { useStore } from "@/lib/states";
// import { RotateCw, Image, Upload } from "lucide-react";
import SettingsDialog from "./Settings";
import LanguageSwitcher from "./LanguageSwitcher";
import PromptInput from "./PromptInput";
// import { ScrollArea } from "@/components/ui/scroll-area";

// import { IconButton, ImageUploadButton } from "@/components/ui/button";

// const images = [
//   'https://via.placeholder.com/150',
//   'https://via.placeholder.com/150',
//   'https://via.placeholder.com/150',

// ];

// interface VerticalImageScrollProps {
//   images: string[];
// }

// export function ScrollAreaImages(props: VerticalImageScrollProps) {
//   const { images } = props;

//   const handleImageClick = (src: string) => {
//     // Perform the action you want when the image is clicked.
//     // For example, you can log the image source.
//     console.log('Image clicked:', src);
//   };

//   return (
//     <ScrollArea className="h-72 w-48 rounded-md border overflow-y-auto">
//       {images.map((src, index) => (
//         <figure key={index} className="shrink-0">
//           <div className="overflow-hidden rounded-md">
//             <img
//               src={src}
//               alt={`image-${index}`}
//               className="aspect-[3/4] h-fit w-fit object-cover cursor-pointer"
//               onClick={() => handleImageClick(src)}
//             />
//           </div>
//         </figure>
//       ))}
//     </ScrollArea>
//   );
// }

const Header = () => {
  // const [
  //   file,
  //   customMask,
  //   isInpainting,
  //   serverConfig,
  //   runMannually,
  //   enableUploadMask,
  //   model,
  //   setFile,
  //   setCustomFile,
  //   runInpainting,
  //   showPrevMask,
  //   hidePrevMask,
  //   imageHeight,
  //   imageWidth,
  // ] = useStore((state) => [
  //   state.file,
  //   state.customMask,
  //   state.isInpainting,
  //   state.serverConfig,
  //   state.runMannually(),
  //   state.settings.enableUploadMask,
  //   state.settings.model,
  //   state.setFile,
  //   state.setCustomFile,
  //   state.runInpainting,
  //   state.showPrevMask,
  //   state.hidePrevMask,
  //   state.imageHeight,
  //   state.imageWidth,
  // ]);
  return (
    <header className="h-[60px] px-6 py-4 absolute top-[0] flex justify-between items-center w-full z-20 border-b backdrop-filter backdrop-blur-md bg-background/70">
      {/* <div className="flex items-center gap-1">
        <ImageUploadButton
          disabled={isInpainting}
          tooltip="Upload image"
          onFileUpload={(file) => {
            setFile(file);
          }}
        >
          <Image />
        </ImageUploadButton>
      </div> */}

      {/* {model.need_prompt ? <PromptInput /> : <></>} */}
      <PromptInput />

      <div className="flex gap-1">
        <LanguageSwitcher />
        <Shortcuts />
        <SettingsDialog />
      </div>

      {/* <div className="flex gap-3 absolute top-[150px] left-[24px] items-center">
      <ScrollAreaImages images={images} />
      </div>
       */}
    </header>
  );
};

export default Header;
