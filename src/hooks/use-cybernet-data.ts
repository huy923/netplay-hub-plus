import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getCybernetData, updateCybernetData } from "@/lib/cybernet.functions";

export function useCybernetData() {
  const queryClient = useQueryClient();
  const fetchData = useServerFn(getCybernetData);
  const updateData = useServerFn(updateCybernetData);

  const query = useQuery({
    queryKey: ["cybernet-data"],
    queryFn: () => fetchData(),
  });

  const mutate = async (action: string, payload?: Record<string, unknown>) => {
    const next = await updateData({ data: { action, payload: payload ?? {} } });
    queryClient.setQueryData(["cybernet-data"], next);
    return next;
  };

  return { ...query, data: query.data, mutate };
}
