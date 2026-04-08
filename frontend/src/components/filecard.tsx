export function FileCard({ name }: { name: string }) {
    return (
      <div className="relative w-full max-w-[317px] h-[203px] cursor-pointer hover:scale-105 transition-transform">
        <div className="absolute bg-[rgba(230,225,224,0.71)] inset-0 rounded-[17px]" />
        <div className="absolute bg-[#f7dcd4] blur-[14.5px] h-[182px] left-[19px] top-[8px] w-[280px]" />
        <div className="absolute bottom-6 left-[19px] right-[19px] font-['IBM_Plex_Sans',sans-serif] text-[20px] text-[#2b1008] tracking-[0.5px] truncate">
          {name}
        </div>
      </div>
    );
  }