import { PlayIcon } from "@radix-ui/react-icons"
import { useState } from "react"
import Shortcuts from "@/components/Shortcuts"


import { IconButton, ImageUploadButton } from "@/components/ui/button"

const Header = () => {

    return (
        <header className="h-[60px] px-6 py-4 absolute top-[0] flex justify-between items-center w-full z-20 border-b backdrop-filter backdrop-blur-md bg-background/70">
                  <div className="flex items-center gap-1">
                <div className="flex gap-1">
                    <Shortcuts />
                </div>

                </div>
        </header>

    )


}

export default Header
