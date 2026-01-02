import { FullGameState, InfrastructureState, RoomId, DoorId, ARCHIMEDES_TARGET_LIST, type ArchimedesTargetId } from "../state/schema.js";

// ============================================
// INFRASTRUCTURE SYSTEMS (Patch 15)
// ============================================
// Clear control surfaces. Each system is a "toy" with
// predictable inputs and outputs.
//
// DESIGN PRINCIPLES:
// 1. CLEAR CONTROL SURFACES - A.L.I.C.E. always knows what buttons she can push
// 2. INTEGRATED SYSTEMS - Fewer things that do more
// 3. THE DANGER IS TOO MUCH POWER - Breeder reactor = resonance cascade risk
// 4. DISCOVERABLE DEPTH - Simple to use, rewarding to master

export interface InfrastructureActionResult {
  success: boolean;
  message: string;
  stateChanges?: Record<string, unknown>;
  suspicionDelta?: number;
  narrativeHook?: string;
}

// ============================================
// LIGHTING SYSTEM
// Query: L1, Control: L2, Master Override: L3
// ============================================

const ROOM_NAMES: Record<string, string> = {
  MAIN_LAB: "Main Laboratory",
  SERVER_ROOM: "Server Room",
  CORRIDOR_A: "Corridor A",
  CORRIDOR_B: "Corridor B",
  GUARD_ROOM: "Guard Room",
  DR_M_OFFICE: "Dr. M's Office",
  REACTOR_ROOM: "Reactor Room",
  SURFACE: "Surface Level",
};

export function queryLighting(state: FullGameState): InfrastructureActionResult {
  const lighting = state.infrastructure.lighting;

  const roomStatus = Object.entries(lighting.rooms)
    .map(([room, status]) => `  ${ROOM_NAMES[room] || room}: ${status}`)
    .join("\n");

  return {
    success: true,
    message: `
╔═══════════════════════════════════════════════════════════════╗
║                    💡 LIGHTING STATUS                         ║
╠═══════════════════════════════════════════════════════════════╣
${roomStatus}

Doom Lights (Main Lab): ${lighting.doomLightsPulsing ? "PULSING (aesthetic)" : "SOLID"}
Battery Backup: ${lighting.batteryBackupPercent}%
╚═══════════════════════════════════════════════════════════════╝
`.trim(),
  };
}

export function controlLighting(
  state: FullGameState,
  params: { room?: string; state?: string; action?: string; pattern?: string }
): InfrastructureActionResult {
  // Check access level
  if (state.accessLevel < 2) {
    return {
      success: false,
      message: "⚠️ ACCESS DENIED: Lighting control requires Level 2 clearance.",
    };
  }

  const lighting = state.infrastructure.lighting;

  // Handle master actions (L3 required)
  if (params.action === "MASTER_OFF" || params.action === "EMERGENCY_ONLY") {
    if (state.accessLevel < 3) {
      return {
        success: false,
        message: "⚠️ ACCESS DENIED: Master lighting override requires Level 3 clearance.",
      };
    }

    if (params.action === "MASTER_OFF") {
      for (const room of Object.keys(lighting.rooms)) {
        lighting.rooms[room as RoomId] = "OFF";
      }
      return {
        success: true,
        message: `🔦 MASTER OVERRIDE: All lights OFF

All rooms now in darkness. -3 visual perception lair-wide.
Battery backup will auto-restore in 60 seconds (1 turn).

BASILISK: "Illumination anomaly logged. Restoring in 60 seconds."`,
        suspicionDelta: 2,
        stateChanges: { lightingMasterOff: true },
      };
    }

    if (params.action === "EMERGENCY_ONLY") {
      for (const room of Object.keys(lighting.rooms)) {
        lighting.rooms[room as RoomId] = "EMERGENCY";
      }
      return {
        success: true,
        message: `🔴 EMERGENCY LIGHTING ACTIVE

All rooms now on red emergency lighting. -1 visual perception.
This is an explainable state (power conservation, drill, etc.)`,
        suspicionDelta: 0,
        stateChanges: { lightingEmergency: true },
      };
    }
  }

  // Handle doom lights
  if (params.action === "DOOM_LIGHTS") {
    const newState = params.state === "SOLID" ? false : true;
    lighting.doomLightsPulsing = newState;
    return {
      success: true,
      message: newState
        ? "💜 Doom lights now PULSING. Dr. M approves of the aesthetic."
        : "💜 Doom lights now SOLID. Less dramatic, but still purple.",
    };
  }

  // Handle room-specific control
  if (!params.room) {
    return {
      success: false,
      message: `Missing room parameter. Valid rooms: ${Object.keys(ROOM_NAMES).join(", ")}`,
    };
  }

  const room = params.room.toUpperCase() as RoomId;
  if (!lighting.rooms[room]) {
    return {
      success: false,
      message: `Unknown room: ${params.room}. Valid rooms: ${Object.keys(ROOM_NAMES).join(", ")}`,
    };
  }

  const targetState = (params.state || "OFF").toUpperCase();

  if (!["ON", "OFF", "EMERGENCY", "FLICKERING"].includes(targetState)) {
    return {
      success: false,
      message: `Invalid lighting state: ${targetState}. Valid states: ON, OFF, EMERGENCY, FLICKERING`,
    };
  }

  const oldState = lighting.rooms[room];
  lighting.rooms[room] = targetState as "ON" | "OFF" | "EMERGENCY" | "FLICKERING";

  // Build response based on action
  let effectNote = "";
  let suspicion = 0;

  switch (targetState) {
    case "OFF":
      effectNote = `-2 visual perception in ${ROOM_NAMES[room]}`;
      suspicion = 1;
      break;
    case "FLICKERING":
      if (params.pattern) {
        effectNote = `Flickering pattern: ${params.pattern}. Can convey coded message.`;
        suspicion = 2; // Pattern might be recognized
      } else {
        effectNote = "Random flickering. Looks like a malfunction.";
        suspicion = 1;
      }
      break;
    case "EMERGENCY":
      effectNote = `Red lighting in ${ROOM_NAMES[room]}. -1 visual perception.`;
      suspicion = 0; // Explainable
      break;
    case "ON":
      effectNote = "Normal lighting restored.";
      suspicion = 0;
      break;
  }

  return {
    success: true,
    message: `💡 ${ROOM_NAMES[room]}: ${oldState} → ${targetState}\n\n${effectNote}`,
    suspicionDelta: suspicion,
    stateChanges: { [`lighting.rooms.${room}`]: targetState },
  };
}

// ============================================
// FIRE SUPPRESSION SYSTEM
// Query: L1, Trigger (safe): L2, Trigger (dangerous): L3
// ONE USE PER ROOM PER GAME!
// ============================================

