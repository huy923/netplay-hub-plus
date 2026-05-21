import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { mutateCybernetData, readCybernetData } from "./cybernet-store.server";

const MutationSchema = z.object({
  action: z.string().min(1),
  payload: z.record(z.unknown()).optional(),
});

export const getCybernetData = createServerFn({ method: "GET" }).handler(async () => {
  return readCybernetData();
});

export const updateCybernetData = createServerFn({ method: "POST" })
  .inputValidator((input) => MutationSchema.parse(input))
  .handler(async ({ data }) => {
    return mutateCybernetData(data.action, data.payload ?? {});
  });
