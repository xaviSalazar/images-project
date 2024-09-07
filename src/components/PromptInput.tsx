import React, { FormEvent, useRef } from "react";
import { Button } from "./ui/button";
import { useStore } from "@/lib/states";
import { useClickAway, useToggle } from "react-use";
import { Textarea } from "./ui/textarea";
import { cn } from "@/lib/utils";
import { ReloadIcon } from "@radix-ui/react-icons"

const PromptInput = () => {
  const [
    runDescribeImg,
    runImgRendering,
    isProcessing,
    updateSettings,
    runInpainting,
    showPrevMask,
    hidePrevMask,
    isInpainting,
  ] = useStore((state) => [
    state.runDescribeImg,
    state.runImgRendering,
    state.getIsProcessing(),
    state.updateSettings,
    state.runInpainting,
    state.showPrevMask,
    state.hidePrevMask,
    state.isInpainting,
  ]);

  const prompt = useStore((state) => state.settings.prompt);

  const [showScroll, toggleShowScroll] = useToggle(false);

  const ref = useRef(null);
  useClickAway<MouseEvent>(ref, () => {
    if (ref?.current) {
      const input = ref.current as HTMLTextAreaElement;
      input.blur();
    }
  });

  const handleOnInput = (evt: FormEvent<HTMLTextAreaElement>) => {
    evt.preventDefault();
    evt.stopPropagation();
    const target = evt.target as HTMLTextAreaElement;
    updateSettings({ prompt: target.value });
  };

  const handleRepaintClick = () => {
    if (!isInpainting) {
      runImgRendering()
      // runDescribeImg();
      // replace with model to call actually
      // runInpainting()
    }
  };

  const handleDescribeImg= () => {
    if (!isInpainting) {
      runDescribeImg();
      // replace with model to call actually
      // runInpainting()
    }
  };

  const onKeyUp = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.ctrlKey && prompt.length !== 0) {
      //  handleRepaintClick()
    }
  };

  // const onMouseEnter = () => {
  //   showPrevMask();
  // };

  // const onMouseLeave = () => {
  //   hidePrevMask();
  // };

  return (
    <div className="flex gap-4 relative w-full justify-center h-full">
      <div className="absolute flex gap-4">
      <Button
          variant="outline"
          size="sm"
          onClick={handleDescribeImg}
          disabled={isInpainting}
        >
        {isInpainting && <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />}
          GENERATE PROMPT
        </Button>

        <Textarea
          ref={ref}
          placeholder="Write PROMPT here..."
          className={cn(
            showScroll ? "focus:overflow-y-auto" : "overflow-y-hidden",
            "min-h-[32px] h-[32px] overflow-x-hidden focus:h-[120px] overflow-y-hidden transition-[height] w-[500px] py-2 px-3 bg-white text-black border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 resize-none"
          )}
          style={{
            scrollbarGutter: "stable",
          }}
          value={prompt}
          onInput={handleOnInput}
          onKeyUp={onKeyUp}
          onTransitionEnd={toggleShowScroll}
        />
        <Button
          size="sm"
          onClick={handleRepaintClick}
          disabled={isInpainting}
          // onMouseEnter={onMouseEnter}
          // onMouseLeave={onMouseLeave}
        >
          {isInpainting && <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />}
          Paint
        </Button>
      </div>
    </div>
  );
};

export default PromptInput;