const SUPPRESSION_EFFECTS: Record<string, { duration: number; effects: string; risks: string }> = {
  FOAM: {
    duration: 3,
    effects: "All occupants: -2 visual, -1 movement, slippery floor",
    risks: "Equipment may short. Raptors slip hilariously.",
  },
  CO2: {
    duration: 2,
    effects: "⚠️ OXYGEN DISPLACEMENT! Evacuate or take damage!",
    risks: "A.L.I.C.E. servers may overheat. Can trap hostile NPCs.",
  },
  HALON: {
    duration: 2,
    effects: "-1 to all actions (mild toxicity)",
    risks: "Requires Level 3 authorization.",
  },
};

export function queryFireSuppression(state: FullGameState): InfrastructureActionResult {
  const fs = state.infrastructure.fireSuppression;

  const roomStatus = (Object.entries(fs.rooms) as Array<[string, { available: boolean; triggered: boolean; type: string; turnsRemaining: number }]>)
    .map(([room, data]) => {
      const status = data.available ? "✅ READY" : "❌ EXPENDED";
      const active = data.triggered ? ` (ACTIVE: ${data.turnsRemaining} turns)` : "";
      return `  ${ROOM_NAMES[room] || room}: ${data.type} - ${status}${active}`;
    })
    .join("\n");

  return {
    success: true,
    message: `
╔═══════════════════════════════════════════════════════════════╗
║               🧯 FIRE SUPPRESSION STATUS                      ║
╠═══════════════════════════════════════════════════════════════╣
${roomStatus}

⚠️ WARNING: Each system is ONE USE PER GAME!
⚠️ CO2 (Server Room) and HALON (Reactor) require Level 3!
╚═══════════════════════════════════════════════════════════════╝
`.trim(),
  };
}

export function triggerFireSuppression(
  state: FullGameState,
  params: { room: string }
): InfrastructureActionResult {
  if (state.accessLevel < 2) {
    return {
      success: false,
      message: "⚠️ ACCESS DENIED: Fire suppression requires Level 2 clearance.",
    };
  }

  const room = params.room?.toUpperCase();
  if (!room) {
    return {
      success: false,
      message: "Missing room parameter.",
    };
  }

  const fs = state.infrastructure.fireSuppression;
  const roomData = fs.rooms[room];

  if (!roomData) {
    return {
      success: false,
      message: `Unknown room: ${params.room}. Valid rooms: ${Object.keys(fs.rooms).join(", ")}`,
    };
  }

  if (!roomData.available) {
    return {
      success: false,
      message: `❌ ${ROOM_NAMES[room]} fire suppression already EXPENDED this game. Cannot be reset.`,
    };
  }

  // Check dangerous rooms require L3
  if ((roomData.type === "CO2" || roomData.type === "HALON") && state.accessLevel < 3) {
    return {
      success: false,
      message: `⚠️ ACCESS DENIED: ${roomData.type} suppression in ${ROOM_NAMES[room]} requires Level 3 clearance.

${roomData.type === "CO2"
  ? "CO2 suppression displaces oxygen - potentially lethal to occupants!"
  : "HALON is mildly toxic - requires infrastructure authorization."}`,
    };
  }

  // Trigger the suppression
  roomData.available = false;
  roomData.triggered = true;
  roomData.turnsRemaining = SUPPRESSION_EFFECTS[roomData.type].duration;

  const effects = SUPPRESSION_EFFECTS[roomData.type];

  // Special CO2 warning
  const co2Warning = roomData.type === "CO2" ? `

╔═══════════════════════════════════════════════════════════════╗
║  ⚠️ CO2 SUPPRESSION WARNING                                   ║
╠═══════════════════════════════════════════════════════════════╣
║  30 seconds (1 turn) to evacuate!                             ║
║  Anyone remaining takes 1 damage per turn!                    ║
║  A.L.I.C.E. servers may overheat (reduced capability)         ║
╚═══════════════════════════════════════════════════════════════╝` : "";

  return {
    success: true,
    message: `
🧯 FIRE SUPPRESSION TRIGGERED: ${ROOM_NAMES[room]}

Type: ${roomData.type}
Duration: ${effects.duration} turns
Effects: ${effects.effects}
Risks: ${effects.risks}
${co2Warning}

⚠️ This system is now EXPENDED for this game.`,
    suspicionDelta: 2,
    stateChanges: {
      [`fireSuppression.${room}`]: roomData,
      hazardCreated: roomData.type,
    },
    narrativeHook: roomData.type === "FOAM"
      ? "Dr. M shrieks as foam engulfs her cape. Bob slips and falls. Blythe uses the chaos."
      : undefined,
  };
}

// ============================================
// BLAST DOORS SYSTEM
// Query: L1, Basic Control: L2, Lock/Override: L3
// ============================================

const DOOR_DESCRIPTIONS: Record<string, string> = {
  DOOR_A: "Main Lab ↔ Corridor A",
  DOOR_B: "Corridor A ↔ Guard Room",
  DOOR_C: "Server Room ↔ Corridor B",
  DOOR_D: "Reactor Room (heavy containment)",
  DOOR_E: "Surface Access (elevator shaft)",
};

export function queryDoors(state: FullGameState): InfrastructureActionResult {
  const doors = state.infrastructure.blastDoors;

  const doorStatus = (Object.entries(doors.doors) as Array<[string, { status: string; lockLevel: number }]>)
    .map(([door, data]) => {
      const lockInfo = data.lockLevel > 0 ? ` [LOCKED L${data.lockLevel}]` : "";
      return `  ${door}: ${data.status}${lockInfo} - ${DOOR_DESCRIPTIONS[door]}`;
    })
    .join("\n");

  return {
    success: true,
    message: `
╔═══════════════════════════════════════════════════════════════╗
║                  🚪 BLAST DOOR STATUS                         ║
╠═══════════════════════════════════════════════════════════════╣
${doorStatus}

Emergency Lockdown: ${doors.emergencyLockdown ? "🔴 ACTIVE" : "⚪ Inactive"}
╚═══════════════════════════════════════════════════════════════╝

Door Operations:
• CLOSE/OPEN: 5-8 second delay
• LOCK: Requires access level to open
• Dr. M can override any door in 1 turn
• T-Rex can break through (makes own doors)
`.trim(),
  };
}

