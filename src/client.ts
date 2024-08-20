import { createClient, type ClientConfig } from "@sanity/client";
import imageUrlBuilder from "@sanity/image-url";
import { testimonianze } from "./components/sections/Testimonianze";

const config: ClientConfig = {
  projectId: "uq7gmc20",
  dataset: "production",
  useCdn: false,
  apiVersion: "2024-07-27",
};

export const client = createClient(config);

const builder = imageUrlBuilder(client);
export const urlFor = (source: string) => builder.image(source);

export async function getTestimonianze(): Promise<testimonianze[]> {
  return client.fetch(
    '*[_type == "testimonianze"]{nome, testimonianza, azienda, foto}'
  );
}
