import { useEffect, useState } from "react";
import { dataURItoBlob, urlToDataURI } from "@/lib/utils";

type ImageInput = File | string | null;


function useImage(input: ImageInput): [HTMLImageElement, boolean] {
  const [image] = useState(new Image());
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let file: File | null = null;

    const loadImage = async () => {
      if (!input) return;

      setIsLoaded(false);

      if (typeof input === 'string') {
        const dataURI = await urlToDataURI(input);
        const blob = dataURItoBlob(dataURI);
        file = new File([blob], 'image', { type: blob.type });
      } else {
        file = input;
      }

      if (file) {
        image.src = URL.createObjectURL(file);
        image.onload = () => {
          setIsLoaded(true);
        };
      }
    };

    loadImage();

    return () => {
      image.onload = null;

    };
  }, [input, image]);

  return [image, isLoaded];
}

export { useImage };