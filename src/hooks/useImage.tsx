import { useEffect, useState } from "react";
import { dataURItoBlob, urlToDataURI } from "@/lib/utils";

type ImageInput = File | string | null;

function useImage(input: ImageInput): [HTMLImageElement | null, boolean] {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!input) return;

    setIsLoaded(false);
    const newImage = new Image();

    const loadImage = async () => {
      let file: File | null = null;

      if (typeof input === "string") {
        const dataURI = await urlToDataURI(input);
        const blob = dataURItoBlob(dataURI);
        file = new File([blob], "image", { type: blob.type });
      } else {
        file = input;
      }

      if (file) {
        newImage.src = URL.createObjectURL(file);
        newImage.onload = () => {
          setIsLoaded(true);
          setImage(newImage);
        };
      }
    };

    loadImage();

    return () => {
      newImage.onload = null;
    };
  }, [input]);

  return [image, isLoaded];
}

export { useImage };
