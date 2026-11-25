import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import founder from "@/assets/fahad-shajahan.jpg.asset.json";

// Lovable assets resolve only on Lovable domains; other hosts (Vercel) serve a GitHub copy from /team/.
const photo = () => typeof window === "undefined" || /lovable\.(app|dev)$/.test(window.location.hostname) || window.location.hostname === "localhost" ? founder.url : `/team/${founder.original_filename}`;
export function TeamButton() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="nav" aria-label="Created by" title="Created by">
          <Users size={16} />
          <span className="truncate sidebar-label">Created by</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent side="right" align="end" className="w-60 text-center">
        <img src={photo()} alt="Fahad Shajahan" loading="lazy" className="size-24 rounded-full object-cover mx-auto border border-border" />
        <p className="mt-3 font-semibold">FAHAD SHAJAHAN</p>
        <p className="text-[11px] text-muted-foreground mt-1">Founder &amp; Developer</p>
      </PopoverContent>
    </Popover>
  );
}
