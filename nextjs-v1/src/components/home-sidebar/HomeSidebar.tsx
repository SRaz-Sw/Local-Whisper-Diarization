import { Sidebar, SidebarContent } from "@/components/ui/sidebar";
import MainSection from "./MainSection";
import { Separator } from "../ui/separator";
import TranscriptsSection from "./transcriptsSection";
import BatchUploadSection from "./BatchUploadSection";

const HomeSidebar = () => {
  return (
    <Sidebar className="z-40 border-none pt-16" collapsible="icon">
      <SidebarContent className="bg-background">
        <MainSection />
        <Separator />
        {/* <PersonalSection/> */}
        <TranscriptsSection />
        <div className="mt-auto space-y-2 p-2">
          <Separator />
          <BatchUploadSection />
        </div>
      </SidebarContent>
    </Sidebar>
  );
};

export default HomeSidebar;
