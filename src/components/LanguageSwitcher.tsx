// src/components/LanguageSwitcher.tsx
import React, { useEffect } from "react";
import { useLanguageStore } from "@/lib/states";
import { useTranslation } from "react-i18next";

import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandList,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const languages = [
  { label: "English", value: "en" },
  { label: "Español", value: "es" },
];

export function LanguageSwitcher() {
  const [language, setLanguage] = useLanguageStore((state) => [
    state.language,
    state.setLanguage,
  ]);
  const {
    i18n: { changeLanguage },
  } = useTranslation();
  const [open, setOpen] = React.useState(false);

  useEffect(() => {
    // Detect browser language
    const browserLanguage = navigator.language.slice(0, 2); // Get first two characters of the language code
    const supportedLanguage = languages.find(
      (lang) => lang.value === browserLanguage,
    );

    if (supportedLanguage) {
      setLanguage(browserLanguage);
      changeLanguage(browserLanguage);
    }
  }, [changeLanguage, setLanguage]);

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    changeLanguage(lang);
    setOpen(false); // Close the popover
  };

  return (
    <div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className="w-[150px] justify-between"
          >
            {language
              ? languages.find((lang) => lang.value === language)?.label
              : "Select language"}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[150px] p-2">
          <Command>
            <CommandList>
              <CommandGroup heading="Suggestions">
                {languages.map((lang) => (
                  <CommandItem
                    key={lang.value}
                    onSelect={() => handleLanguageChange(lang.value)}
                  >
                    <Check
                      className={`mr-2 h-4 w-4 ${lang.value === language ? "opacity-100" : "opacity-0"}`}
                    />
                    {lang.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default LanguageSwitcher;
