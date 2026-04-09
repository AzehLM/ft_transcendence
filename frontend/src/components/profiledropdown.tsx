import { Link } from "react-router-dom";

export function ProfileDropdown({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />

      {/* Dropdown menu */}
      <div className="absolute bg-[rgba(230,225,224,0.71)] flex flex-col gap-1 right-8 top-[120px] px-2 py-2 rounded-[17px] shadow-[0px_2px_6px_0px_rgba(0,0,0,0.25)] w-[180px] z-50">
        <Link
          to="/settings"
          onClick={onClose}
          className="font-['IBM_Plex_Sans',sans-serif] text-[16px] text-[#2b1008] tracking-[0.3px] hover:bg-[rgba(222,115,86,0.2)] px-3 py-2 rounded-[10px] transition-colors"
        >
          Profile
        </Link>
        <Link
          to="/settings"
          onClick={onClose}
          className="font-['IBM_Plex_Sans',sans-serif] text-[16px] text-[#2b1008] tracking-[0.3px] hover:bg-[rgba(222,115,86,0.2)] px-3 py-2 rounded-[10px] transition-colors"
        >
          Storage
        </Link>
        <Link
          to="/settings"
          onClick={onClose}
          className="font-['IBM_Plex_Sans',sans-serif] text-[16px] text-[#2b1008] tracking-[0.3px] hover:bg-[rgba(222,115,86,0.2)] px-3 py-2 rounded-[10px] transition-colors"
        >
          Account
        </Link>
        <Link
          to="/organization"
          onClick={onClose}
          className="font-['IBM_Plex_Sans',sans-serif] text-[16px] text-[#2b1008] tracking-[0.3px] hover:bg-[rgba(222,115,86,0.2)] px-3 py-2 rounded-[10px] transition-colors"
        >
          Organisation
        </Link>
      </div>
    </>
  );
}