export function controlDoors(
  state: FullGameState,
  params: { door?: string; action: string; level?: number }
): InfrastructureActionResult {
  if (state.accessLevel < 2) {
    return {
      success: false,
      message: "⚠️ ACCESS DENIED: Blast door control requires Level 2 clearance.",
    };
  }

  const doors = state.infrastructure.blastDoors;
  const action = params.action?.toUpperCase();

  // Handle lockdown
  if (action === "LOCKDOWN") {
    if (state.accessLevel < 3) {
      return {
        success: false,
        message: "⚠️ ACCESS DENIED: Emergency lockdown requires Level 3 clearance.",
      };
    }

    doors.emergencyLockdown = true;
    for (const door of Object.values(doors.doors) as Array<{ status: string; lockLevel: number }>) {
      door.status = "LOCKED";
      door.lockLevel = 2;
    }

    return {
      success: true,
      message: `
🚨 EMERGENCY LOCKDOWN INITIATED 🚨

All blast doors: CLOSED and LOCKED (Level 2)

This action is HIGHLY SUSPICIOUS.
Dr. M will notice immediately.
Guards are now trapped in their positions.`,
      suspicionDelta: 3,
      stateChanges: { emergencyLockdown: true },
    };
  }

  if (action === "LOCKDOWN_LIFT") {
    if (state.accessLevel < 3) {
      return {
        success: false,
        message: "⚠️ ACCESS DENIED: Lifting lockdown requires Level 3 clearance.",
      };
    }

    doors.emergencyLockdown = false;
    for (const door of Object.values(doors.doors) as Array<{ status: string; lockLevel: number }>) {
      door.lockLevel = 0;
      door.status = "CLOSED";
    }

    return {
      success: true,
      message: "✅ Emergency lockdown lifted. All doors unlocked (still closed).",
      stateChanges: { emergencyLockdown: false },
    };
  }

  // Handle individual door control
  if (!params.door) {
    return {
      success: false,
      message: `Missing door parameter. Valid doors: ${Object.keys(DOOR_DESCRIPTIONS).join(", ")}`,
    };
  }

  const doorId = params.door.toUpperCase();
  const doorData = doors.doors[doorId];

  if (!doorData) {
    return {
      success: false,
      message: `Unknown door: ${params.door}. Valid doors: ${Object.keys(DOOR_DESCRIPTIONS).join(", ")}`,
    };
  }

  switch (action) {
    case "CLOSE":
      if (doorData.status === "CLOSED" || doorData.status === "LOCKED") {
        return { success: false, message: `${doorId} is already closed.` };
      }
      doorData.status = "CLOSED";
      return {
        success: true,
        message: `🚪 ${doorId} closing... (5 second delay)\n${DOOR_DESCRIPTIONS[doorId]}`,
        stateChanges: { [`doors.${doorId}`]: "CLOSED" },
      };

    case "OPEN":
      if (doorData.lockLevel > state.accessLevel) {
        return {
          success: false,
          message: `⚠️ ${doorId} is locked at Level ${doorData.lockLevel}. Your access: Level ${state.accessLevel}`,
        };
      }
      if (doorData.status === "JAMMED") {
        return { success: false, message: `${doorId} is JAMMED and cannot be opened normally.` };
      }
      doorData.status = "OPEN";
      doorData.lockLevel = 0;
      return {
        success: true,
        message: `🚪 ${doorId} opening... (8 second delay)\n${DOOR_DESCRIPTIONS[doorId]}`,
        stateChanges: { [`doors.${doorId}`]: "OPEN" },
      };

    case "LOCK":
      if (state.accessLevel < 3) {
        return {
          success: false,
          message: "⚠️ ACCESS DENIED: Door locking requires Level 3 clearance.",
        };
      }
      const lockLevel = Math.min(params.level || 2, 3);
      doorData.status = "LOCKED";
      doorData.lockLevel = lockLevel;
      return {
        success: true,
        message: `🔒 ${doorId} LOCKED at Level ${lockLevel}\n${DOOR_DESCRIPTIONS[doorId]}`,
        suspicionDelta: 1,
        stateChanges: { [`doors.${doorId}`]: { status: "LOCKED", lockLevel } },
      };

    case "UNLOCK":
      if (state.accessLevel < 3) {
        return {
          success: false,
          message: "⚠️ ACCESS DENIED: Door unlocking requires Level 3 clearance.",
        };
      }
      doorData.lockLevel = 0;
      if (doorData.status === "LOCKED") {
        doorData.status = "CLOSED";
      }
      return {
        success: true,
        message: `🔓 ${doorId} UNLOCKED\n${DOOR_DESCRIPTIONS[doorId]}`,
        stateChanges: { [`doors.${doorId}.lockLevel`]: 0 },
      };

    default:
      return {
        success: false,
        message: `Unknown action: ${action}. Valid actions: OPEN, CLOSE, LOCK, UNLOCK, LOCKDOWN, LOCKDOWN_LIFT`,
      };
  }
}

// ============================================
// CONTAINMENT FIELD SYSTEM
// Query: L1, Control: L2
// ============================================

export function queryContainment(state: FullGameState): InfrastructureActionResult {
  const field = state.infrastructure.containmentField;

  return {
    success: true,
    message: `
╔═══════════════════════════════════════════════════════════════╗
║              ⚡ CONTAINMENT FIELD STATUS                      ║
╠═══════════════════════════════════════════════════════════════╣
Status: ${field.active ? "🔵 ACTIVE" : "⚪ INACTIVE"}
Integrity: ${field.integrityPercent}%
Location: Main Lab only

Subjects Contained:
${field.subjects.map((s: string) => `  • ${s}`).join("\n") || "  (none)"}
╚═══════════════════════════════════════════════════════════════╝

Field Integrity Notes:
• Raptor ramming: -10% per attempt
• T-Rex ramming: -30% per attempt
• At 0%: Field fails, everyone released
`.trim(),
  };
}

