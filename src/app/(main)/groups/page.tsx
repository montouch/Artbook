"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { mockGroups } from "@/lib/mock-data";
import { formatNumber } from "@/lib/utils";
import { Users, Search, Plus, Globe } from "lucide-react";

export default function GroupsPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 lg:px-8 py-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Users className="w-7 h-7 text-emerald-400" />
            Communities
          </h1>
          <p className="text-white/40 text-sm mt-1">
            Connect with artists and fans in group spaces
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4" />
          Create Group
        </Button>
      </div>

      {/* Search */}
      <Input placeholder="Search communities..." icon={<Search className="w-4 h-4" />} />

      {/* Your groups */}
      <div>
        <h2 className="text-white font-semibold text-lg mb-4">Discover Communities</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {mockGroups.map((group) => (
            <Card key={group.id} className="p-5">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-white/10 flex items-center justify-center flex-shrink-0">
                  <Users className="w-6 h-6 text-emerald-400/60" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-white font-medium text-sm truncate">{group.name}</h3>
                    <Badge variant="default">
                      <Globe className="w-3 h-3 mr-1" />
                      Public
                    </Badge>
                  </div>
                  {group.description && (
                    <p className="text-white/40 text-xs mt-1 line-clamp-2">{group.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-3">
                    <span className="text-white/30 text-xs">
                      {formatNumber(group.memberCount)} members
                    </span>
                    <Button variant="outline" size="sm">
                      Join
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
