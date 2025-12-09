import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Users, Copy, Check, AlertCircle, Crown, Eye, EyeOff, LogOut, Shield, Skull } from 'lucide-react';

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
  console.error('Missing Supabase credentials!');
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
  LEGISLATIVE: 'legislative',
  LEGISLATIVE_CHANCELLOR: 'legislative_chancellor',
  EXECUTIVE: 'executive',
  GAME_OVER: 'game_over'
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

// START SCREEN COMPONENT
const StartScreen = ({ onCreateRoom, onJoinRoom }) => {
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');

  const handleCreate = () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }
    onCreateRoom(playerName);
  };

  const handleJoin = () => {
    if (!playerName.trim() || !roomCode.trim()) {
      setError('Please enter your name and room code');
      return;
    }
    onJoinRoom(playerName, roomCode.toUpperCase());
  };

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
            onChange={(e) => {
              setPlayerName(e.target.value);
              setError('');
            }}
            className="w-full px-4 py-3 bg-gray-700 rounded-lg border border-gray-600 focus:border-red-500 focus:outline-none mb-4"
          />
          
          <button
            onClick={handleCreate}
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
            onChange={(e) => {
              setRoomCode(e.target.value.toUpperCase());
              setError('');
            }}
            className="w-full px-4 py-3 bg-gray-700 rounded-lg border border-gray-600 focus:border-red-500 focus:outline-none mb-3"
          />
          
          <button
            onClick={handleJoin}
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