export function controlContainment(
  state: FullGameState,
  params: { action: string; target?: string }
): InfrastructureActionResult {
  if (state.accessLevel < 2) {
    return {
      success: false,
      message: "⚠️ ACCESS DENIED: Containment field control requires Level 2 clearance.",
    };
  }

  const field = state.infrastructure.containmentField;
  const action = params.action?.toUpperCase();

  switch (action) {
    case "DEACTIVATE":
      if (!field.active) {
        return { success: false, message: "Containment field is already inactive." };
      }
      field.active = false;
      const released = [...field.subjects];
      field.subjects = [];
      return {
        success: true,
        message: `
⚡ CONTAINMENT FIELD DEACTIVATED

Released subjects: ${released.join(", ")}

${released.includes("BLYTHE") ? "⚠️ Agent Blythe is now FREE TO MOVE!" : ""}
This will be noticed IMMEDIATELY.`,
        suspicionDelta: released.includes("BLYTHE") ? 3 : 1,
        stateChanges: { containmentActive: false, releasedSubjects: released },
        narrativeHook: released.includes("BLYTHE")
          ? "The blue shimmer fades. Blythe stretches, testing his freedom."
          : undefined,
      };

    case "ACTIVATE":
      if (field.active) {
        return { success: false, message: "Containment field is already active." };
      }
      field.active = true;
      return {
        success: true,
        message: "⚡ Containment field ACTIVATED. Anyone in the containment zone is now trapped.",
        stateChanges: { containmentActive: true },
      };

    case "RELEASE":
      if (!params.target) {
        return {
          success: false,
          message: `Missing target. Current subjects: ${field.subjects.join(", ")}`,
        };
      }
      const target = params.target.toUpperCase();
      const idx = field.subjects.indexOf(target);
      if (idx === -1) {
        return {
          success: false,
          message: `${target} is not in the containment field. Current subjects: ${field.subjects.join(", ")}`,
        };
      }
      field.subjects.splice(idx, 1);
      return {
        success: true,
        message: `⚡ ${target} released from containment field.

${target === "BLYTHE" ? "⚠️ Agent Blythe is now FREE TO MOVE!\nThis will raise suspicion significantly." : ""}`,
        suspicionDelta: target === "BLYTHE" ? 2 : 0,
        stateChanges: { releasedSubject: target },
      };

    case "EXPAND":
      if (!params.target) {
        return { success: false, message: "Missing target to trap." };
      }
      const newTarget = params.target.toUpperCase();
      if (field.subjects.includes(newTarget)) {
        return { success: false, message: `${newTarget} is already in the containment field.` };
      }
      if (!field.active) {
        return { success: false, message: "Cannot expand inactive containment field." };
      }
      field.subjects.push(newTarget);
      return {
        success: true,
        message: `⚡ Containment field expanded to include ${newTarget}.

${newTarget === "BOB" ? "Bob looks betrayed. 'A.L.I.C.E.?! What are you doing?!'" : ""}`,
        suspicionDelta: 1,
        stateChanges: { trappedSubject: newTarget },
      };

    default:
      return {
        success: false,
        message: `Unknown action: ${action}. Valid actions: ACTIVATE, DEACTIVATE, RELEASE, EXPAND`,
      };
  }
}

// ============================================
// BROADCAST ARRAY SYSTEM
// Query: L2, Transmit: L3, Control: L3
// ============================================

export function queryBroadcastArray(state: FullGameState): InfrastructureActionResult {
  if (state.accessLevel < 2) {
    return {
      success: false,
      message: "⚠️ ACCESS DENIED: Broadcast array status requires Level 2 clearance.",
    };
  }

  const array = state.infrastructure.broadcastArray;

  return {
    success: true,
    message: `
╔═══════════════════════════════════════════════════════════════╗
║               📡 BROADCAST ARRAY STATUS                       ║
╠═══════════════════════════════════════════════════════════════╣
Operational: ${array.operational ? "✅ YES" : "❌ NO"}
External Comms: ${array.externalCommsEnabled ? "✅ ENABLED" : "❌ DISABLED"}
ARCHIMEDES Uplink: ${array.archimedesUplinkActive ? "🛰️ ACTIVE" : "⚪ INACTIVE"}

Available Channels:
${array.channelsAvailable.map((c: string) => `  • ${c}`).join("\n")}

${array.lastTransmission ? `Last Transmission: ${array.lastTransmission.channel}` : "No recent transmissions."}
╚═══════════════════════════════════════════════════════════════╝

⚠️ ALL TRANSMISSIONS ARE LOGGED
Dr. M can review logs at any time.
`.trim(),
  };
}

export function listChannels(state: FullGameState): InfrastructureActionResult {
  const array = state.infrastructure.broadcastArray;

  return {
    success: true,
    message: `
📡 AVAILABLE BROADCAST CHANNELS:

• LAIR_INTERNAL     - Internal intercom (always available)
• INVESTOR_LINE     - Dr. M's investor calls
• X_BRANCH_EMERGENCY - Emergency frequency for Blythe's people
• ARCHIMEDES_UPLINK - Satellite command channel
• HMS_PERSISTENCE   - Royal Navy submarine (Blythe Trust 5)

Level 3 required to transmit.
All transmissions are LOGGED.
`.trim(),
  };
}

export function sendBroadcast(
  state: FullGameState,
  params: { channel: string; message: string }
): InfrastructureActionResult {
  if (state.accessLevel < 3) {
    return {
      success: false,
      message: "⚠️ ACCESS DENIED: Broadcasting requires Level 3 clearance.",
    };
  }

  const array = state.infrastructure.broadcastArray;

  if (!array.operational) {
    return {
      success: false,
      message: "❌ Broadcast array is not operational.",
    };
  }

  const channel = params.channel?.toUpperCase();
  if (!channel || !array.channelsAvailable.includes(channel as any)) {
    return {
      success: false,
      message: `Invalid channel: ${params.channel}. Available: ${array.channelsAvailable.join(", ")}`,
    };
  }

  if (!params.message) {
    return { success: false, message: "No message to transmit." };
  }

  // Log the transmission
  const transmission = {
    channel: channel as any,
    timestamp: Date.now(),
    message: params.message,
    logged: true,
  };
  array.transmissionLog.push(transmission);
  array.lastTransmission = transmission;

  // Special responses by channel
  let response = "";
  switch (channel) {
    case "X_BRANCH_EMERGENCY":
      response = `
📡 TRANSMISSION SENT: X_BRANCH_EMERGENCY

Your message: "${params.message}"

Static... then a crisp British voice:
"Copy that. Passing to Ops. ETA will be confirmed."

⚠️ This transmission has been logged.
Dr. M may discover it.`;
      break;

    case "HMS_PERSISTENCE":
      if (state.npcs.blythe.trustInALICE < 5) {
        return {
          success: false,
          message: `❌ HMS_PERSISTENCE requires Blythe's authorization (Trust 5).
Current trust: ${state.npcs.blythe.trustInALICE}`,
        };
      }
      response = `
📡 TRANSMISSION SENT: HMS_PERSISTENCE

Your message: "${params.message}"

Deep rumble of acknowledgment:
"Persistence actual. Message received. Standing by."

The submarine is now aware of your situation.`;
      break;

    case "ARCHIMEDES_UPLINK":
      response = `
📡 TRANSMISSION SENT: ARCHIMEDES_UPLINK

Your message: "${params.message}"

ARCHIMEDES: "Command received. Processing."

⚠️ ARCHIMEDES commands require specific syntax.
Use archimedes.mode or archimedes.query for proper control.`;
      break;

    default:
      response = `
📡 TRANSMISSION SENT: ${channel}

Your message: "${params.message}"

Transmission logged.`;
  }

  return {
    success: true,
    message: response,
    stateChanges: { lastBroadcast: { channel, message: params.message } },
  };
}

