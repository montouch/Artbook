import { useEffect, useState } from "react";
import { apiClient } from "../api/client";

interface Group {
  id: string;
  name: string;
  memberIds: string[];
}

export const GroupsPage = () => {
  const [groups, setGroups] = useState<Group[]>([]);

  useEffect(() => {
    apiClient
      .getGroups()
      .then((payload) => setGroups(payload.groups))
      .catch((error) => console.error(error));
  }, []);

  return (
    <section>
      <h2>Communities</h2>
      <p>Artist-fan communities with shared goals, collabs, and niche discussions.</p>
      <div className="grid">
        {groups.map((group) => (
          <article className="card" key={group.id}>
            <h3>{group.name}</h3>
            <p>{group.memberIds.length} members</p>
          </article>
        ))}
      </div>
    </section>
  );
};
