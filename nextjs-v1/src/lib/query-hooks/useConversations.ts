/// similar to zustand hooks 
import { useQuery } from "@tanstack/react-query";
import apiService from "@/lib/api";
import { ConversationData } from "../../types/schemas";

export const useConversations = () => {
  return useQuery<ConversationData[], Error>({
    queryKey: ["conversations"],
    queryFn: () => apiService.getConversations(),
  });
};