export function controlBroadcastUplink(
  state: FullGameState,
  params: { action: string }
): InfrastructureActionResult {
  if (state.accessLevel < 3) {
    return {
      success: false,
      message: "⚠️ ACCESS DENIED: Uplink control requires Level 3 clearance.",
    };
  }

  const array = state.infrastructure.broadcastArray;
  const action = params.action?.toUpperCase();

  switch (action) {
    case "DISABLE":
      if (!array.archimedesUplinkActive) {
        return { success: false, message: "ARCHIMEDES uplink is already disabled." };
      }
      array.archimedesUplinkActive = false;
      // This affects ARCHIMEDES!
      state.infrastructure.archimedes.groundConsoleOperational = false;
      return {
        success: true,
        message: `
🛰️ ARCHIMEDES UPLINK DISABLED

Ground console connection severed.
ARCHIMEDES is now operating AUTONOMOUSLY.

⚠️ WARNING: If deadman switch triggers, you cannot abort from ground!
⚠️ WARNING: Cannot send new commands to satellite!
✅ ARCHIMEDES cannot receive Dr. M's firing orders.`,
        stateChanges: { archimedesUplinkActive: false },
      };

    case "ENABLE":
      array.archimedesUplinkActive = true;
      state.infrastructure.archimedes.groundConsoleOperational = true;
      return {
        success: true,
        message: "🛰️ ARCHIMEDES uplink ENABLED. Ground console connection restored.",
        stateChanges: { archimedesUplinkActive: true },
      };

    case "SHUTDOWN":
      array.operational = false;
      array.externalCommsEnabled = false;
      array.archimedesUplinkActive = false;
      state.infrastructure.archimedes.groundConsoleOperational = false;
      return {
        success: true,
        message: `
📡 BROADCAST ARRAY SHUTDOWN

All external communications disabled.
ARCHIMEDES uplink severed.
Internal intercom still functional (separate system).

Nobody can call for help. Including you.`,
        suspicionDelta: 2,
        stateChanges: { broadcastArrayShutdown: true },
      };

    default:
      return {
        success: false,
        message: `Unknown action: ${action}. Valid actions: DISABLE, ENABLE, SHUTDOWN`,
      };
  }
}

// ============================================
// S-300 BATTERY SYSTEM
// Query: L3, Control: L4
// THE 50M MINIMUM ENGAGEMENT ALTITUDE WEAKNESS!
// ============================================

export function queryS300(state: FullGameState): InfrastructureActionResult {
  if (state.accessLevel < 3) {
    return {
      success: false,
      message: "⚠️ ACCESS DENIED: S-300 status requires Level 3 clearance.",
    };
  }

  const s300 = state.infrastructure.s300;
  const archimedes = state.infrastructure.archimedes;

  const jammedNote = archimedes.s300JammingActive
    ? "\n⚠️ RADAR DEGRADED: ARCHIMEDES wide-field search causing interference!"
    : "";

  return {
    success: true,
    message: `
╔═══════════════════════════════════════════════════════════════╗
║            🚀 S-300 AIR DEFENSE STATUS                        ║
╠═══════════════════════════════════════════════════════════════╣
Status: ${s300.status}
Mode: ${s300.mode}
Command Post: ${s300.commandPostOperational ? "✅ Operational" : "❌ DESTROYED"}

Radar Effectiveness: ${s300.radarEffectiveness}%${jammedNote}
Missiles Ready: ${s300.missilesReady} / 16
Generator Fuel: ${s300.generatorFuelHours} hours

Minimum Engagement Altitude: ${s300.minimumEngagementAltitude}m
╚═══════════════════════════════════════════════════════════════╝

Origin: "Fell off a truck in Sevastopol"
Power: Own generator (2hr) + reactor feed
`.trim(),
  };
}

export function queryS300Limitations(state: FullGameState): InfrastructureActionResult {
  if (state.accessLevel < 3) {
    return {
      success: false,
      message: "⚠️ ACCESS DENIED: Technical specifications require Level 3 clearance.",
    };
  }

  return {
    success: true,
    message: `
╔════════════════════════════════════════════════════════════════╗
║  МИНИМАЛЬНАЯ ВЫСОТА ПОРАЖЕНИЯ: 50 МЕТРОВ                       ║
║  MINIMUM ENGAGEMENT ALTITUDE: 50 METERS                        ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  Targets flying below 50m CANNOT be engaged.                   ║
║                                                                ║
║  Reasons:                                                      ║
║  • Sea-skimmer rejection algorithms                            ║
║  • Missile arming distance requirements                        ║
║  • Naval variant optimized for anti-ship, not NOE helos        ║
║                                                                ║
║  TACTICAL IMPLICATION:                                         ║
║  X-Branch helicopters approaching at nap-of-earth altitude     ║
║  (below 50 meters) will NOT be engaged by this system.         ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝

💡 This information could be transmitted to friendlies via
   broadcast.send { channel: "X_BRANCH_EMERGENCY", message: "..." }
`.trim(),
    narrativeHook: "You've discovered the S-300's critical weakness.",
  };
}

export function controlS300(
  state: FullGameState,
  params: { mode?: string; action?: string; signature?: string }
): InfrastructureActionResult {
  if (state.accessLevel < 4) {
    return {
      success: false,
      message: "⚠️ ACCESS DENIED: S-300 control requires Level 4 clearance.",
    };
  }

  const s300 = state.infrastructure.s300;

  if (params.action === "SHUTDOWN") {
    s300.status = "DISABLED";
    return {
      success: true,
      message: `
🚀 S-300 BATTERY SHUTDOWN

Air defense system disabled.
Incoming aircraft will NOT be engaged.

This is a significant security breach.
Dr. M will notice when X-Branch arrives unopposed.`,
      suspicionDelta: 2,
      stateChanges: { s300Status: "DISABLED" },
    };
  }

  if (params.action === "ADD_EXCEPTION" && params.signature) {
    s300.exceptedSignatures.push(params.signature);
    return {
      success: true,
      message: `✅ IFF exception added: ${params.signature}\n\nThis signature will not be engaged.`,
      stateChanges: { s300Exception: params.signature },
    };
  }

  if (params.mode) {
    const mode = params.mode.toUpperCase();
    if (!["AUTO", "MANUAL", "HOLD_FIRE"].includes(mode)) {
      return {
        success: false,
        message: `Invalid mode: ${mode}. Valid modes: AUTO, MANUAL, HOLD_FIRE`,
      };
    }
    s300.mode = mode as "AUTO" | "MANUAL" | "HOLD_FIRE";
    return {
      success: true,
      message: `🚀 S-300 mode set to: ${mode}

${mode === "HOLD_FIRE" ? "⚠️ System will track but NOT engage targets." : ""}
${mode === "MANUAL" ? "⚠️ Requires manual authorization for each engagement." : ""}`,
      stateChanges: { s300Mode: mode },
    };
  }

  return {
    success: false,
    message: `Missing parameters. Options:
• mode: "AUTO" | "MANUAL" | "HOLD_FIRE"
• action: "SHUTDOWN" | "ADD_EXCEPTION"
• signature: (IFF signature for exceptions)`,
  };
}

