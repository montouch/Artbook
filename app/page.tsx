import ArtbookExperience from "./artbook-experience";
import { getDiscoveryFeed } from "@/lib/discovery";

export default function Home() {
  return <ArtbookExperience initialFeed={getDiscoveryFeed()} />;
}
