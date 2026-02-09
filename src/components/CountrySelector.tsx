import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Globe, Copy } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useLanguageStore } from "@/stores/language-store";
import { getEnabledCountries, getCountryByCode } from "@/config/countries";
import { countryDetectionService } from "@/utils/country-detection";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";



export const CountrySelector = () => {

  const { setCountry, country: countryCode, setLanguage } = useLanguageStore();
  const [selectedCountry, setSelectedCountry] = useState(countryCode);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [copiableLink, setCopiableLink] = useState("");
  const [selectedCountryName, setSelectedCountryName] = useState<string>("");
  const { toast } = useToast();

  const navigate = useNavigate();
  const location = useLocation();
  const countries = getEnabledCountries();
  
  const languages = [
    { code: "en", name: "English" },
    { code: "vi", name: "Tiếng Việt" },
    { code: "id", name: "Bahasa Indonesia" },
    { code: "tl", name: "ไทย" },
  ];

  const onSelectCountry = (code: string) => {
    setCountry(code);
    const newPath = countryDetectionService.addCountryToPath(location.pathname, code);
    const country = getCountryByCode(code);
    const fullLink = `${window.location.origin}${newPath}`;

    // Navigate to the country-based path (replace current history entry)
    if (newPath !== location.pathname) {
      navigate(newPath, { replace: true });
    }

    // Prepare dialog content and open
    setSelectedCountry(code);
    setSelectedCountryName(country?.name ?? code.toUpperCase());
    setCopiableLink(fullLink);
    setIsDialogOpen(true);
  };

  const handleLanguageSelect = (code: string) => {
    setLanguage(code as any);
    toast({
      title: "Language changed",
      description: `Language set to ${code.toUpperCase()}`,
    });
  };


  return (
    <div className="w-full py-6  ">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-center gap-4 mb-4">
          <Globe className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Select Country</h3>
        </div>
        
        <Tabs value={selectedCountry} onValueChange={(code) => { setSelectedCountry(code); onSelectCountry(code); }} className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-4xl mx-auto h-auto gap-2">
            {countries.map((country) => (
              <TabsTrigger
                key={country.code}
                value={country.code}
                className="flex flex-col items-center gap-1 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <span className="text-2xl">{country.flag}</span>
                <span className="text-xs font-medium">{country.name}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Selection confirmation dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>
                You have selected {selectedCountryName}
              </DialogTitle>
              <DialogDescription>
                Now you can copy this link for future or change language.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <Button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(copiableLink);
                    toast({
                      title: "Link copied",
                      description: "Country link copied to clipboard.",
                    });
                  } catch (e) {
                    toast({
                      title: "Copy failed",
                      description: "Unable to copy link. Please try again.",
                      variant: "destructive",
                    } as any);
                  }
                }}
                className="w-full justify-center gap-2"
              >
                <Copy className="h-4 w-4" /> Copy Country Link
              </Button>

              <div className="space-y-2">
                <div className="text-sm font-medium">Language</div>
                <Select onValueChange={(code) => handleLanguageSelect(code)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};