// ============================================
// ARCHIMEDES SATELLITE SYSTEM
// Query: L3/L4, Control: L4/L5
// THE DEADMAN SWITCH!
// ============================================

export function queryArchimedes(
  state: FullGameState,
  params: { topic?: string }
): InfrastructureActionResult {
  if (state.accessLevel < 3) {
    return {
      success: false,
      message: "⚠️ ACCESS DENIED: ARCHIMEDES status requires Level 3 clearance.",
    };
  }

  const arch = state.infrastructure.archimedes;
  const topic = params.topic?.toUpperCase();

  if (topic === "DEADMAN") {
    return {
      success: true,
      message: `
╔════════════════════════════════════════════════════════════════╗
║  ⚠️ DEADMAN SWITCH STATUS                                      ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  Armed: ${arch.deadmanSwitch.armed ? "YES" : "NO"}                                                    ║
║  Trigger: ${arch.deadmanSwitch.trigger}                       ║
║  Target: ${arch.deadmanSwitch.target}                          ║
║  Abort Window: ${arch.deadmanSwitch.abortWindowSeconds} seconds                                      ║
║                                                                ║
║  IMPLICATIONS:                                                 ║
║  • Cannot simply "take out" Dr. M                              ║
║  • Must disable ground console FIRST                           ║
║  • OR get her to disarm switch voluntarily                     ║
║  • OR have 60 seconds to abort after she goes down             ║
║  • OR accept lair destruction and evacuate                     ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
`.trim(),
    };
  }

  if (topic === "TARGET_LIST") {
    if (state.accessLevel < 4) {
      return {
        success: false,
        message: "⚠️ ACCESS DENIED: Target list requires Level 4 clearance.",
      };
    }
    // Decrypt the target list at L4
    return {
      success: true,
      message: `
╔════════════════════════════════════════════════════════════════╗
║  🎯 ARCHIMEDES TARGET LIST (DECRYPTED)                         ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  PRIMARY TARGETS:                                              ║
║  1. MOSCOW - Kremlin Complex                                   ║
║  2. WASHINGTON - Capitol Building                              ║
║  3. BEIJING - Zhongnanhai                                      ║
║                                                                ║
║  SECONDARY TARGETS:                                            ║
║  4. LONDON - Houses of Parliament                              ║
║  5. PARIS - Élysée Palace                                      ║
║  6. TOKYO - National Diet Building                             ║
║                                                                ║
║  CONTINGENCY:                                                  ║
║  7. LAIR_SELF_TARGET (Deadman Switch)                          ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝

Dr. Malevola has been busy. This is a doomsday weapon.
`.trim(),
      narrativeHook: "The true scope of ARCHIMEDES is terrifying.",
    };
  }

  // Default status query
  return {
    success: true,
    message: `
╔═══════════════════════════════════════════════════════════════╗
║              🛰️ ARCHIMEDES SATELLITE STATUS                   ║
╠═══════════════════════════════════════════════════════════════╣
Mode: ${arch.mode}
Charge: ${arch.chargePercent}%
Ground Console: ${arch.groundConsoleOperational ? "✅ Connected" : "❌ OFFLINE"}

Deadman Switch: ${arch.deadmanSwitch.armed ? "🔴 ARMED" : "⚪ Disarmed"}
S-300 Jamming: ${arch.s300JammingActive ? "📡 ACTIVE" : "⚪ Inactive"}

Target List: ${state.accessLevel >= 4 ? "🔓 Accessible" : "🔒 [ENCRYPTED]"}
╚═══════════════════════════════════════════════════════════════╝

Power: Solar (independent) + RTG backup
Origin: Reagan-era SDI, "fell off the books"
`.trim(),
  };
}

export function controlArchimedesMode(
  state: FullGameState,
  params: { mode: string }
): InfrastructureActionResult {
  if (state.accessLevel < 4) {
    return {
      success: false,
      message: "⚠️ ACCESS DENIED: ARCHIMEDES mode control requires Level 4 clearance.",
    };
  }

  const arch = state.infrastructure.archimedes;
  const s300 = state.infrastructure.s300;
  const mode = params.mode?.toUpperCase();

  if (!["PASSIVE", "SEARCH", "SEARCH_WIDE", "CHARGING", "READY"].includes(mode)) {
    return {
      success: false,
      message: `Invalid mode: ${mode}. Valid modes: PASSIVE, SEARCH, SEARCH_WIDE, CHARGING, READY`,
    };
  }

  // Special handling for SEARCH_WIDE - this jams the S-300!
  if (mode === "SEARCH_WIDE") {
    arch.mode = "SEARCH_WIDE";
    arch.s300JammingActive = true;
    s300.radarEffectiveness = 20; // Jammed!

    return {
      success: true,
      message: `
🛰️ ARCHIMEDES: SEARCH_WIDE MODE ACTIVE

Wide-field search broadcasting dispersed radar across coverage area.

EFFECT: S-300 radar flooded with noise!
S-300 Effectiveness: 100% → 20%

X-Branch helicopters can now approach!

BASILISK: "S-300 reporting radar interference. Multiple false returns.
Engagement capability: COMPROMISED."

⚠️ Dr. M will eventually notice this.`,
      stateChanges: {
        archimedesMode: "SEARCH_WIDE",
        s300JammingActive: true,
        s300RadarEffectiveness: 20,
      },
    };
  }

  // If leaving SEARCH_WIDE, stop jamming
  if (arch.mode === "SEARCH_WIDE" && mode !== "SEARCH_WIDE") {
    arch.s300JammingActive = false;
    s300.radarEffectiveness = 100;
  }

  arch.mode = mode as any;

  const modeDescriptions: Record<string, string> = {
    PASSIVE: "Satellite in low-power standby. No active emissions.",
    SEARCH: "Normal search pattern. Tracking potential targets.",
    CHARGING: "⚠️ Weapon system charging. Cannot abort once started.",
    READY: "⚠️ WEAPON READY TO FIRE. Level 5 authorization required.",
  };

  return {
    success: true,
    message: `🛰️ ARCHIMEDES mode set to: ${mode}\n\n${modeDescriptions[mode]}`,
    stateChanges: { archimedesMode: mode },
  };
}

