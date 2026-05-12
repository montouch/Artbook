import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { VibeProvider } from "./context/VibeContext";
import { ArtistProfilePage } from "./pages/ArtistProfilePage";
import { GroupsPage } from "./pages/GroupsPage";
import { HomeFeedPage } from "./pages/HomeFeedPage";
import { LiveStreamPage } from "./pages/LiveStreamPage";
import { MarketplacePage } from "./pages/MarketplacePage";
import { MessagesPage } from "./pages/MessagesPage";
import { PlaylistPage } from "./pages/PlaylistPage";
import { StreamerHubPage } from "./pages/StreamerHubPage";
import { UploadDashboardPage } from "./pages/UploadDashboardPage";

export const App = () => (
  <VibeProvider>
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />} path="/">
          <Route element={<HomeFeedPage />} index />
          <Route element={<ArtistProfilePage />} path="artist/:userId" />
          <Route element={<StreamerHubPage />} path="streamer" />
          <Route element={<LiveStreamPage />} path="live/:streamId" />
          <Route element={<MessagesPage />} path="messages" />
          <Route element={<GroupsPage />} path="groups" />
          <Route element={<MarketplacePage />} path="marketplace" />
          <Route element={<UploadDashboardPage />} path="upload" />
          <Route element={<PlaylistPage />} path="playlist" />
          <Route element={<Navigate replace to="/" />} path="*" />
        </Route>
      </Routes>
    </BrowserRouter>
  </VibeProvider>
);
