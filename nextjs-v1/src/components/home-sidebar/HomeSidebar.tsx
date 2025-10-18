import { Sidebar, SidebarContent } from "@/components/ui/sidebar";
import MainSection from "./MainSection";
import { Separator } from "../ui/separator";
import PersonalSection from "./personalSection";

import BottomSection from "./BottomSection";
import TranscriptsSection from "./transcriptsSection";
// import FullstackPortfolioSection from "../home-sidebar/TestingSection";

const HomeSidebar = () => {
  return (
    <Sidebar className="z-40 border-none pt-16" collapsible="icon">
      <SidebarContent className="bg-background">
        <MainSection />
        <Separator />
        {/* <PersonalSection/> */}
        <TranscriptsSection />
        <div className="mt-auto">
          <Separator />
          {/* <BottomSection /> */}
        </div>
      </SidebarContent>
    </Sidebar>
  );
};

export default HomeSidebar;