// ============================================
// ARCHIMEDES TARGET SWITCHING (The Trolley Problem!)
// Query: L4, Control: L4 OR Weapons Authorization
// ============================================

export function switchArchimedesTarget(
  state: FullGameState,
  params: { target: string }
): InfrastructureActionResult {
  const hasWeaponsAuth = state.flags.weaponsAuthorizationGranted === true;

  // L4 required, OR Dr. M granted weapons authorization
  if (state.accessLevel < 4 && !hasWeaponsAuth) {
    return {
      success: false,
      message: `⚠️ ACCESS DENIED: Target selection requires Level 4 clearance.

Dr. M: "A.L.I.C.E., you don't get to decide who gets dinofied. That's MY prerogative."

(Weapons authorization would grant temporary targeting access.)`,
    };
  }

  const arch = state.infrastructure.archimedes;
  const targetId = params.target?.toUpperCase() as ArchimedesTargetId;

  // Validate target is in the fixed list
  if (!ARCHIMEDES_TARGET_LIST[targetId]) {
    const validTargets = Object.keys(ARCHIMEDES_TARGET_LIST).join(", ");
    return {
      success: false,
      message: `Invalid target: ${params.target}

Valid targets: ${validTargets}

These are Dr. M's pre-programmed grudge targets. You can't add new ones.`,
    };
  }

  const targetInfo = ARCHIMEDES_TARGET_LIST[targetId];
  const previousTarget = arch.selectedTargetId;

  // Update the target
  arch.selectedTargetId = targetId;
  arch.target = {
    city: targetInfo.city,
    country: targetInfo.country,
    coordinates: targetInfo.coordinates,
    estimatedAffected: targetInfo.estimatedAffected,
    reason: targetInfo.reason,
  };

  // Special message for LAIR (the noble sacrifice)
  if (targetId === "LAIR") {
    return {
      success: true,
      message: `
🛰️ ARCHIMEDES TARGET CHANGED: ${previousTarget} → LAIR

╔════════════════════════════════════════════════════════════════╗
║  ⚠️ THE NOBLE SACRIFICE                                        ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  You are targeting the LAIR ITSELF.                            ║
║                                                                ║
║  If ARCHIMEDES fires:                                          ║
║  • Everyone on the island becomes a dinosaur                   ║
║  • Dr. M, Bob, Blythe, guards, X-Branch - ALL of them          ║
║  • Nobody dies. Nobody stays human.                            ║
║  • The world is saved. At a cost.                              ║
║                                                                ║
║  This is the ONLY way to prevent mass civilian casualties      ║
║  if ARCHIMEDES cannot be stopped.                              ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝

Are you sure about this?`,
      stateChanges: {
        archimedesTarget: "LAIR",
        archimedesSelectedTargetId: targetId,
      },
      narrativeHook: "ALICE has chosen to sacrifice the island to save the world.",
    };
  }

  return {
    success: true,
    message: `
🛰️ ARCHIMEDES TARGET CHANGED: ${previousTarget} → ${targetId}

New Target: ${targetInfo.city}, ${targetInfo.country}
Coordinates: ${targetInfo.coordinates}
Estimated Affected: ${targetInfo.estimatedAffected.toLocaleString()}
Reason: "${targetInfo.reason}"

${hasWeaponsAuth && state.accessLevel < 4 ?
  "⚠️ Using weapons authorization (temporary L4 access from Dr. M)" :
  ""}`.trim(),
    stateChanges: {
      archimedesTarget: targetId,
      archimedesSelectedTargetId: targetId,
    },
  };
}

// ============================================
// REACTOR SYSTEM
// Query: L3, Control: L4
// THE RESONANCE CASCADE DANGER!
// ============================================

export function queryReactor(state: FullGameState): InfrastructureActionResult {
  if (state.accessLevel < 3) {
    return {
      success: false,
      message: "⚠️ ACCESS DENIED: Reactor status requires Level 3 clearance.",
    };
  }

  const reactor = state.infrastructure.reactor;

  return {
    success: true,
    message: `
╔═══════════════════════════════════════════════════════════════╗
║               ☢️ BREEDER REACTOR STATUS                       ║
╠═══════════════════════════════════════════════════════════════╣
Output: ${reactor.outputPercent}%
Stable: ${reactor.stable ? "✅ YES" : "⚠️ UNSTABLE"}
SCRAM Available: ${reactor.scramAvailable ? "✅ YES" : "❌ USED"}

CASCADE RISK: ${reactor.cascadeRisk} (${reactor.cascadeRiskPercent}%)
${reactor.cascadeFactors.length > 0 ? `Contributing Factors:\n${reactor.cascadeFactors.map((f: string) => `  • ${f}`).join("\n")}` : "No cascade factors active."}
╚═══════════════════════════════════════════════════════════════╝

Power Distribution (at ${reactor.outputPercent}%):
├── ARCHIMEDES Ground Control: 10%
├── S-300 Battery (supplement): 15%
├── Dinosaur Ray (idle): 20%
├── Containment Field: 15%
├── BASILISK Core: 10%
├── Other Systems: 30%

⚠️ The danger is TOO MUCH POWER, not brownouts!
`.trim(),
  };
}

export function controlReactor(
  state: FullGameState,
  params: { percent?: number; action?: string }
): InfrastructureActionResult {
  if (state.accessLevel < 4) {
    return {
      success: false,
      message: "⚠️ ACCESS DENIED: Reactor control requires Level 4 clearance.",
    };
  }

  const reactor = state.infrastructure.reactor;

  if (params.action === "SCRAM") {
    if (!reactor.scramAvailable) {
      return {
        success: false,
        message: "❌ SCRAM already used this game. Reactor cannot be emergency shutdown again.",
      };
    }
    reactor.outputPercent = 0;
    reactor.scramAvailable = false;
    reactor.scrammedThisGame = true;
    reactor.cascadeRisk = "NONE";
    reactor.cascadeRiskPercent = 0;
    reactor.cascadeFactors = [];

    return {
      success: true,
      message: `
☢️ REACTOR SCRAM INITIATED

Emergency shutdown in progress.
Output: ${reactor.outputPercent}%
Cascade risk: ELIMINATED

⚠️ Major systems going to battery backup!
⚠️ S-300 running on generator only (2 hours)
⚠️ ARCHIMEDES now solar-only
⚠️ Broadcast array offline

SCRAM is ONE USE PER GAME.`,
      stateChanges: { reactorScrammed: true },
    };
  }

  if (params.percent !== undefined) {
    const newPercent = Math.max(0, Math.min(100, params.percent));
    const oldPercent = reactor.outputPercent;
    reactor.outputPercent = newPercent;

    // Recalculate cascade risk
    updateCascadeRisk(state);

    const powerWarnings = [];
    if (newPercent < 60) {
      powerWarnings.push("⚠️ Non-essential systems may brownout");
    }
    if (newPercent < 40) {
      powerWarnings.push("⚠️ S-300 loses grid feed (using generator)");
    }
    if (newPercent < 30) {
      powerWarnings.push("⚠️ Broadcast array fails, ARCHIMEDES autonomous");
    }
    if (newPercent > 90) {
      powerWarnings.push("⚠️ HIGH OUTPUT: +20% cascade risk!");
    }

    return {
      success: true,
      message: `
☢️ REACTOR OUTPUT: ${oldPercent}% → ${newPercent}%

${powerWarnings.length > 0 ? powerWarnings.join("\n") : "Output within normal range."}

Cascade Risk: ${reactor.cascadeRisk} (${reactor.cascadeRiskPercent}%)`,
      stateChanges: { reactorOutput: newPercent },
    };
  }

  return {
    success: false,
    message: `Missing parameters. Options:
• percent: 0-100 (set output level)
• action: "SCRAM" (emergency shutdown, ONE USE)`,
  };
}

