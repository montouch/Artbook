"use client";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { mockArtists } from "@/lib/mock-data";
import { formatNumber } from "@/lib/utils";
import { MapPin, UserPlus } from "lucide-react";
import Link from "next/link";

export function DiscoverySection() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-semibold text-lg">Discover Local Artists</h2>
          <p className="text-white/40 text-sm">Based on your location and interests</p>
        </div>
        <Button variant="ghost" size="sm">See all</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {mockArtists.map((artist) => (
          <Link key={artist.id} href={`/artist/${artist.id}`}>
            <Card className="p-4 text-center">
              <Avatar
                name={artist.name}
                size="xl"
                color={artist.profileColor}
                verified={artist.verified}
              />
              <h3 className="text-white font-medium text-sm mt-3 truncate">{artist.name}</h3>
              <div className="flex items-center justify-center gap-1 text-white/40 text-xs mt-1">
                <MapPin className="w-3 h-3" />
                {artist.location}
              </div>
              <Badge variant="genre" className="mt-2">{artist.genre}</Badge>
              <p className="text-white/30 text-xs mt-2">
                {formatNumber(artist.followers)} followers
              </p>
              <Button variant="outline" size="sm" className="mt-3 w-full">
                <UserPlus className="w-3 h-3" />
                Follow
              </Button>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
