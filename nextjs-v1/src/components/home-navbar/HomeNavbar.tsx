import Image from "next/image";
import { SidebarTrigger } from "../ui/sidebar";
import Link from "next/link";
import { Input } from "../ui/input";
import ProfileSection from "./ProfileSection";
import { ThemeToggle } from "./ThemeToggle";
import WatchVideoButton from "./WatchVideoButton";
import TopTitle from "./TopTitle";

const HomeNavbar = () => {
  return (
    <nav className="bg-secondary fixed top-0 right-0 left-0 z-50 flex h-16 items-center px-2 pr-5 transition-[left,right] duration-200 ease-linear md:peer-data-[state=collapsed]:left-[var(--sidebar-width-icon)] md:peer-data-[state=expanded]:left-[var(--sidebar-width)]">
      <div className="flex w-full items-center gap-4">
        <div className="text-foreground flex flex-shrink-0 items-center">
          <SidebarTrigger className="aspect-square h-max" />
          <Link href="/">
            <div className="flex items-center gap-1 p-4">
              <Image src="/icon.svg" alt="logo" width={32} height={32} />
              <TopTitle />
            </div>
          </Link>
        </div>

        {/* Watch Video Button */}

        {/* Search Bar (TODO: Replace with better deisgn from 21dev*/}
        {/* <div className='flex-1 flex justify-center max-w-[720px] mx-auto'>
                    <Input
                        placeholder='Search or start new chat'
                        className='rounded-full'
                    />
                </div> */}

        {/* Theme Toggle */}
        <div className="ms-auto flex items-center gap-2">
          {/* <WatchVideoButton /> */}
          <ThemeToggle />
          {/* <ProfileSection /> */}
        </div>
        {/* User Profile Section */}
      </div>
    </nav>
  );
};

export default HomeNavbar;
