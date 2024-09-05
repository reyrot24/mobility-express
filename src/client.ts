import { createClient, type ClientConfig } from "@sanity/client";
import imageUrlBuilder from "@sanity/image-url";

const config: ClientConfig = {
  projectId: "uq7gmc20",
  dataset: "production",
  useCdn: true,
  apiVersion: "2024-07-27",
};

export const client = createClient(config);

const builder = imageUrlBuilder(client);
export const urlFor = (source: string) => builder.image(source);
