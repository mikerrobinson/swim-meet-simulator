/**
 * React context for storing and accessing parsed meet data
 */

import { createContext, useContext, useState, type ReactNode } from "react";
import type { Meet, Event, Team, Swimmer, Entry } from "~/types/meet";

interface MeetContextValue {
  meet: Meet | null;
  setMeet: (meet: Meet | null) => void;

  // Convenience getters
  getTeam: (id: string) => Team | undefined;
  getSwimmer: (id: string) => Swimmer | undefined;
  getEvent: (id: string) => Event | undefined;
  getEntriesForEvent: (eventId: string) => Entry[];
  getEntriesForSwimmer: (swimmerId: string) => Entry[];
  getEntriesForTeam: (teamId: string) => Entry[];
  getSwimmersForTeam: (teamId: string) => Swimmer[];
}

const MeetContext = createContext<MeetContextValue | null>(null);

export function MeetProvider({ children }: { children: ReactNode }) {
  const [meet, setMeet] = useState<Meet | null>(null);

  const getTeam = (id: string) => meet?.teams.get(id);
  const getSwimmer = (id: string) => meet?.swimmers.get(id);
  const getEvent = (id: string) => meet?.events.get(id);

  const getEntriesForEvent = (eventId: string) =>
    meet?.entries.filter((e) => e.eventId === eventId) ?? [];

  const getEntriesForSwimmer = (swimmerId: string) =>
    meet?.entries.filter((e) => e.swimmerId === swimmerId) ?? [];

  const getEntriesForTeam = (teamId: string) => {
    if (!meet) return [];
    // Get all swimmers for the team, then all their entries, plus relay entries
    const swimmerIds = new Set(
      Array.from(meet.swimmers.values())
        .filter((s) => s.teamId === teamId)
        .map((s) => s.id)
    );
    return meet.entries.filter(
      (e) =>
        (e.swimmerId && swimmerIds.has(e.swimmerId)) || e.teamId === teamId
    );
  };

  const getSwimmersForTeam = (teamId: string) =>
    meet
      ? Array.from(meet.swimmers.values()).filter((s) => s.teamId === teamId)
      : [];

  return (
    <MeetContext.Provider
      value={{
        meet,
        setMeet,
        getTeam,
        getSwimmer,
        getEvent,
        getEntriesForEvent,
        getEntriesForSwimmer,
        getEntriesForTeam,
        getSwimmersForTeam,
      }}
    >
      {children}
    </MeetContext.Provider>
  );
}

export function useMeet() {
  const context = useContext(MeetContext);
  if (!context) {
    throw new Error("useMeet must be used within a MeetProvider");
  }
  return context;
}