// LOBBY COMPONENT
const LobbyScreen = ({ room, players, myPlayerId, onLeave, onStartGame, onDestroyRoom, onKickPlayer }) => {
  const [copied, setCopied] = useState(false);
  const [disconnectedPlayer, setDisconnectedPlayer] = useState(null);
  const [reconnectTimer, setReconnectTimer] = useState(120);

  const isLeader = players.find(p => p.id === myPlayerId)?.is_leader;
  const connectedPlayers = players.filter(p => p.is_connected);

  useEffect(() => {
    const disconnected = players.find(p => !p.is_connected && p.role);
    if (disconnected && room?.status === 'playing') {
      setDisconnectedPlayer(disconnected);
      setReconnectTimer(120);
      
      const interval = setInterval(() => {
        setReconnectTimer(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    } else {
      setDisconnectedPlayer(null);
    }
  }, [players, room]);

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
                <button
                  onClick={copyRoomCode}
                  className="p-2 hover:bg-gray-700 rounded transition"
                >
                  {copied ? <Check size={20} className="text-green-500" /> : <Copy size={20} />}
                </button>
              </div>
            </div>
            
            <button
              onClick={onLeave}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center gap-2"
            >
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
                <div
                  key={player.id}
                  className={`p-3 rounded-lg flex items-center justify-between ${
                    player.is_connected
                      ? 'bg-gray-700'
                      : 'bg-red-900 bg-opacity-30 border border-red-500'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      player.is_connected ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                    <span className={player.id === myPlayerId ? 'font-bold' : ''}>
                      {player.name}
                      {player.id === myPlayerId && ' (You)'}
                    </span>
                    {player.is_leader && (
                      <Crown size={16} className="text-yellow-500" />
                    )}
                  </div>
                  {!player.is_connected && (
                    <span className="text-sm text-red-400">Disconnected</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {disconnectedPlayer && isLeader && reconnectTimer > 0 && (
            <div className="mb-6 p-4 bg-yellow-900 bg-opacity-30 border border-yellow-500 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <AlertCircle size={20} className="text-yellow-500" />
                  <span className="font-semibold">Player Disconnected</span>
                </div>
                <span className="text-sm">{Math.floor(reconnectTimer / 60)}:{(reconnectTimer % 60).toString().padStart(2, '0')}</span>
              </div>
              <p className="text-sm text-gray-300 mb-3">
                {disconnectedPlayer.name} has disconnected. They can rejoin with the same name within 2 minutes.
              </p>
              <button
                onClick={() => onKickPlayer(disconnectedPlayer.id)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm"
              >
                Kick Player & Continue
              </button>
            </div>
          )}

          {isLeader && (
            <div className="space-y-3">
              <button
                onClick={onStartGame}
                disabled={connectedPlayers.length < 5 || connectedPlayers.length > 10}
                className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-semibold transition"
              >
                {connectedPlayers.length < 5
                  ? `Need ${5 - connectedPlayers.length} more players`
                  : connectedPlayers.length > 10
                  ? 'Too many players (max 10)'
                  : 'Start Game'}
              </button>
              
              <button
                onClick={onDestroyRoom}
                className="w-full py-2 bg-red-900 hover:bg-red-800 rounded-lg text-sm"
              >
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

// ROLE REVEAL COMPONENT
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
              <div className={`p-6 rounded-lg border-4 ${
                party === 'liberal'
                  ? 'bg-blue-900 bg-opacity-30 border-blue-500'
                  : 'bg-red-900 bg-opacity-30 border-red-500'
              }`}>
                <div className="text-4xl font-bold mb-2">
                  {role === ROLES.HITLER ? '🎩 HITLER' : party === 'liberal' ? '🗽 LIBERAL' : '⚔️ FASCIST'}
                </div>
                <div className="text-xl">
                  Party: {party.toUpperCase()}
                </div>
              </div>

              {role === ROLES.HITLER && players.length <= 6 && (
                <div className="text-sm text-gray-400 bg-gray-900 p-4 rounded-lg">
                  <p className="mb-2">You are Hitler! Your Fascist teammate:</p>
                  <ul className="text-left space-y-1">
                    {fascists.map(p => (
                      <li key={p.id} className="flex items-center gap-2">
                        <Shield size={16} className="text-red-500" />
                        {p.name}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-xs">Remember: Play as Liberal as possible!</p>
                </div>
              )}

              {role === ROLES.HITLER && players.length > 6 && (
                <div className="text-sm text-gray-400 bg-gray-900 p-4 rounded-lg">
                  <p className="mb-2">You are Hitler!</p>
                  <ul className="text-left list-disc list-inside space-y-1">
                    <li>You don't know who the Fascists are</li>
                    <li>Play as Liberal as possible</li>
                    <li>Gain the trust of Liberals</li>
                    <li>Win by getting elected Chancellor after 3 Fascist policies</li>
                  </ul>
                </div>
              )}

              {role === ROLES.FASCIST && (
                <div className="text-sm text-gray-400 bg-gray-900 p-4 rounded-lg">
                  <p className="mb-2">You are a Fascist! Your team:</p>
                  <ul className="text-left space-y-1">
                    {hitler && (
                      <li className="flex items-center gap-2">
                        <Skull size={16} className="text-red-600" />
                        {hitler.name} <span className="text-red-500">(Hitler)</span>
                      </li>
                    )}
                    {fascists.map(p => (
                      <li key={p.id} className="flex items-center gap-2">
                        <Shield size={16} className="text-red-500" />
                        {p.name} <span className="text-orange-500">(Fascist)</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {role === ROLES.LIBERAL && (
                <div className="text-sm text-gray-400 bg-gray-900 p-4 rounded-lg">
                  <p>You are a Liberal! Your goals:</p>
                  <ul className="text-left list-disc list-inside space-y-1 mt-2">
                    <li>Enact 5 Liberal policies</li>
                    <li>Or assassinate Hitler</li>
                    <li>Be careful - you don't know who to trust!</li>
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

// GAME BOARD COMPONENT
const GameBoard = ({ room, players, myPlayerId, myRole, myParty, onLeave }) => {
  const gameState = room.game_state || {};
  const isLeader = players.find(p => p.id === myPlayerId)?.is_leader;
  
  const liberalPolicies = gameState.liberalPolicies || 0;
  const fascistPolicies = gameState.fascistPolicies || 0;
  const phase = gameState.phase || GAME_PHASES.NOMINATION;
  
  const connectedPlayers = players.filter(p => p.is_connected && !gameState.executedPlayers?.includes(p.id));
  const presidentIndex = gameState.presidentIndex || 0;
  const president = connectedPlayers[presidentIndex];
  const isPresident = president?.id === myPlayerId;

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 via-gray-900 to-black text-white p-4">
      <div className="max-w-6xl mx-auto pt-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-4xl font-bold text-red-500">SECRET HITLER</h1>
          <button
            onClick={onLeave}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center gap-2"
          >
            <LogOut size={18} />
            Leave
          </button>
        </div>

        {/* Policy Boards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-blue-900 bg-opacity-30 p-6 rounded-lg border-2 border-blue-500">
            <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
              <Shield size={24} />
              Liberal Policies
            </h3>
            <div className="flex gap-2">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className={`w-12 h-16 rounded border-2 ${
                    i < liberalPolicies
                      ? 'bg-blue-600 border-blue-400'
                      : 'bg-gray-700 border-gray-600'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="bg-red-900 bg-opacity-30 p-6 rounded-lg border-2 border-red-500">
            <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
              <Skull size={24} />
              Fascist Policies
            </h3>
            <div className="flex gap-2">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className={`w-12 h-16 rounded border-2 ${
                    i < fascistPolicies
                      ? 'bg-red-600 border-red-400'
                      : 'bg-gray-700 border-gray-600'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Game Info */}
        <div className="bg-gray-800 rounded-lg p-6 border border-red-900 mb-6">
          <div className="grid grid-cols-2 gap-4 mb-4">
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
          </div>

          <div>
            <span className="text-gray-400">Current President:</span>
            <div className="font-bold text-lg flex items-center gap-2">
              <Crown size={20} className="text-yellow-500" />
              {president?.name || 'None'}
              {isPresident && <span className="text-yellow-500">(You)</span>}
            </div>
          </div>
        </div>

        {/* Players List */}
        <div className="bg-gray-800 rounded-lg p-6 border border-red-900">
          <h3 className="text-xl font-semibold mb-4">Players</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {connectedPlayers.map((player, index) => (
              <div
                key={player.id}
                className={`p-3 rounded-lg border-2 ${
                  player.id === president?.id
                    ? 'bg-yellow-900 bg-opacity-30 border-yellow-500'
                    : 'bg-gray-700 border-gray-600'
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
        </div>

        {/* Placeholder for game actions */}
        <div className="mt-6 text-center text-gray-400 bg-gray-800 rounded-lg p-8 border border-red-900">
          <p className="text-lg">Game mechanics coming next...</p>
          <p className="text-sm mt-2">This includes nomination, voting, legislative session, and executive actions</p>
        </div>
      </div>
    </div>
  );
};

// MAIN APP COMPONENT
const SecretHitlerGame = () => {
  const [currentView, setCurrentView] = useState('start'); // start, lobby, role_reveal, game
  const [currentRoom, setCurrentRoom] = useState(null);
  const [players, setPlayers] = useState([]);
  const [myPlayerId, setMyPlayerId] = useState(null);
  const [myRole, setMyRole] = useState(null);
  const [myParty, setMyParty] = useState(null);
  const [error, setError] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const pollingIntervalRef = React.useRef(null);
  const subscriptionsRef = React.useRef([]);

  // Generate room code
  const generateRoomCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  // Create room
  const handleCreateRoom = async (playerName) => {
    try {
      const code = generateRoomCode();
      
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .insert({
          code,
          leader_id: null,
          status: 'waiting',
          game_state: { phase: GAME_PHASES.LOBBY }
        })
        .select()
        .single();

      if (roomError) throw roomError;

      const { data: player, error: playerError } = await supabase
        .from('players')
        .insert({
          room_id: room.id,
          name: playerName,
          is_leader: true,
          is_connected: true,
          role: null,
          party: null
        })
        .select()
        .single();

      if (playerError) throw playerError;

      await supabase
        .from('rooms')
        .update({ leader_id: player.id })
        .eq('id', room.id);

      setCurrentRoom(room);
      setMyPlayerId(player.id);
      setCurrentView('lobby');
      subscribeToRoom(room.id);
    } catch (err) {
      setError('Failed to create room: ' + err.message);
    }
  };

  // Join room
  const handleJoinRoom = async (playerName, roomCode) => {
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
        .single();

      let player;
      if (existingPlayer) {
        const { data: updatedPlayer, error: updateError } = await supabase
          .from('players')
          .update({ is_connected: true })
          .eq('id', existingPlayer.id)
          .select()
          .single();

        if (updateError) throw updateError;
        player = updatedPlayer;
        setMyRole(player.role);
        setMyParty(player.party);
      } else {
        const { data: newPlayer, error: playerError } = await supabase
          .from('players')
          .insert({
            room_id: room.id,
            name: playerName,
            is_leader: false,
            is_connected: true,
            role: null,
            party: null
          })
          .select()
          .single();

        if (playerError) throw playerError;
        player = newPlayer;
      }

      setCurrentRoom(room);
      setMyPlayerId(player.id);
      
      // Determine view based on room status
      if (room.status === 'playing' && player.role) {
        setCurrentView('game');
      } else {
        setCurrentView('lobby');
      }
      
      subscribeToRoom(room.id);
    } catch (err) {
      setError('Failed to join room: ' + err.message);
      setTimeout(() => setError(''), 3000);
    }
  };

  // Subscribe to room updates
  const subscribeToRoom = (roomId) => {
    // Clean up any existing subscriptions first
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    
    subscriptionsRef.current.forEach(sub => {
      try {
        sub.unsubscribe();
      } catch (e) {
        console.error('Error unsubscribing:', e);
      }
    });
    subscriptionsRef.current = [];
    
    console.log('Subscribing to room:', roomId);
    setIsSubscribed(false);

    // Subscribe to players changes
    const playersChannel = supabase
      .channel(`players-${roomId}-${Date.now()}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'players', 
          filter: `room_id=eq.${roomId}` 
        },
        () => {
          console.log('Player change detected');
          loadPlayers(roomId);
        }
      )
      .subscribe((status) => {
        console.log('Players subscription status:', status);
        if (status === 'SUBSCRIBED') {
          setIsSubscribed(true);
        }
      });

    // Subscribe to room changes
    const roomChannel = supabase
      .channel(`room-${roomId}-${Date.now()}`)
      .on('postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'rooms', 
          filter: `id=eq.${roomId}` 
        },
        async (payload) => {
          console.log('Room change detected:', payload.new);
          setCurrentRoom(payload.new);
          
          // Handle game start
          if (payload.new.status === 'playing' && 
              payload.new.game_state?.phase === GAME_PHASES.ROLE_REVEAL &&
              currentView === 'lobby') {
            await loadPlayers(roomId);
            setTimeout(() => setCurrentView('role_reveal'), 100);
          }
        }
      )
      .subscribe((status) => {
        console.log('Room subscription status:', status);
      });

    subscriptionsRef.current = [playersChannel, roomChannel];

    // Initial load
    loadPlayers(roomId);
    loadRoom(roomId);

    // Polling fallback - only if realtime isn't working
    pollingIntervalRef.current = setInterval(async () => {
      const room = await loadRoom(roomId);
      await loadPlayers(roomId);
      
      // Check if game started while in lobby
      if (room && 
          room.status === 'playing' && 
          room.game_state?.phase === GAME_PHASES.ROLE_REVEAL && 
          currentView === 'lobby') {
        setCurrentView('role_reveal');
      }
    }, 3000); // Increased to 3 seconds to reduce lag
  };

  // Load room
  const loadRoom = async (roomId) => {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single();

      if (!error && data) {
        setCurrentRoom(data);
        return data;
      }
      return null;
    } catch (err) {
      console.error('Error loading room:', err);
      return null;
    }
  };

  // Load players
  const loadPlayers = async (roomId) => {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading players:', error);
        return;
      }

      if (data) {
        setPlayers(data);
        
        // Update my role if it exists
        const me = data.find(p => p.id === myPlayerId);
        if (me && me.role) {
          setMyRole(me.role);
          setMyParty(me.party);
        }
      }
    } catch (err) {
      console.error('Error in loadPlayers:', err);
    }
  };

  // Start game
  const handleStartGame = async () => {
    const connectedPlayers = players.filter(p => p.is_connected);
    
    if (connectedPlayers.length < 5 || connectedPlayers.length > 10) {
      setError('Game requires 5-10 players');
      return;
    }

    try {
      const distribution = getRoleDistribution(connectedPlayers.length);
      const roles = [
        ...Array(distribution.liberal).fill(ROLES.LIBERAL),
        ...Array(distribution.fascist).fill(ROLES.FASCIST),
        ROLES.HITLER
      ];
      
      const shuffledRoles = roles.sort(() => Math.random() - 0.5);
      
      for (let i = 0; i < connectedPlayers.length; i++) {
        const role = shuffledRoles[i];
        const party = role === ROLES.LIBERAL ? 'liberal' : 'fascist';
        
        await supabase
          .from('players')
          .update({ role, party })
          .eq('id', connectedPlayers[i].id);

        if (connectedPlayers[i].id === myPlayerId) {
          setMyRole(role);
          setMyParty(party);
        }
      }

      const deck = [
        ...Array(6).fill('liberal'),
        ...Array(11).fill('fascist')
      ].sort(() => Math.random() - 0.5);

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
        investigatedPlayers: []
      };

      await supabase
        .from('rooms')
        .update({ 
          status: 'playing',
          game_state: gameState
        })
        .eq('id', currentRoom.id);

      setCurrentView('role_reveal');
    } catch (err) {
      setError('Failed to start game: ' + err.message);
    }
  };

  // Continue from role reveal
  const handleContinueFromRoleReveal = () => {
    setCurrentView('game');
  };

  // Leave room
  const handleLeaveRoom = async () => {
    if (!myPlayerId || !currentRoom) return;

    try {
      // Clean up subscriptions
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      
      subscriptionsRef.current.forEach(sub => {
        try {
          sub.unsubscribe();
        } catch (e) {
          console.error('Error unsubscribing:', e);
        }
      });
      subscriptionsRef.current = [];

      await supabase
        .from('players')
        .update({ is_connected: false })
        .eq('id', myPlayerId);

      setCurrentView('start');
      setCurrentRoom(null);
      setMyPlayerId(null);
      setPlayers([]);
      setMyRole(null);
      setMyParty(null);
      setIsSubscribed(false);
    } catch (err) {
      console.error('Error leaving room:', err);
    }
  };

  // Destroy room
  const handleDestroyRoom = async () => {
    if (!currentRoom) return;

    try {
      // Clean up subscriptions
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      
      subscriptionsRef.current.forEach(sub => {
        try {
          sub.unsubscribe();
        } catch (e) {
          console.error('Error unsubscribing:', e);
        }
      });
      subscriptionsRef.current = [];

      await supabase
        .from('rooms')
        .delete()
        .eq('id', currentRoom.id);

      setCurrentView('start');
      setCurrentRoom(null);
      setMyPlayerId(null);
      setPlayers([]);
      setIsSubscribed(false);
    } catch (err) {
      setError('Failed to destroy room: ' + err.message);
    }
  };

  // Kick player
  const handleKickPlayer = async (playerId) => {
    try {
      await supabase
        .from('players')
        .delete()
        .eq('id', playerId);
    } catch (err) {
      setError('Failed to kick player: ' + err.message);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      subscriptionsRef.current.forEach(sub => {
        try {
          sub.unsubscribe();
        } catch (e) {
          console.error('Error unsubscribing:', e);
        }
      });
    };
  }, []);

  // Monitor room status for view changes (removed to prevent conflicts)
  // The subscribeToRoom function now handles this

  return (
    <>
      {currentView === 'start' && (
        <StartScreen 
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
        />
      )}

      {currentView === 'lobby' && currentRoom && (
        <LobbyScreen
          room={currentRoom}
          players={players}
          myPlayerId={myPlayerId}
          onLeave={handleLeaveRoom}
          onStartGame={handleStartGame}
          onDestroyRoom={handleDestroyRoom}
          onKickPlayer={handleKickPlayer}
        />
      )}

      {currentView === 'role_reveal' && myRole && (
        <RoleRevealScreen
          role={myRole}
          party={myParty}
          players={players}
          onContinue={handleContinueFromRoleReveal}
        />
      )}

      {currentView === 'game' && currentRoom && myRole && (
        <GameBoard
          room={currentRoom}
          players={players}
          myPlayerId={myPlayerId}
          myRole={myRole}
          myParty={myParty}
          onLeave={handleLeaveRoom}
        />
      )}
    </>
  );
};

export default SecretHitlerGame