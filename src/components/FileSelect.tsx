import { useState } from "react";
import useResolution from "@/hooks/useResolution";
import { useTranslation } from "react-i18next";

type FileSelectProps = {
  onSelection: (file: File) => void;
};

export default function FileSelect(props: FileSelectProps) {
  const { onSelection } = props;

  const { t } = useTranslation();

  const [uploadElemId] = useState(`file-upload-${Math.random().toString()}`);

  const resolution = useResolution();

  const onFileSelected = async (file: File) => {
    if (!file) {
      return;
    }
    // Skip non-image files
    const isImage = file.type.match("image.*");
    if (!isImage) {
      return;
    }
    try {
      // Check if file is larger than 20mb
      // if (file.size > 20 * 1024 * 1024) {
      //   throw new Error("file too large");
      // }
      onSelection(file);
    } catch (e) {
      // eslint-disable-next-line
      alert(`error: ${(e as any).message}`);
    }
  };

  return (
    <div className="absolute flex w-screen h-screen justify-center items-center pointer-events-none">
      <label
        htmlFor={uploadElemId}
        className="grid bg-background border-[2px] border-[dashed] rounded-lg min-w-[600px] hover:bg-primary hover:text-primary-foreground pointer-events-auto"
      >
        <div
          className="grid p-16 w-full h-full"
          onDragOver={(ev) => {
            ev.stopPropagation();
            ev.preventDefault();
          }}
        >
          <input
            className="hidden"
            id={uploadElemId}
            name={uploadElemId}
            type="file"
            onChange={(ev) => {
              const file = ev.currentTarget.files?.[0];
              if (file) {
                onFileSelected(file);
              }
            }}
            accept="image/png, image/jpeg"
          />

          <p className="text-center">
            {resolution === "desktop"
              ? t("Image load")
              : "Tap here to load your picture"}
          </p>
        </div>
      </label>
    </div>
  );
}