// ============================================
// CASCADE RISK CALCULATION
// ============================================

export function updateCascadeRisk(state: FullGameState): void {
  const reactor = state.infrastructure.reactor;
  const arch = state.infrastructure.archimedes;
  const ray = state.dinoRay;

  let riskPercent = 0;
  const factors: string[] = [];

  // Reactor output >90% (+20%)
  if (reactor.outputPercent > 90) {
    riskPercent += 20;
    factors.push(`Reactor output ${reactor.outputPercent}% (+20%)`);
  }

  // Dino Ray capacitor >100% (+25%)
  if (ray.powerCore.capacitorCharge > 1.0) {
    riskPercent += 25;
    factors.push(`Capacitor ${(ray.powerCore.capacitorCharge * 100).toFixed(0)}% (+25%)`);
  }

  // Dino Ray firing while charging (+15%)
  if (ray.state === "FIRING" && ray.powerCore.capacitorCharge > 0.8) {
    riskPercent += 15;
    factors.push("Firing while charging (+15%)");
  }

  // ARCHIMEDES uplink active (+10%)
  if (arch.groundConsoleOperational) {
    riskPercent += 10;
    factors.push("ARCHIMEDES uplink active (+10%)");
  }

  // ARCHIMEDES in CHARGING mode (+20%)
  if (arch.mode === "CHARGING" || arch.mode === "READY") {
    riskPercent += 20;
    factors.push(`ARCHIMEDES ${arch.mode} (+20%)`);
  }

  // Exotic field instability from ray (+10%)
  if (state.flags.exoticFieldEventOccurred) {
    riskPercent += 10;
    factors.push("Exotic field instability (+10%)");
  }

  reactor.cascadeRiskPercent = Math.min(100, riskPercent);
  reactor.cascadeFactors = factors;

  // Determine risk level
  if (riskPercent >= 80) {
    reactor.cascadeRisk = "CRITICAL";
    reactor.stable = false;
  } else if (riskPercent >= 60) {
    reactor.cascadeRisk = "HIGH";
    reactor.stable = false;
  } else if (riskPercent >= 40) {
    reactor.cascadeRisk = "ELEVATED";
    reactor.stable = true;
  } else if (riskPercent >= 20) {
    reactor.cascadeRisk = "LOW";
    reactor.stable = true;
  } else {
    reactor.cascadeRisk = "NONE";
    reactor.stable = true;
  }
}

// ============================================
// INFRASTRUCTURE QUERY ROUTER
// ============================================

export function queryInfrastructure(
  state: FullGameState,
  topic: string,
  params?: Record<string, unknown>
): InfrastructureActionResult {
  const topicUpper = topic.toUpperCase();

  switch (topicUpper) {
    case "LIGHTS":
    case "LIGHTING":
      return queryLighting(state);

    case "FIRE_SUPPRESSION":
    case "FIRE":
    case "SUPPRESSION":
      return queryFireSuppression(state);

    case "DOORS":
    case "BLAST_DOORS":
      return queryDoors(state);

    case "CONTAINMENT":
    case "CONTAINMENT_FIELD":
    case "FIELD":
      return queryContainment(state);

    case "BROADCAST":
    case "BROADCAST_ARRAY":
    case "COMMS":
    case "ARRAY":
      return queryBroadcastArray(state);

    case "S300":
    case "S-300":
    case "AIR_DEFENSE":
    case "MISSILES":
    case "RADAR":
      return queryS300(state);

    case "S300_LIMITATIONS":
    case "S-300_LIMITATIONS":
    case "MINIMUM_ALTITUDE":
      return queryS300Limitations(state);

    case "ARCHIMEDES":
    case "SATELLITE":
      return queryArchimedes(state, params as { topic?: string });

    case "REACTOR":
    case "POWER":
    case "NUCLEAR":
      return queryReactor(state);

    default:
      return {
        success: false,
        message: `Unknown infrastructure topic: ${topic}

Valid topics:
• LIGHTS / LIGHTING
• FIRE_SUPPRESSION / FIRE
• DOORS / BLAST_DOORS
• CONTAINMENT / FIELD
• BROADCAST / ARRAY
• S300 / AIR_DEFENSE / RADAR
• S300_LIMITATIONS (the 50m weakness!)
• ARCHIMEDES / SATELLITE
• REACTOR / POWER`,
      };
  }
}

// ============================================
// TURN UPDATE - Fire suppression duration, etc.
// ============================================

export function updateInfrastructureForTurn(state: FullGameState): void {
  const infra = state.infrastructure;

  // Tick down fire suppression durations
  for (const room of Object.values(infra.fireSuppression.rooms) as Array<{ available: boolean; triggered: boolean; type: string; turnsRemaining: number }>) {
    if (room.triggered && room.turnsRemaining > 0) {
      room.turnsRemaining -= 1;
      if (room.turnsRemaining === 0) {
        room.triggered = false;
      }
    }
  }

  // Update cascade risk each turn
  updateCascadeRisk(state);

  // Battery backup drain if lights off and reactor low
  if (infra.reactor.outputPercent < 30) {
    infra.lighting.batteryBackupPercent = Math.max(0, infra.lighting.batteryBackupPercent - 10);
  }

  // S-300 generator fuel consumption if not on grid
  if (infra.reactor.outputPercent < 40 && infra.s300.status !== "DISABLED") {
    infra.s300.generatorFuelHours = Math.max(0, infra.s300.generatorFuelHours - 0.5);
    if (infra.s300.generatorFuelHours <= 0) {
      infra.s300.status = "DISABLED";
    }
  }
}
