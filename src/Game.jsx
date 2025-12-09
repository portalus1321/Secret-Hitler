import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Users, Copy, Check, AlertCircle, Crown, Eye, EyeOff, LogOut, Shield, Skull, Ban, Search, Vote } from 'lucide-react';

// Tailwind CSS CDN
if (typeof document !== 'undefined' && !document.getElementById('tailwind-cdn')) {
  const link = document.createElement('link');
  link.id = 'tailwind-cdn';
  link.rel = 'stylesheet';
  link.href = 'https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css';
  document.head.appendChild(link);
}

// Initialize Supabase
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Please add REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY to your .env file');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const ROLES = {
  LIBERAL: 'liberal',
  FASCIST: 'fascist',
  HITLER: 'hitler'
};

const GAME_PHASES = {
  LOBBY: 'lobby',
  ROLE_REVEAL: 'role_reveal',
  NOMINATION: 'nomination',
  VOTING: 'voting',
  LEGISLATIVE_PRESIDENT: 'legislative_president',
  LEGISLATIVE_CHANCELLOR: 'legislative_chancellor',
  EXECUTIVE: 'executive',
  GAME_OVER: 'game_over'
};

const EXECUTIVE_ACTIONS = {
  INVESTIGATE: 'investigate',
  SPECIAL_ELECTION: 'special_election',
  POLICY_PEEK: 'policy_peek',
  EXECUTION: 'execution'
};

// Role distribution
const getRoleDistribution = (playerCount) => {
  const distributions = {
    5: { liberal: 3, fascist: 1, hitler: 1 },
    6: { liberal: 4, fascist: 1, hitler: 1 },
    7: { liberal: 4, fascist: 2, hitler: 1 },
    8: { liberal: 5, fascist: 2, hitler: 1 },
    9: { liberal: 5, fascist: 3, hitler: 1 },
    10: { liberal: 6, fascist: 3, hitler: 1 }
  };
  return distributions[playerCount] || distributions[5];
};

// Get executive action for player count and fascist policy
const getExecutiveAction = (playerCount, fascistPolicies) => {
  const actions = {
    '5-6': [null, null, EXECUTIVE_ACTIONS.POLICY_PEEK, EXECUTIVE_ACTIONS.EXECUTION, EXECUTIVE_ACTIONS.EXECUTION, EXECUTIVE_ACTIONS.EXECUTION],
    '7-8': [null, EXECUTIVE_ACTIONS.INVESTIGATE, EXECUTIVE_ACTIONS.SPECIAL_ELECTION, EXECUTIVE_ACTIONS.EXECUTION, EXECUTIVE_ACTIONS.EXECUTION, EXECUTIVE_ACTIONS.EXECUTION],
    '9-10': [EXECUTIVE_ACTIONS.INVESTIGATE, EXECUTIVE_ACTIONS.INVESTIGATE, EXECUTIVE_ACTIONS.SPECIAL_ELECTION, EXECUTIVE_ACTIONS.EXECUTION, EXECUTIVE_ACTIONS.EXECUTION, EXECUTIVE_ACTIONS.EXECUTION]
  };
  
  let key = '5-6';
  if (playerCount >= 7 && playerCount <= 8) key = '7-8';
  if (playerCount >= 9) key = '9-10';
  
  return actions[key][fascistPolicies] || null;
};

