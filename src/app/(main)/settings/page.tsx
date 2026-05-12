"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import {
  Settings,
  User,
  Bell,
  Shield,
  Palette,
  CreditCard,
  Globe,
  Moon,
  LogOut,
} from "lucide-react";
import { useState } from "react";

const settingsSections = [
  { id: "profile", label: "Profile", icon: User },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "privacy", label: "Privacy & Security", icon: Shield },
  { id: "payments", label: "Payments", icon: CreditCard },
  { id: "language", label: "Language & Region", icon: Globe },
];

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState("profile");
  const [profileColor, setProfileColor] = useState("#6366f1");

  const colors = [
    "#6366f1", "#8b5cf6", "#ec4899", "#ef4444", "#f59e0b",
    "#16a34a", "#06b6d4", "#3b82f6", "#f97316", "#14b8a6",
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 lg:px-8 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Settings className="w-7 h-7 text-white/60" />
          Settings
        </h1>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="space-y-1">
          {settingsSections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                activeSection === section.id
                  ? "bg-indigo-600/20 text-indigo-400"
                  : "text-white/50 hover:text-white hover:bg-white/5"
              }`}
            >
              <section.icon className="w-4 h-4" />
              {section.label}
            </button>
          ))}

          <div className="pt-4 mt-4 border-t border-white/[0.06]">
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-400/70 hover:text-red-400 hover:bg-red-500/5 transition-all">
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          {activeSection === "profile" && (
            <Card className="p-6 space-y-6">
              <h2 className="text-lg font-semibold text-white">Profile Settings</h2>

              <div className="flex items-center gap-4">
                <Avatar name="You" size="xl" color={profileColor} />
                <div>
                  <Button variant="outline" size="sm">Change Photo</Button>
                  <p className="text-white/30 text-xs mt-2">JPG, PNG. Max 2MB.</p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-white/50 text-xs font-medium block mb-1.5">Display Name</label>
                  <Input placeholder="Your name" defaultValue="Creative User" />
                </div>
                <div>
                  <label className="text-white/50 text-xs font-medium block mb-1.5">Username</label>
                  <Input placeholder="@username" defaultValue="@creativeuser" />
                </div>
              </div>

              <div>
                <label className="text-white/50 text-xs font-medium block mb-1.5">Bio</label>
                <textarea
                  placeholder="Tell the world about yourself..."
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none h-24"
                />
              </div>

              <div>
                <label className="text-white/50 text-xs font-medium block mb-1.5">Location</label>
                <Input placeholder="City, Country" defaultValue="Lagos, Nigeria" />
              </div>

              <div>
                <label className="text-white/50 text-xs font-medium block mb-1.5">Account Type</label>
                <div className="grid grid-cols-3 gap-3">
                  {["FAN", "ARTIST", "STREAMER"].map((type) => (
                    <button
                      key={type}
                      className="p-3 rounded-xl border border-white/10 hover:border-indigo-500/50 text-center transition-all"
                    >
                      <p className="text-white text-sm font-medium">{type}</p>
                      <p className="text-white/30 text-xs mt-1">
                        {type === "FAN" ? "Discover & enjoy" : type === "ARTIST" ? "Upload & sell" : "Go live & earn"}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <Button>Save Changes</Button>
            </Card>
          )}

          {activeSection === "appearance" && (
            <Card className="p-6 space-y-6">
              <h2 className="text-lg font-semibold text-white">Appearance</h2>

              <div>
                <label className="text-white/50 text-xs font-medium block mb-3">Profile Color</label>
                <div className="flex gap-3">
                  {colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setProfileColor(color)}
                      className={`w-8 h-8 rounded-full transition-all ${
                        profileColor === color ? "ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110" : "hover:scale-105"
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div className="flex items-center gap-3">
                  <Moon className="w-5 h-5 text-white/50" />
                  <div>
                    <p className="text-white text-sm font-medium">Dark Mode</p>
                    <p className="text-white/40 text-xs">Always on for the best experience</p>
                  </div>
                </div>
                <div className="w-10 h-6 bg-indigo-600 rounded-full relative">
                  <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                </div>
              </div>

              <Button>Save Appearance</Button>
            </Card>
          )}

          {activeSection !== "profile" && activeSection !== "appearance" && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-white capitalize">
                {settingsSections.find((s) => s.id === activeSection)?.label}
              </h2>
              <p className="text-white/40 mt-2">Settings for this section will be available soon.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
