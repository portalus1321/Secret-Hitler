import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Users, Copy, Check, AlertCircle, Crown, Eye, EyeOff, LogOut, RefreshCw } from 'lucide-react';

// Tailwind CSS CDN - Add this if Tailwind isn't configured in your project
if (typeof document !== 'undefined' && !document.getElementById('tailwind-cdn')) {
  const link = document.createElement('link');
  link.id = 'tailwind-cdn';
  link.rel = 'stylesheet';
  link.href = 'https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css';
  document.head.appendChild(link);
}

// Initialize Supabase client from environment variables
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials!');
  console.error('REACT_APP_SUPABASE_URL:', supabaseUrl);
  console.error('REACT_APP_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Present' : 'Missing');
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
  ELECTION: 'election',
  NOMINATION: 'nomination',
  VOTING: 'voting',
  LEGISLATIVE: 'legislative',
  EXECUTIVE: 'executive',
  GAME_OVER: 'game_over'
};

// Role distribution based on player count
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

const SecretHitlerGame = () => {
  const [gameState, setGameState] = useState('menu'); // menu, creating, joining, lobby, playing
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [currentRoom, setCurrentRoom] = useState(null);
  const [players, setPlayers] = useState([]);
  const [myPlayerId, setMyPlayerId] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [showReconnectPrompt, setShowReconnectPrompt] = useState(false);
  const [disconnectedPlayer, setDisconnectedPlayer] = useState(null);
  const [reconnectTimer, setReconnectTimer] = useState(120);
  
  // Game specific states
  const [myRole, setMyRole] = useState(null);
  const [myParty, setMyParty] = useState(null);
  const [gamePhase, setGamePhase] = useState(GAME_PHASES.LOBBY);
  const [liberalPolicies, setLiberalPolicies] = useState(0);
  const [fascistPolicies, setFascistPolicies] = useState(0);
  const [president, setPresident] = useState(null);
  const [chancellor, setChancellor] = useState(null);
  const [nominatedChancellor, setNominatedChancellor] = useState(null);
  const [votes, setVotes] = useState({});
  const [showRole, setShowRole] = useState(false);
  const [policyDeck, setPolicyDeck] = useState([]);
  const [presidentHand, setPresidentHand] = useState([]);
  const [chancellorHand, setChancellorHand] = useState([]);
  const [electionTracker, setElectionTracker] = useState(0);
  const [executedPlayers, setExecutedPlayers] = useState([]);
  const [investigatedPlayers, setInvestigatedPlayers] = useState([]);

  // Generate random room code
  const generateRoomCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  // Create room
  const createRoom = async () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    try {
      const code = generateRoomCode();
      
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .insert({
          code,
          leader_id: null,
          status: 'waiting',
          game_state: {}
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
      setRoomCode(code);
      setGameState('lobby');
      setError('');

      subscribeToRoom(room.id);
    } catch (err) {
      setError('Failed to create room: ' + err.message);
    }
  };

  // Join room
  const joinRoom = async () => {
    if (!playerName.trim() || !roomCode.trim()) {
      setError('Please enter your name and room code');
      return;
    }

    try {
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('code', roomCode.toUpperCase())
        .single();

      if (roomError) throw new Error('Room not found');

      // Check if player was previously in this room (for reconnection)
      const { data: existingPlayer } = await supabase
        .from('players')
        .select('*')
        .eq('room_id', room.id)
        .eq('name', playerName)
        .single();

      let player;
      if (existingPlayer) {
        // Reconnecting player
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
        // New player
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
      setRoomCode(room.code);
      setGameState('lobby');
      setError('');

      subscribeToRoom(room.id);
    } catch (err) {
      setError('Failed to join room: ' + err.message);
    }
  };

  // Subscribe to room updates
  const subscribeToRoom = (roomId) => {
    // Unsubscribe from any existing subscriptions first
    supabase.removeAllChannels();

    // Subscribe to players changes
    const playersChannel = supabase
      .channel(`players-${roomId}`, {
        config: {
          broadcast: { self: true },
          presence: { key: myPlayerId }
        }
      })
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'players', 
          filter: `room_id=eq.${roomId}` 
        },
        (payload) => {
          console.log('Player change detected:', payload);
          loadPlayers(roomId);
        }
      )
      .subscribe((status) => {
        console.log('Players subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to players channel');
        }
      });

    // Subscribe to room changes
    const roomChannel = supabase
      .channel(`room-${roomId}`)
      .on('postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'rooms', 
          filter: `id=eq.${roomId}` 
        },
        (payload) => {
          console.log('Room change detected:', payload);
          setCurrentRoom(payload.new);
          if (payload.new.game_state) {
            updateGameState(payload.new.game_state);
          }
        }
      )
      .subscribe((status) => {
        console.log('Room subscription status:', status);
      });

    // Initial load
    loadPlayers(roomId);

    // Polling fallback - check for updates every 2 seconds
    const pollingInterval = setInterval(() => {
      loadPlayers(roomId);
    }, 2000);

    return () => {
      console.log('Unsubscribing from channels');
      clearInterval(pollingInterval);
      playersChannel.unsubscribe();
      roomChannel.unsubscribe();
    };
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
        console.log('Loaded players:', data);
        setPlayers(data);
        
        // Check for disconnected players
        const disconnected = data.find(p => !p.is_connected && p.role);
        if (disconnected && currentRoom?.status === 'playing') {
          setDisconnectedPlayer(disconnected);
          startReconnectTimer();
        } else {
          setDisconnectedPlayer(null);
        }
      }
    } catch (err) {
      console.error('Error in loadPlayers:', err);
    }
  };

  // Start reconnect timer
  const startReconnectTimer = () => {
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
  };

  // Handle player leaving
  const handleLeaveRoom = async () => {
    if (!myPlayerId || !currentRoom) return;

    try {
      await supabase
        .from('players')
        .update({ is_connected: false })
        .eq('id', myPlayerId);

      setGameState('menu');
      setCurrentRoom(null);
      setMyPlayerId(null);
      setPlayers([]);
    } catch (err) {
      console.error('Error leaving room:', err);
    }
  };

  // Destroy room (leader only)
  const destroyRoom = async () => {
    if (!currentRoom) return;

    try {
      await supabase
        .from('rooms')
        .delete()
        .eq('id', currentRoom.id);

      setGameState('menu');
      setCurrentRoom(null);
      setMyPlayerId(null);
      setPlayers([]);
    } catch (err) {
      setError('Failed to destroy room: ' + err.message);
    }
  };

  // Kick disconnected player
  const kickPlayer = async (playerId) => {
    try {
      await supabase
        .from('players')
        .delete()
        .eq('id', playerId);

      setDisconnectedPlayer(null);
    } catch (err) {
      setError('Failed to kick player: ' + err.message);
    }
  };

  // Start game
  const startGame = async () => {
    const connectedPlayers = players.filter(p => p.is_connected);
    
    if (connectedPlayers.length < 5 || connectedPlayers.length > 10) {
      setError('Game requires 5-10 players');
      return;
    }

    try {
      // Assign roles
      const distribution = getRoleDistribution(connectedPlayers.length);
      const roles = [
        ...Array(distribution.liberal).fill(ROLES.LIBERAL),
        ...Array(distribution.fascist).fill(ROLES.FASCIST),
        ROLES.HITLER
      ];
      
      // Shuffle roles
      const shuffledRoles = roles.sort(() => Math.random() - 0.5);
      
      // Assign to players
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

      // Create policy deck
      const deck = [
        ...Array(6).fill('liberal'),
        ...Array(11).fill('fascist')
      ].sort(() => Math.random() - 0.5);

      // Update room
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

      setGamePhase(GAME_PHASES.ROLE_REVEAL);
    } catch (err) {
      setError('Failed to start game: ' + err.message);
    }
  };

  // Update local game state from room
  const updateGameState = (state) => {
    if (!state) return;
    
    setGamePhase(state.phase || GAME_PHASES.LOBBY);
    setLiberalPolicies(state.liberalPolicies || 0);
    setFascistPolicies(state.fascistPolicies || 0);
    setPolicyDeck(state.policyDeck || []);
    setElectionTracker(state.electionTracker || 0);
    setExecutedPlayers(state.executedPlayers || []);
    setInvestigatedPlayers(state.investigatedPlayers || []);
    
    if (state.presidentIndex !== undefined) {
      const connectedPlayers = players.filter(p => p.is_connected);
      setPresident(connectedPlayers[state.presidentIndex]);
    }
    
    setChancellor(state.chancellor ? players.find(p => p.id === state.chancellor) : null);
  };

  // Copy room code
  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (currentRoom) {
        handleLeaveRoom();
      }
      supabase.removeAllChannels();
    };
  }, []);
  const connectedPlayers = players.filter(p => p.is_connected);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 via-gray-900 to-black text-white p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 pt-8">
          <h1 className="text-5xl font-bold mb-2 text-red-500">SECRET HITLER</h1>
          <p className="text-gray-400">Online Multiplayer Edition</p>
        </div>

        {/* Menu Screen */}
        {gameState === 'menu' && (
          <div className="max-w-md mx-auto space-y-4">
            <div className="bg-gray-800 rounded-lg p-6 border border-red-900">
              <input
                type="text"
                placeholder="Enter your name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 rounded-lg border border-gray-600 focus:border-red-500 focus:outline-none mb-4"
              />
              
              <button
                onClick={createRoom}
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
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-3 bg-gray-700 rounded-lg border border-gray-600 focus:border-red-500 focus:outline-none mb-3"
              />
              
              <button
                onClick={joinRoom}
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
        )}

        {/* Lobby Screen */}
        {gameState === 'lobby' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-gray-800 rounded-lg p-6 border border-red-900">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Game Lobby</h2>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">Room Code:</span>
                    <code className="text-2xl font-mono text-red-400 font-bold">{roomCode}</code>
                    <button
                      onClick={copyRoomCode}
                      className="p-2 hover:bg-gray-700 rounded transition"
                    >
                      {copied ? <Check size={20} className="text-green-500" /> : <Copy size={20} />}
                    </button>
                  </div>
                </div>
                
                <button
                  onClick={handleLeaveRoom}
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

              {/* Disconnected player warning */}
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
                    onClick={() => kickPlayer(disconnectedPlayer.id)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm"
                  >
                    Kick Player & Continue
                  </button>
                </div>
              )}

              {isLeader && (
                <div className="space-y-3">
                  <button
                    onClick={startGame}
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
                    onClick={destroyRoom}
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
        )}

        {/* Role Reveal Screen */}
        {gameState === 'lobby' && gamePhase === GAME_PHASES.ROLE_REVEAL && myRole && (
          <div className="max-w-2xl mx-auto mt-8">
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
                    myParty === 'liberal'
                      ? 'bg-blue-900 bg-opacity-30 border-blue-500'
                      : 'bg-red-900 bg-opacity-30 border-red-500'
                  }`}>
                    <div className="text-4xl font-bold mb-2">
                      {myRole === ROLES.HITLER ? '🎩 HITLER' : myParty === 'liberal' ? '🗽 LIBERAL' : '⚔️ FASCIST'}
                    </div>
                    <div className="text-xl">
                      Party: {myParty.toUpperCase()}
                    </div>
                  </div>

                  {myRole === ROLES.HITLER && (
                    <div className="text-sm text-gray-400 bg-gray-900 p-4 rounded-lg">
                      <p className="mb-2">You are Hitler! Remember:</p>
                      <ul className="text-left list-disc list-inside space-y-1">
                        <li>Play as Liberal as possible</li>
                        <li>Gain the trust of Liberals</li>
                        <li>Let other Fascists advance the agenda</li>
                        <li>Win by getting elected Chancellor after 3 Fascist policies</li>
                      </ul>
                    </div>
                  )}

                  {myRole === ROLES.FASCIST && (
                    <div className="text-sm text-gray-400 bg-gray-900 p-4 rounded-lg">
                      <p className="mb-2">You are a Fascist! Your teammates:</p>
                      <ul className="text-left space-y-1">
                        {players
                          .filter(p => p.party === 'fascist' && p.id !== myPlayerId)
                          .map(p => (
                            <li key={p.id}>
                              {p.name} {p.role === ROLES.HITLER ? '(Hitler)' : '(Fascist)'}
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}

                  {myRole === ROLES.LIBERAL && (
                    <div className="text-sm text-gray-400 bg-gray-900 p-4 rounded-lg">
                      <p>You are a Liberal! Work with other Liberals to:</p>
                      <ul className="text-left list-disc list-inside space-y-1 mt-2">
                        <li>Enact 5 Liberal policies</li>
                        <li>Or assassinate Hitler</li>
                        <li>Be careful - you don't know who to trust!</li>
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-6 text-gray-400 text-sm">
                Game will start shortly...
              </div>
            </div>
          </div>
        )}

        {/* Game Board - Placeholder for actual gameplay */}
        {currentRoom?.status === 'playing' && gamePhase !== GAME_PHASES.ROLE_REVEAL && (
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-lg p-6 border border-red-900">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-blue-900 bg-opacity-30 p-4 rounded-lg border border-blue-500">
                  <h3 className="text-lg font-semibold mb-2">Liberal Policies</h3>
                  <div className="text-4xl font-bold">{liberalPolicies} / 5</div>
                </div>
                <div className="bg-red-900 bg-opacity-30 p-4 rounded-lg border border-red-500">
                  <h3 className="text-lg font-semibold mb-2">Fascist Policies</h3>
                  <div className="text-4xl font-bold">{fascistPolicies} / 6</div>
                </div>
              </div>

              <div className="text-center text-gray-400">
                <p className="mb-2">Game Phase: {gamePhase.replace('_', ' ').toUpperCase()}</p>
                <p className="text-sm">Full gameplay implementation coming next...</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SecretHitlerGame;