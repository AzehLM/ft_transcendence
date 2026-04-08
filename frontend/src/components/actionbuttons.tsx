import { FilePlus, UploadCloud, FolderPlus } from "lucide-react";

export function ActionButtons() {
    return (
      <div className="absolute left-[288px] top-[120px] flex gap-[24px]">
        {/* Create files button */}
        <button className="bg-[#de7356] h-[90px] rounded-[17px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] w-[200px] flex items-center justify-center gap-3 hover:opacity-90 transition-opacity">
          <FilePlus className="size-[32px] text-[#2b1008]" />
          <span className="font-['IBM_Plex_Sans',sans-serif] font-medium text-[20px] text-[#2b1008] tracking-[0.5px] leading-tight">
            Create<br/>files
          </span>
        </button>
  
        {/* Create folder button */}
        <button className="bg-[#eeb9aa] h-[90px] rounded-[17px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] w-[200px] flex items-center justify-center gap-3 hover:opacity-90 transition-opacity">
          <FolderPlus className="size-[32px] text-[#2b1008]" />
          <span className="font-['IBM_Plex_Sans',sans-serif] font-medium text-[20px] text-[#2b1008] tracking-[0.5px] leading-tight">
            Create<br/>folder
          </span>
        </button>
  
        {/* Upload button */}
        <button className="bg-[#e6957f] h-[90px] rounded-[17px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] w-[200px] flex items-center justify-center gap-3 hover:opacity-90 transition-opacity">
          <UploadCloud className="size-[32px] text-[#2b1008]" />
          <span className="font-['IBM_Plex_Sans',sans-serif] font-medium text-[20px] text-[#2b1008] tracking-[0.5px]">
            Upload
          </span>
        </button>
      </div>
    );
  }