// START SCREEN
const StartScreen = ({ onCreateRoom, onJoinRoom }) => {
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 via-gray-900 to-black text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold mb-2 text-red-500">SECRET HITLER</h1>
          <p className="text-gray-400">Online Multiplayer Edition</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-red-900 mb-4">
          <input
            type="text"
            placeholder="Enter your name"
            value={playerName}
            onChange={(e) => { setPlayerName(e.target.value); setError(''); }}
            className="w-full px-4 py-3 bg-gray-700 rounded-lg border border-gray-600 focus:border-red-500 focus:outline-none mb-4"
            onKeyPress={(e) => e.key === 'Enter' && onCreateRoom(playerName)}
          />
          
          <button
            onClick={() => onCreateRoom(playerName)}
            className="w-full py-3 bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition mb-3"
          >
            Create New Room
          </button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-800 text-gray-400">OR</span>
            </div>
          </div>

          <input
            type="text"
            placeholder="Enter room code"
            value={roomCode}
            onChange={(e) => { setRoomCode(e.target.value.toUpperCase()); setError(''); }}
            className="w-full px-4 py-3 bg-gray-700 rounded-lg border border-gray-600 focus:border-red-500 focus:outline-none mb-3"
            onKeyPress={(e) => e.key === 'Enter' && onJoinRoom(playerName, roomCode)}
          />
          
          <button
            onClick={() => onJoinRoom(playerName, roomCode)}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition"
          >
            Join Room
          </button>

          {error && (
            <div className="mt-4 p-3 bg-red-900 bg-opacity-50 border border-red-500 rounded-lg flex items-center gap-2">
              <AlertCircle size={20} />
              <span className="text-sm">{error}</span>
            </div>
          )}
        </div>

        <div className="bg-gray-800 bg-opacity-50 rounded-lg p-4 text-sm text-gray-400">
          <h3 className="font-semibold text-white mb-2">How to Play:</h3>
          <ul className="space-y-1 list-disc list-inside">
            <li>5-10 players required</li>
            <li>Liberals vs Fascists (+ Hitler)</li>
            <li>Enact 5 Liberal or 6 Fascist policies to win</li>
            <li>Or assassinate Hitler / elect Hitler as Chancellor</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

// LOBBY SCREEN
const LobbyScreen = ({ room, players, myPlayerId, onLeave, onStartGame, onDestroyRoom, onKickPlayer }) => {
  const [copied, setCopied] = useState(false);
  
  const isLeader = players.find(p => p.id === myPlayerId)?.is_leader;
  const connectedPlayers = players.filter(p => p.is_connected);

  const copyRoomCode = () => {
    navigator.clipboard.writeText(room.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 via-gray-900 to-black text-white p-4">
      <div className="max-w-4xl mx-auto pt-8">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold mb-2 text-red-500">SECRET HITLER</h1>
          <p className="text-gray-400">Game Lobby</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-red-900">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Waiting Room</h2>
              <div className="flex items-center gap-2">
                <span className="text-gray-400">Room Code:</span>
                <code className="text-2xl font-mono text-red-400 font-bold">{room.code}</code>
                <button onClick={copyRoomCode} className="p-2 hover:bg-gray-700 rounded transition">
                  {copied ? <Check size={20} className="text-green-500" /> : <Copy size={20} />}
                </button>
              </div>
            </div>
            
            <button onClick={onLeave} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center gap-2">
              <LogOut size={18} />
              Leave
            </button>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Users size={20} />
              Players ({connectedPlayers.length}/10)
            </h3>
            <div className="space-y-2">
              {players.map(player => (
                <div key={player.id} className={`p-3 rounded-lg flex items-center justify-between ${
                  player.is_connected ? 'bg-gray-700' : 'bg-red-900 bg-opacity-30 border border-red-500'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${player.is_connected ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className={player.id === myPlayerId ? 'font-bold' : ''}>
                      {player.name}{player.id === myPlayerId && ' (You)'}
                    </span>
                    {player.is_leader && <Crown size={16} className="text-yellow-500" />}
                  </div>
                  {!player.is_connected && <span className="text-sm text-red-400">Disconnected</span>}
                </div>
              ))}
            </div>
          </div>

          {isLeader && (
            <div className="space-y-3">
              <button
                onClick={onStartGame}
                disabled={connectedPlayers.length < 5 || connectedPlayers.length > 10}
                className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-semibold transition"
              >
                {connectedPlayers.length < 5 ? `Need ${5 - connectedPlayers.length} more players` :
                 connectedPlayers.length > 10 ? 'Too many players (max 10)' : 'Start Game'}
              </button>
              
              <button onClick={onDestroyRoom} className="w-full py-2 bg-red-900 hover:bg-red-800 rounded-lg text-sm">
                Destroy Room
              </button>
            </div>
          )}

          {!isLeader && (
            <div className="text-center text-gray-400 py-3">
              Waiting for leader to start the game...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ROLE REVEAL SCREEN
const RoleRevealScreen = ({ role, party, players, onContinue }) => {
  const [showRole, setShowRole] = useState(false);

  const fascists = players.filter(p => p.party === 'fascist' && p.role !== ROLES.HITLER);
  const hitler = players.find(p => p.role === ROLES.HITLER);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 via-gray-900 to-black text-white flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-gray-800 rounded-lg p-8 border border-red-900 text-center">
          <h2 className="text-3xl font-bold mb-6">Your Secret Role</h2>
          
          <div className="mb-6">
            <button
              onClick={() => setShowRole(!showRole)}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-semibold flex items-center gap-2 mx-auto"
            >
              {showRole ? <EyeOff size={20} /> : <Eye size={20} />}
              {showRole ? 'Hide Role' : 'Reveal Role'}
            </button>
          </div>

          {showRole && (
            <div className="space-y-4">
              <div className={`p-6 rounded-lg border-4 ${party === 'liberal' ? 'bg-blue-900 bg-opacity-30 border-blue-500' : 'bg-red-900 bg-opacity-30 border-red-500'}`}>
                <div className="text-4xl font-bold mb-2">
                  {role === ROLES.HITLER ? '🎩 HITLER' : party === 'liberal' ? '🗽 LIBERAL' : '⚔️ FASCIST'}
                </div>
                <div className="text-xl">Party: {party.toUpperCase()}</div>
              </div>

              {role === ROLES.HITLER && players.length <= 6 && (
                <div className="text-sm text-gray-400 bg-gray-900 p-4 rounded-lg">
                  <p className="mb-2">You are Hitler! Your Fascist teammate:</p>
                  <ul className="text-left space-y-1">
                    {fascists.map(p => (
                      <li key={p.id} className="flex items-center gap-2">
                        <Shield size={16} className="text-red-500" />{p.name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {role === ROLES.FASCIST && (
                <div className="text-sm text-gray-400 bg-gray-900 p-4 rounded-lg">
                  <p className="mb-2">You are a Fascist! Your team:</p>
                  <ul className="text-left space-y-1">
                    {hitler && (
                      <li className="flex items-center gap-2">
                        <Skull size={16} className="text-red-600" />{hitler.name} <span className="text-red-500">(Hitler)</span>
                      </li>
                    )}
                    {fascists.map(p => (
                      <li key={p.id} className="flex items-center gap-2">
                        <Shield size={16} className="text-red-500" />{p.name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                onClick={onContinue}
                className="mt-6 px-8 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition"
              >
                Continue to Game
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// GAME BOARD
const GameBoard = ({ room, players, myPlayerId, myRole, myParty, onUpdateGameState, onLeave }) => {
  const gameState = room.game_state || {};
  const phase = gameState.phase || GAME_PHASES.NOMINATION;
  const liberalPolicies = gameState.liberalPolicies || 0;
  const fascistPolicies = gameState.fascistPolicies || 0;
  const electionTracker = gameState.electionTracker || 0;
  const executedPlayers = gameState.executedPlayers || [];
  const investigatedPlayers = gameState.investigatedPlayers || [];
  
  const alivePlayers = players.filter(p => p.is_connected && !executedPlayers.includes(p.id));
  const presidentIndex = gameState.presidentIndex || 0;
  const president = alivePlayers[presidentIndex];
  const chancellorId = gameState.nominatedChancellor;
  const chancellor = chancellorId ? players.find(p => p.id === chancellorId) : null;
  
  const isPresident = president?.id === myPlayerId;
  const isChancellor = chancellorId === myPlayerId;
  const votes = gameState.votes || {};
  const myVote = votes[myPlayerId];
  
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedPolicies, setSelectedPolicies] = useState([]);
  const [investigating, setInvestigating] = useState(null);

  // Nomination
  const nominateChancellor = async (playerId) => {
    if (!isPresident || phase !== GAME_PHASES.NOMINATION) return;
    
    const newState = {
      ...gameState,
      nominatedChancellor: playerId,
      phase: GAME_PHASES.VOTING,
      votes: {}
    };
    
    await onUpdateGameState(newState);
  };

  // Voting
  const castVote = async (vote) => {
    if (phase !== GAME_PHASES.VOTING || myVote !== undefined) return;
    
    const newVotes = { ...votes, [myPlayerId]: vote };
    const newState = { ...gameState, votes: newVotes };
    
    await onUpdateGameState(newState);
    
    // Check if all voted
    if (Object.keys(newVotes).length === alivePlayers.length) {
      setTimeout(() => resolveVote(newVotes), 2000);
    }
  };

  const resolveVote = async (finalVotes) => {
    const jaVotes = Object.values(finalVotes).filter(v => v === 'ja').length;
    const neinVotes = Object.values(finalVotes).filter(v => v === 'nein').length;
    
    if (jaVotes > neinVotes) {
      // Vote passed - check Hitler win condition
      if (fascistPolicies >= 3 && chancellor && players.find(p => p.id === chancellor.id)?.role === ROLES.HITLER) {
        const newState = {
          ...gameState,
          phase: GAME_PHASES.GAME_OVER,
          winner: 'fascist',
          winCondition: 'Hitler elected as Chancellor'
        };
        await onUpdateGameState(newState);
        return;
      }
      
      // Continue to legislative session
      const newState = {
        ...gameState,
        phase: GAME_PHASES.LEGISLATIVE_PRESIDENT,
        electionTracker: 0,
        lastPresident: president.id,
        lastChancellor: chancellorId,
        presidentHand: gameState.policyDeck.slice(0, 3),
        policyDeck: gameState.policyDeck.slice(3)
      };
      await onUpdateGameState(newState);
    } else {
      // Vote failed
      const newTracker = electionTracker + 1;
      
      if (newTracker >= 3) {
        // Chaos - enact top policy
        const topPolicy = gameState.policyDeck[0];
        const newLiberal = liberalPolicies + (topPolicy === 'liberal' ? 1 : 0);
        const newFascist = fascistPolicies + (topPolicy === 'fascist' ? 1 : 0);
        
        const newState = {
          ...gameState,
          liberalPolicies: newLiberal,
          fascistPolicies: newFascist,
          policyDeck: gameState.policyDeck.slice(1),
          electionTracker: 0,
          phase: GAME_PHASES.NOMINATION,
          presidentIndex: (presidentIndex + 1) % alivePlayers.length,
          nominatedChancellor: null,
          votes: {}
        };
        
        // Check win conditions
        if (newLiberal >= 5) {
          newState.phase = GAME_PHASES.GAME_OVER;
          newState.winner = 'liberal';
          newState.winCondition = '5 Liberal policies enacted';
        } else if (newFascist >= 6) {
          newState.phase = GAME_PHASES.GAME_OVER;
          newState.winner = 'fascist';
          newState.winCondition = '6 Fascist policies enacted';
        }
        
        await onUpdateGameState(newState);
      } else {
        const newState = {
          ...gameState,
          electionTracker: newTracker,
          phase: GAME_PHASES.NOMINATION,
          presidentIndex: (presidentIndex + 1) % alivePlayers.length,
          nominatedChancellor: null,
          votes: {}
        };
        await onUpdateGameState(newState);
      }
    }
  };

  // President discards one policy
  const presidentDiscard = async (policyIndex) => {
    if (!isPresident || phase !== GAME_PHASES.LEGISLATIVE_PRESIDENT) return;
    
    const hand = gameState.presidentHand || [];
    const discarded = hand[policyIndex];
    const remaining = hand.filter((_, i) => i !== policyIndex);
    
    const newState = {
      ...gameState,
      phase: GAME_PHASES.LEGISLATIVE_CHANCELLOR,
      chancellorHand: remaining,
      discardPile: [...(gameState.discardPile || []), discarded]
    };
    
    await onUpdateGameState(newState);
  };

  // Chancellor enacts policy
  const chancellorEnact = async (policyIndex) => {
    if (!isChancellor || phase !== GAME_PHASES.LEGISLATIVE_CHANCELLOR) return;
    
    const hand = gameState.chancellorHand || [];
    const enacted = hand[policyIndex];
    const discarded = hand.filter((_, i) => i !== policyIndex);
    
    const newLiberal = liberalPolicies + (enacted === 'liberal' ? 1 : 0);
    const newFascist = fascistPolicies + (enacted === 'fascist' ? 1 : 0);
    
    const action = enacted === 'fascist' ? getExecutiveAction(alivePlayers.length, newFascist) : null;
    
    const newState = {
      ...gameState,
      liberalPolicies: newLiberal,
      fascistPolicies: newFascist,
      discardPile: [...gameState.discardPile, ...discarded],
      phase: action ? GAME_PHASES.EXECUTIVE : GAME_PHASES.NOMINATION,
      executiveAction: action,
      presidentIndex: action ? presidentIndex : (presidentIndex + 1) % alivePlayers.length,
      nominatedChancellor: null,
      votes: {}
    };
    
    // Check win conditions
    if (newLiberal >= 5) {
      newState.phase = GAME_PHASES.GAME_OVER;
      newState.winner = 'liberal';
      newState.winCondition = '5 Liberal policies enacted';
    } else if (newFascist >= 6) {
      newState.phase = GAME_PHASES.GAME_OVER;
      newState.winner = 'fascist';
      newState.winCondition = '6 Fascist policies enacted';
    }
    
    await onUpdateGameState(newState);
  };

  // Executive actions
  const executePlayer = async (playerId) => {
    if (!isPresident || phase !== GAME_PHASES.EXECUTIVE) return;
    
    const targetPlayer = players.find(p => p.id === playerId);
    const isHitler = targetPlayer?.role === ROLES.HITLER;
    
    const newState = {
      ...gameState,
      executedPlayers: [...executedPlayers, playerId],
      phase: isHitler ? GAME_PHASES.GAME_OVER : GAME_PHASES.NOMINATION,
      presidentIndex: (presidentIndex + 1) % alivePlayers.length,
      nominatedChancellor: null
    };
    
    if (isHitler) {
      newState.winner = 'liberal';
      newState.winCondition = 'Hitler assassinated';
    }
    
    await onUpdateGameState(newState);
  };

  const investigatePlayer = (playerId) => {
    const player = players.find(p => p.id === playerId);
    setInvestigating(player);
  };

  const closeInvestigation = async () => {
    setInvestigating(null);
    const newState = {
      ...gameState,
      investigatedPlayers: [...investigatedPlayers, investigating.id],
      phase: GAME_PHASES.NOMINATION,
      presidentIndex: (presidentIndex + 1) % alivePlayers.length,
      nominatedChancellor: null
    };
    await onUpdateGameState(newState);
  };

  // Game Over Screen
  if (phase === GAME_PHASES.GAME_OVER) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 via-gray-900 to-black text-white flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-gray-800 rounded-lg p-8 border-4 border-yellow-500">
          <h1 className="text-4xl font-bold text-center mb-6">
            {gameState.winner === 'liberal' ? '🗽 LIBERALS WIN!' : '⚔️ FASCISTS WIN!'}
          </h1>
          <p className="text-xl text-center mb-8">{gameState.winCondition}</p>
          
          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-3">Players:</h3>
            <div className="space-y-2">
              {players.map(p => (
                <div key={p.id} className={`p-3 rounded-lg ${p.party === 'liberal' ? 'bg-blue-900 bg-opacity-30' : 'bg-red-900 bg-opacity-30'}`}>
                  <span className="font-bold">{p.name}</span> - {p.role === ROLES.HITLER ? 'Hitler' : p.party}
                </div>
              ))}
            </div>
          </div>
          
          <button onClick={onLeave} className="w-full py-3 bg-red-600 hover:bg-red-700 rounded-lg font-semibold">
            Leave Game
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 via-gray-900 to-black text-white p-4">
      <div className="max-w-6xl mx-auto pt-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-4xl font-bold text-red-500">SECRET HITLER</h1>
          <button onClick={onLeave} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center gap-2">
            <LogOut size={18} />Leave
          </button>
        </div>

        {/* Policy Boards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-blue-900 bg-opacity-30 p-6 rounded-lg border-2 border-blue-500">
            <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
              <Shield size={24} />Liberal Policies
            </h3>
            <div className="flex gap-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className={`w-12 h-16 rounded border-2 ${i < liberalPolicies ? 'bg-blue-600 border-blue-400' : 'bg-gray-700 border-gray-600'}`} />
              ))}
            </div>
          </div>

          <div className="bg-red-900 bg-opacity-30 p-6 rounded-lg border-2 border-red-500">
            <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
              <Skull size={24} />Fascist Policies
            </h3>
            <div className="flex gap-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className={`w-12 h-16 rounded border-2 ${i < fascistPolicies ? 'bg-red-600 border-red-400' : 'bg-gray-700 border-gray-600'}`} />
              ))}
            </div>
          </div>
        </div>

        {/* Election Tracker */}
        <div className="bg-gray-800 rounded-lg p-4 border border-red-900 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Election Tracker:</span>
            <div className="flex gap-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className={`w-8 h-8 rounded border-2 ${i < electionTracker ? 'bg-red-600 border-red-400' : 'bg-gray-700 border-gray-600'}`} />
              ))}
            </div>
          </div>
        </div>

        {/* Game Info */}
        <div className="bg-gray-800 rounded-lg p-6 border border-red-900 mb-6">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <span className="text-gray-400">Your Role:</span>
              <div className={`font-bold text-lg ${myParty === 'liberal' ? 'text-blue-400' : 'text-red-400'}`}>
                {myRole === ROLES.HITLER ? 'Hitler' : myRole === ROLES.FASCIST ? 'Fascist' : 'Liberal'}
              </div>
            </div>
            <div>
              <span className="text-gray-400">Phase:</span>
              <div className="font-bold text-lg text-yellow-400">
                {phase.replace(/_/g, ' ').toUpperCase()}
              </div>
            </div>
            <div>
              <span className="text-gray-400">President:</span>
              <div className="font-bold text-lg flex items-center gap-2">
                <Crown size={20} className="text-yellow-500" />
                {president?.name || 'None'}
                {isPresident && <span className="text-yellow-500">(You)</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Nomination Phase */}
        {phase === GAME_PHASES.NOMINATION && isPresident && (
          <div className="bg-gray-800 rounded-lg p-6 border-2 border-yellow-500 mb-6">
            <h3 className="text-xl font-semibold mb-4">Nominate a Chancellor</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {alivePlayers
                .filter(p => p.id !== president.id && p.id !== gameState.lastChancellor && (alivePlayers.length > 5 || p.id !== gameState.lastPresident))
                .map(player => (
                  <button
                    key={player.id}
                    onClick={() => nominateChancellor(player.id)}
                    className="p-3 bg-blue-600 hover:bg-blue-700 rounded-lg border-2 border-blue-400 transition"
                  >
                    {player.name}
                  </button>
                ))}
            </div>
          </div>
        )}

        {phase === GAME_PHASES.NOMINATION && !isPresident && (
          <div className="bg-gray-800 rounded-lg p-6 border border-red-900 mb-6 text-center">
            <p className="text-gray-400">Waiting for {president?.name} to nominate a Chancellor...</p>
          </div>
        )}

        {/* Voting Phase */}
        {phase === GAME_PHASES.VOTING && (
          <div className="bg-gray-800 rounded-lg p-6 border-2 border-yellow-500 mb-6">
            <h3 className="text-xl font-semibold mb-4">
              Vote on Government: {president?.name} and {chancellor?.name}
            </h3>
            
            {myVote === undefined ? (
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => castVote('ja')}
                  className="px-8 py-4 bg-green-600 hover:bg-green-700 rounded-lg text-xl font-bold"
                >
                  JA!
                </button>
                <button
                  onClick={() => castVote('nein')}
                  className="px-8 py-4 bg-red-600 hover:bg-red-700 rounded-lg text-xl font-bold"
                >
                  NEIN!
                </button>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-lg mb-4">You voted: <span className="font-bold">{myVote.toUpperCase()}</span></p>
                <p className="text-gray-400">Waiting for other players... ({Object.keys(votes).length}/{alivePlayers.length})</p>
              </div>
            )}

            {Object.keys(votes).length === alivePlayers.length && (
              <div className="mt-6 pt-6 border-t border-gray-700">
                <h4 className="text-lg font-semibold mb-3">Results:</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-900 bg-opacity-30 p-4 rounded-lg">
                    <div className="text-2xl font-bold mb-2">JA: {Object.values(votes).filter(v => v === 'ja').length}</div>
                    {alivePlayers.filter(p => votes[p.id] === 'ja').map(p => (
                      <div key={p.id} className="text-sm">{p.name}</div>
                    ))}
                  </div>
                  <div className="bg-red-900 bg-opacity-30 p-4 rounded-lg">
                    <div className="text-2xl font-bold mb-2">NEIN: {Object.values(votes).filter(v => v === 'nein').length}</div>
                    {alivePlayers.filter(p => votes[p.id] === 'nein').map(p => (
                      <div key={p.id} className="text-sm">{p.name}</div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Legislative Session - President */}
        {phase === GAME_PHASES.LEGISLATIVE_PRESIDENT && (
          <div className="bg-gray-800 rounded-lg p-6 border-2 border-yellow-500 mb-6">
            {isPresident ? (
              <>
                <h3 className="text-xl font-semibold mb-4">President: Choose one policy to discard</h3>
                <div className="flex gap-4 justify-center">
                  {(gameState.presidentHand || []).map((policy, i) => (
                    <button
                      key={i}
                      onClick={() => presidentDiscard(i)}
                      className={`w-32 h-48 rounded-lg border-4 font-bold text-xl ${
                        policy === 'liberal' ? 'bg-blue-600 border-blue-400' : 'bg-red-600 border-red-400'
                      }`}
                    >
                      {policy.toUpperCase()}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center text-gray-400">
                <p>President {president?.name} is reviewing policies...</p>
              </div>
            )}
          </div>
        )}

        {/* Legislative Session - Chancellor */}
        {phase === GAME_PHASES.LEGISLATIVE_CHANCELLOR && (
          <div className="bg-gray-800 rounded-lg p-6 border-2 border-yellow-500 mb-6">
            {isChancellor ? (
              <>
                <h3 className="text-xl font-semibold mb-4">Chancellor: Choose one policy to enact</h3>
                <div className="flex gap-4 justify-center">
                  {(gameState.chancellorHand || []).map((policy, i) => (
                    <button
                      key={i}
                      onClick={() => chancellorEnact(i)}
                      className={`w-32 h-48 rounded-lg border-4 font-bold text-xl ${
                        policy === 'liberal' ? 'bg-blue-600 border-blue-400' : 'bg-red-600 border-red-400'
                      }`}
                    >
                      {policy.toUpperCase()}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center text-gray-400">
                <p>Chancellor {chancellor?.name} is enacting a policy...</p>
              </div>
            )}
          </div>
        )}

        {/* Executive Action */}
        {phase === GAME_PHASES.EXECUTIVE && (
          <div className="bg-gray-800 rounded-lg p-6 border-2 border-purple-500 mb-6">
            {isPresident ? (
              <>
                <h3 className="text-xl font-semibold mb-4">
                  Executive Action: {gameState.executiveAction?.replace(/_/g, ' ').toUpperCase()}
                </h3>
                
                {gameState.executiveAction === EXECUTIVE_ACTIONS.EXECUTION && (
                  <>
                    <p className="text-gray-400 mb-4">Choose a player to execute:</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {alivePlayers.filter(p => p.id !== president.id).map(player => (
                        <button
                          key={player.id}
                          onClick={() => executePlayer(player.id)}
                          className="p-3 bg-red-600 hover:bg-red-700 rounded-lg border-2 border-red-400 flex items-center gap-2"
                        >
                          <Ban size={20} />
                          {player.name}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {gameState.executiveAction === EXECUTIVE_ACTIONS.INVESTIGATE && (
                  <>
                    <p className="text-gray-400 mb-4">Choose a player to investigate:</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {alivePlayers
                        .filter(p => p.id !== president.id && !investigatedPlayers.includes(p.id))
                        .map(player => (
                          <button
                            key={player.id}
                            onClick={() => investigatePlayer(player.id)}
                            className="p-3 bg-purple-600 hover:bg-purple-700 rounded-lg border-2 border-purple-400 flex items-center gap-2"
                          >
                            <Search size={20} />
                            {player.name}
                          </button>
                        ))}
                    </div>
                  </>
                )}

                {gameState.executiveAction === EXECUTIVE_ACTIONS.POLICY_PEEK && (
                  <div className="text-center">
                    <p className="mb-4">Next 3 policies:</p>
                    <div className="flex gap-4 justify-center mb-4">
                      {gameState.policyDeck.slice(0, 3).map((policy, i) => (
                        <div
                          key={i}
                          className={`w-24 h-36 rounded-lg border-4 flex items-center justify-center font-bold ${
                            policy === 'liberal' ? 'bg-blue-600 border-blue-400' : 'bg-red-600 border-red-400'
                          }`}
                        >
                          {policy.toUpperCase()}
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={async () => {
                        const newState = {
                          ...gameState,
                          phase: GAME_PHASES.NOMINATION,
                          presidentIndex: (presidentIndex + 1) % alivePlayers.length,
                          nominatedChancellor: null
                        };
                        await onUpdateGameState(newState);
                      }}
                      className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg"
                    >
                      Continue
                    </button>
                  </div>
                )}

                {gameState.executiveAction === EXECUTIVE_ACTIONS.SPECIAL_ELECTION && (
                  <>
                    <p className="text-gray-400 mb-4">Choose the next Presidential Candidate:</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {alivePlayers.filter(p => p.id !== president.id).map(player => (
                        <button
                          key={player.id}
                          onClick={async () => {
                            const specialIndex = alivePlayers.findIndex(p => p.id === player.id);
                            const newState = {
                              ...gameState,
                              phase: GAME_PHASES.NOMINATION,
                              presidentIndex: specialIndex,
                              specialElectionActive: true,
                              returnPresidentIndex: (presidentIndex + 1) % alivePlayers.length,
                              nominatedChancellor: null
                            };
                            await onUpdateGameState(newState);
                          }}
                          className="p-3 bg-yellow-600 hover:bg-yellow-700 rounded-lg border-2 border-yellow-400"
                        >
                          {player.name}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="text-center text-gray-400">
                <p>President {president?.name} is using their executive power...</p>
              </div>
            )}
          </div>
        )}

        {/* Investigation Modal */}
        {investigating && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-8 border-4 border-purple-500 max-w-md">
              <h3 className="text-2xl font-bold mb-4">Investigation Result</h3>
              <div className={`p-6 rounded-lg border-4 mb-6 ${
                investigating.party === 'liberal' ? 'bg-blue-900 bg-opacity-30 border-blue-500' : 'bg-red-900 bg-opacity-30 border-red-500'
              }`}>
                <div className="text-xl font-bold mb-2">{investigating.name}</div>
                <div className="text-3xl font-bold">{investigating.party.toUpperCase()}</div>
              </div>
              <button
                onClick={closeInvestigation}
                className="w-full py-3 bg-green-600 hover:bg-green-700 rounded-lg font-semibold"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Players List */}
        <div className="bg-gray-800 rounded-lg p-6 border border-red-900">
          <h3 className="text-xl font-semibold mb-4">Players</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {alivePlayers.map(player => (
              <div
                key={player.id}
                className={`p-3 rounded-lg border-2 ${
                  player.id === president?.id ? 'bg-yellow-900 bg-opacity-30 border-yellow-500' :
                  player.id === chancellorId ? 'bg-purple-900 bg-opacity-30 border-purple-500' :
                  'bg-gray-700 border-gray-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  {player.id === president?.id && <Crown size={16} className="text-yellow-500" />}
                  <span className={player.id === myPlayerId ? 'font-bold' : ''}>
                    {player.name}
                    {player.id === myPlayerId && ' (You)'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {executedPlayers.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-700">
              <h4 className="text-sm font-semibold mb-2 text-gray-400">Executed:</h4>
              <div className="flex gap-2">
                {executedPlayers.map(id => {
                  const player = players.find(p => p.id === id);
                  return player ? (
                    <span key={id} className="text-sm text-red-400">
                      {player.name}
                    </span>
                  ) : null;
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// MAIN APP
const SecretHitlerGame = () => {
  const [currentView, setCurrentView] = useState('start');
  const [currentRoom, setCurrentRoom] = useState(null);
  const [players, setPlayers] = useState([]);
  const [myPlayerId, setMyPlayerId] = useState(null);
  const [myRole, setMyRole] = useState(null);
  const [myParty, setMyParty] = useState(null);
  const pollingIntervalRef = useRef(null);

  const generateRoomCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

  const handleCreateRoom = async (playerName) => {
    if (!playerName.trim()) return;

    try {
      const code = generateRoomCode();
      
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .insert({ code, leader_id: null, status: 'waiting', game_state: { phase: GAME_PHASES.LOBBY } })
        .select()
        .single();

      if (roomError) throw roomError;

      const { data: player, error: playerError } = await supabase
        .from('players')
        .insert({ room_id: room.id, name: playerName, is_leader: true, is_connected: true, role: null, party: null })
        .select()
        .single();

      if (playerError) throw playerError;

      await supabase.from('rooms').update({ leader_id: player.id }).eq('id', room.id);

      setCurrentRoom(room);
      setMyPlayerId(player.id);
      setCurrentView('lobby');
      startPolling(room.id);
    } catch (err) {
      console.error('Failed to create room:', err);
    }
  };

  const handleJoinRoom = async (playerName, roomCode) => {
    if (!playerName.trim() || !roomCode.trim()) return;

    try {
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('code', roomCode)
        .single();

      if (roomError) throw new Error('Room not found');

      const { data: existingPlayer } = await supabase
        .from('players')
        .select('*')
        .eq('room_id', room.id)
        .eq('name', playerName)
        .maybeSingle();

      let player;
      if (existingPlayer) {
        const { data: updatedPlayer } = await supabase
          .from('players')
          .update({ is_connected: true })
          .eq('id', existingPlayer.id)
          .select()
          .single();
        player = updatedPlayer;
        setMyRole(player.role);
        setMyParty(player.party);
      } else {
        const { data: newPlayer } = await supabase
          .from('players')
          .insert({ room_id: room.id, name: playerName, is_leader: false, is_connected: true, role: null, party: null })
          .select()
          .single();
        player = newPlayer;
      }

      setCurrentRoom(room);
      setMyPlayerId(player.id);
      
      if (room.status === 'playing' && player.role) {
        setCurrentView('game');
      } else {
        setCurrentView('lobby');
      }
      
      startPolling(room.id);
    } catch (err) {
      console.error('Failed to join room:', err);
    }
  };

  const startPolling = (roomId) => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    loadRoomData(roomId);

    pollingIntervalRef.current = setInterval(() => {
      loadRoomData(roomId);
    }, 2000);
  };

  const loadRoomData = async (roomId) => {
    try {
      const [roomResult, playersResult] = await Promise.all([
        supabase.from('rooms').select('*').eq('id', roomId).single(),
        supabase.from('players').select('*').eq('room_id', roomId).order('created_at', { ascending: true })
      ]);

      if (roomResult.data) {
        const room = roomResult.data;
        setCurrentRoom(room);

        // Auto-switch views based on game state
        if (room.status === 'playing') {
          const me = playersResult.data?.find(p => p.id === myPlayerId);
          if (me?.role) {
            setMyRole(me.role);
            setMyParty(me.party);
            
            if (currentView === 'lobby') {
              setCurrentView('role_reveal');
            }
          }
        }
      }

      if (playersResult.data) {
        setPlayers(playersResult.data);
      }
    } catch (err) {
      console.error('Error loading room data:', err);
    }
  };

  const handleStartGame = async () => {
    const connectedPlayers = players.filter(p => p.is_connected);
    if (connectedPlayers.length < 5 || connectedPlayers.length > 10) return;

    try {
      const distribution = getRoleDistribution(connectedPlayers.length);
      const roles = [
        ...Array(distribution.liberal).fill(ROLES.LIBERAL),
        ...Array(distribution.fascist).fill(ROLES.FASCIST),
        ROLES.HITLER
      ].sort(() => Math.random() - 0.5);

      await Promise.all(connectedPlayers.map((player, i) => {
        const role = roles[i];
        const party = role === ROLES.LIBERAL ? 'liberal' : 'fascist';
        return supabase.from('players').update({ role, party }).eq('id', player.id);
      }));

      const deck = [...Array(6).fill('liberal'), ...Array(11).fill('fascist')].sort(() => Math.random() - 0.5);

      const gameState = {
        phase: GAME_PHASES.ROLE_REVEAL,
        liberalPolicies: 0,
        fascistPolicies: 0,
        policyDeck: deck,
        discardPile: [],
        electionTracker: 0,
        presidentIndex: 0,
        chancellor: null,
        lastPresident: null,
        lastChancellor: null,
        executedPlayers: [],
        investigatedPlayers: [],
        votes: {}
      };

      await supabase.from('rooms').update({ status: 'playing', game_state: gameState }).eq('id', currentRoom.id);
    } catch (err) {
      console.error('Failed to start game:', err);
    }
  };

  const handleUpdateGameState = async (newGameState) => {
    try {
      await supabase
        .from('rooms')
        .update({ game_state: newGameState })
        .eq('id', currentRoom.id);
    } catch (err) {
      console.error('Failed to update game state:', err);
    }
  };

  const handleLeaveRoom = async () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    if (myPlayerId) {
      await supabase.from('players').update({ is_connected: false }).eq('id', myPlayerId);
    }

    setCurrentView('start');
    setCurrentRoom(null);
    setMyPlayerId(null);
    setPlayers([]);
    setMyRole(null);
    setMyParty(null);
  };

  const handleDestroyRoom = async () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    await supabase.from('rooms').delete().eq('id', currentRoom.id);

    setCurrentView('start');
    setCurrentRoom(null);
    setMyPlayerId(null);
    setPlayers([]);
  };

  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  return (
    <>
      {currentView === 'start' && (
        <StartScreen onCreateRoom={handleCreateRoom} onJoinRoom={handleJoinRoom} />
      )}

      {currentView === 'lobby' && currentRoom && (
        <LobbyScreen
          room={currentRoom}
          players={players}
          myPlayerId={myPlayerId}
          onLeave={handleLeaveRoom}
          onStartGame={handleStartGame}
          onDestroyRoom={handleDestroyRoom}
          onKickPlayer={() => {}}
        />
      )}

      {currentView === 'role_reveal' && myRole && (
        <RoleRevealScreen
          role={myRole}
          party={myParty}
          players={players}
          onContinue={() => setCurrentView('game')}
        />
      )}

      {currentView === 'game' && currentRoom && myRole && (
        <GameBoard
          room={currentRoom}
          players={players}
          myPlayerId={myPlayerId}
          myRole={myRole}
          myParty={myParty}
          onUpdateGameState={handleUpdateGameState}
          onLeave={handleLeaveRoom}
        />
      )}
    </>
  );
};

export default SecretHitlerGame;