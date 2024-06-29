import { useEffect, useState, useRef } from "react";
import { dataURItoBlob, urlToDataURI } from "@/lib/utils";

type ImageInput = File | string | null;

function useImage(input: ImageInput): [HTMLImageElement | null, boolean] {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));

  const predefinedRatios = [
    { ratio: 1, width: 1024, height: 1024 },
    { ratio: 3 / 2, width: 1152, height: 768 },
    { ratio: 2 / 3, width: 768, height: 1152 },
    { ratio: 4 / 3, width: 1152, height: 864 },
    { ratio: 3 / 4, width: 864, height: 1152 },
    { ratio: 16 / 9, width: 1360, height: 768 },
    { ratio: 9 / 16, width: 768, height: 1360 },
  ];

  const getClosestDimensions = (width: number, height: number) => {
    const aspectRatio = width / height;

    let closest = predefinedRatios[0];
    let minDiff = Math.abs(aspectRatio - predefinedRatios[0].ratio);

    for (const ratioObj of predefinedRatios) {
      const diff = Math.abs(aspectRatio - ratioObj.ratio);
      if (diff < minDiff) {
        closest = ratioObj;
        minDiff = diff;
      }
    }

    return { targetWidth: closest.width, targetHeight: closest.height };
  };

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
          const { targetWidth, targetHeight } = getClosestDimensions(newImage.width, newImage.height);

          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');

          canvas.width = targetWidth;
          canvas.height = targetHeight;

          const scaleX = targetWidth / newImage.width;
          const scaleY = targetHeight / newImage.height;
          const scale = Math.min(scaleX, scaleY);

          const x = (canvas.width / 2) - (newImage.width / 2) * scale;
          const y = (canvas.height / 2) - (newImage.height / 2) * scale;

          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(newImage, x, y, newImage.width * scale, newImage.height * scale);

          const resizedImage = new Image();
          resizedImage.src = canvas.toDataURL('image/png'); // Use PNG to preserve transparency
          resizedImage.onload = () => {
            setIsLoaded(true);
            setImage(resizedImage);
          };
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
