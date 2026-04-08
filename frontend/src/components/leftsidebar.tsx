import { ChevronDown, Folder, Trash2, Files, Package} from "lucide-react";
import { Link } from "react-router";

export function LeftSidebar({ foldersExpanded, setFoldersExpanded }: { foldersExpanded: boolean; setFoldersExpanded: (expanded: boolean) => void }) {
    return (
      <div className="absolute h-full left-0 top-0 w-[237px]">
        <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 237 1024">
          <g filter="url(#filter0_i_79_852)">
            <path d="M237 1024H0V0H237V1024Z" fill="#E6E1E0" fillOpacity="0.71" />
          </g>
          <defs>
            <filter colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse" height="1024" id="filter0_i_79_852" width="237" x="0" y="0">
              <feFlood floodOpacity="0" result="BackgroundImageFix" />
              <feBlend in="SourceGraphic" in2="BackgroundImageFix" mode="normal" result="shape" />
              <feColorMatrix in="SourceAlpha" result="hardAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" />
              <feOffset />
              <feGaussianBlur stdDeviation="3.5" />
              <feComposite in2="hardAlpha" k2="-1" k3="1" operator="arithmetic" />
              <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
              <feBlend in2="shape" mode="normal" result="effect1_innerShadow_79_852" />
            </filter>
          </defs>
        </svg>
  
        <div className="absolute left-[35px] top-[45px]">
          <Link to="/" className="font-['IBM_Plex_Sans',sans-serif] font-extrabold text-[24px] text-[#d54f2a] flex items-center gap-2">
            <Package className="size-6" />
            ft_box
          </Link>
        </div>
  
        {/* All files button - selected state */}
        <div className="absolute top-[150px] left-0 w-[237px] h-[61px]">
          <div className="absolute bg-[#ddd] inset-0 rounded-[inherit] shadow-[inset_-4px_0px_1px_0px_rgba(0,0,0,0.08)]" />
          <div className="absolute left-[22px] top-1/2 -translate-y-1/2 flex items-center gap-3">
            <Files className="size-[29px] text-[#0a0909]" />
            <span className="font-['IBM_Plex_Sans',sans-serif] text-[26px] text-[#0a0909] tracking-[0.5px]">
              All files
            </span>
          </div>
        </div>
  
        {/* Folders button */}
        <button
          onClick={() => setFoldersExpanded(!foldersExpanded)}
          className="absolute top-[233px] left-[20px] flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <ChevronDown className={`size-[37px] text-[#2b1008] transition-transform ${foldersExpanded ? '' : '-rotate-90'}`} />
          <span className="font-['IBM_Plex_Sans',sans-serif] text-[26px] text-[#0a0909] tracking-[0.5px]">
            Folders
          </span>
        </button>
  
        {/* Folder items */}
        {foldersExpanded && (
          <>
            <button className="absolute top-[297px] left-[46px] flex items-center gap-3 hover:opacity-80 transition-opacity">
              <Folder className="size-[30px] text-[#0a0909]" />
              <span className="font-['IBM_Plex_Sans',sans-serif] text-[26px] text-[#0a0909] tracking-[0.5px]">
                Invoices
              </span>
            </button>
  
            <button className="absolute top-[341px] left-[46px] flex items-center gap-3 hover:opacity-80 transition-opacity">
              <Folder className="size-[30px] text-[#0a0909]" />
              <span className="font-['IBM_Plex_Sans',sans-serif] text-[26px] text-[#0a0909] tracking-[0.5px]">
                Reports
              </span>
            </button>
          </>
        )}
  
        {/* Trash button - positioned with consistent spacing */}
        <button className={`absolute ${foldersExpanded ? 'top-[412px]' : 'top-[316px]'} left-[27px] flex items-center gap-3 hover:opacity-80 transition-all`}>
          <Trash2 className="size-[30px] text-[#0a0909]" />
          <span className="font-['IBM_Plex_Sans',sans-serif] text-[26px] text-[#0a0909] tracking-[0.5px]">
            Trash
          </span>
        </button>
      </div>
    );
  }