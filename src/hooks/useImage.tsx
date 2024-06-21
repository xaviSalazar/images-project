import { useEffect, useState } from "react";

type ImageInput = File | string | null;


function useImage(file: ImageInput): [HTMLImageElement, boolean] {
  const [image] = useState(new Image());
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!file) {
      return;
    }
    image.onload = () => {
      setIsLoaded(true);
    };
    setIsLoaded(false);

    if (typeof file === 'string') {
      image.src = file;
    } else {
      image.src = URL.createObjectURL(file);
    }
    return () => {
      image.onload = null;
      if (typeof file !== 'string') {
        URL.revokeObjectURL(image.src); // Clean up the object URL
      }
    };
  }, [file, image]);

  return [image, isLoaded];
}

export { useImage };
