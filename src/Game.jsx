import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { Users, Copy, Check, AlertCircle, Crown, Eye, EyeOff, LogOut, Shield, Skull, Ban, Search } from 'lucide-react';

// Tailwind CSS CDN
if (typeof document !== 'undefined' && !document.getElementById('tailwind-cdn')) {
  const link = document.createElement('link');
  link.id = 'tailwind-cdn';
  link.rel = 'stylesheet';
  link.href = 'https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css';
  document.head.appendChild(link);
}

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase credentials in .env file');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const ROLES = { LIBERAL: 'liberal', FASCIST: 'fascist', HITLER: 'hitler' };
const PHASES = {
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

const getRoleDistribution = (count) => ({
  5: { liberal: 3, fascist: 1, hitler: 1 },
  6: { liberal: 4, fascist: 1, hitler: 1 },
  7: { liberal: 4, fascist: 2, hitler: 1 },
  8: { liberal: 5, fascist: 2, hitler: 1 },
  9: { liberal: 5, fascist: 3, hitler: 1 },
  10: { liberal: 6, fascist: 3, hitler: 1 }
}[count] || { liberal: 3, fascist: 1, hitler: 1 });

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

const SecretHitlerGame = () => {
  const navigate = useNavigate();
  const params = useParams();
  const location = useLocation();
  
  const [playerName, setPlayerName] = useState(localStorage.getItem('playerName') || '');
  const [roomCode, setRoomCode] = useState('');
  const [currentRoom, setCurrentRoom] = useState(null);
  const [players, setPlayers] = useState([]);
  const [myPlayerId, setMyPlayerId] = useState(localStorage.getItem('myPlayerId') || null);
  const [error, setError] = useState('');
  const pollingRef = useRef(null);

  const myPlayer = players.find(p => p.id === myPlayerId);
  const gameState = currentRoom?.game_state || {};
  const phase = gameState.phase || PHASES.LOBBY;

  // Determine current view from URL
  const getCurrentView = () => {
    if (location.pathname === '/') return 'home';
    if (location.pathname.startsWith('/room/')) return 'lobby';
    if (location.pathname.startsWith('/game/')) {
      if (phase === PHASES.ROLE_REVEAL && !localStorage.getItem(`seen_role_${myPlayerId}`)) {
        return 'role_reveal';
      }
      return 'game';
    }
    return 'home';
  };

  const currentView = getCurrentView();

  // Poll room data
  useEffect(() => {
    const code = params.roomCode;
    if (!code) {
      if (pollingRef.current) clearInterval(pollingRef.current);
      return;
    }

    const loadData = async () => {
      try {
        const { data: room } = await supabase
          .from('rooms')
          .select('*')
          .eq('code', code.toUpperCase())
          .single();

        if (room) {
          setCurrentRoom(room);
          
          const { data: playersList } = await supabase
            .from('players')
            .select('*')
            .eq('room_id', room.id)
            .order('created_at', { ascending: true });

          if (playersList) {
            setPlayers(playersList);
          }

          // Auto-navigate based on room status
          if (room.status === 'playing' && location.pathname.startsWith('/room/')) {
            navigate(`/game/${code}`, { replace: true });
          } else if (room.status === 'waiting' && location.pathname.startsWith('/game/')) {
            navigate(`/room/${code}`, { replace: true });
          }
        }
      } catch (err) {
        console.error('Error loading data:', err);
      }
    };

    loadData();
    pollingRef.current = setInterval(loadData, 2000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [params.roomCode, location.pathname, navigate]);

  const generateCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

  const handleCreateRoom = async () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    try {
      const code = generateCode();
      
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .insert({ code, status: 'waiting', game_state: { phase: PHASES.LOBBY } })
        .select()
        .single();

      if (roomError) throw roomError;

      const { data: player, error: playerError } = await supabase
        .from('players')
        .insert({
          room_id: room.id,
          name: playerName,
          is_leader: true,
          is_connected: true
        })
        .select()
        .single();

      if (playerError) throw playerError;

      await supabase.from('rooms').update({ leader_id: player.id }).eq('id', room.id);

      localStorage.setItem('playerName', playerName);
      localStorage.setItem('myPlayerId', player.id);
      setMyPlayerId(player.id);

      navigate(`/room/${code}`);
    } catch (err) {
      setError('Failed to create room: ' + err.message);
    }
  };

  const handleJoinRoom = async (code) => {
    if (!playerName.trim() || !code.trim()) {
      setError('Please enter your name and room code');
      return;
    }

    try {
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('code', code.toUpperCase())
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
        const { data: updated } = await supabase
          .from('players')
          .update({ is_connected: true })
          .eq('id', existingPlayer.id)
          .select()
          .single();
        player = updated;
      } else {
        const { data: newPlayer } = await supabase
          .from('players')
          .insert({
            room_id: room.id,
            name: playerName,
            is_leader: false,
            is_connected: true
          })
          .select()
          .single();
        player = newPlayer;
      }

      localStorage.setItem('playerName', playerName);
      localStorage.setItem('myPlayerId', player.id);
      setMyPlayerId(player.id);

      if (room.status === 'playing') {
        navigate(`/game/${room.code}`);
      } else {
        navigate(`/room/${room.code}`);
      }
    } catch (err) {
      setError('Failed to join: ' + err.message);
    }
  };

  const handleStartGame = async () => {
    const connected = players.filter(p => p.is_connected);
    if (connected.length < 5 || connected.length > 10) {
      setError('Need 5-10 players');
      return;
    }

    try {
      const dist = getRoleDistribution(connected.length);
      const roles = [
        ...Array(dist.liberal).fill(ROLES.LIBERAL),
        ...Array(dist.fascist).fill(ROLES.FASCIST),
        ROLES.HITLER
      ].sort(() => Math.random() - 0.5);

      await Promise.all(connected.map((p, i) => {
        const role = roles[i];
        const party = role === ROLES.LIBERAL ? 'liberal' : 'fascist';
        return supabase.from('players').update({ role, party }).eq('id', p.id);
      }));

      const deck = [
        ...Array(6).fill('liberal'),
        ...Array(11).fill('fascist')
      ].sort(() => Math.random() - 0.5);

      await supabase.from('rooms').update({
        status: 'playing',
        game_state: {
          phase: PHASES.ROLE_REVEAL,
          liberalPolicies: 0,
          fascistPolicies: 0,
          policyDeck: deck,
          discardPile: [],
          electionTracker: 0,
          presidentIndex: 0,
          nominatedChancellor: null,
          lastPresident: null,
          lastChancellor: null,
          executedPlayers: [],
          investigatedPlayers: [],
          votes: {}
        }
      }).eq('id', currentRoom.id);

      navigate(`/game/${currentRoom.code}`);
    } catch (err) {
      setError('Failed to start: ' + err.message);
    }
  };

  const updateGameState = async (newState) => {
    // Reshuffle deck if needed
    if (newState.policyDeck.length < 3 && newState.discardPile.length > 0) {
      newState.policyDeck = [...newState.policyDeck, ...newState.discardPile].sort(() => Math.random() - 0.5);
      newState.discardPile = [];
    }

    await supabase.from('rooms').update({ game_state: newState }).eq('id', currentRoom.id);
  };

  const handleLeave = async () => {
    if (myPlayerId) {
      await supabase.from('players').update({ is_connected: false }).eq('id', myPlayerId);
    }
    localStorage.removeItem('myPlayerId');
    setMyPlayerId(null);
    navigate('/');
  };

  // HOME SCREEN
  if (currentView === 'home') {
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
              onKeyPress={(e) => e.key === 'Enter' && handleCreateRoom()}
            />
            
            <button
              onClick={handleCreateRoom}
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
              onKeyPress={(e) => e.key === 'Enter' && handleJoinRoom(roomCode)}
            />
            
            <button
              onClick={() => handleJoinRoom(roomCode)}
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
  }

  // LOBBY SCREEN
  if (currentView === 'lobby' && currentRoom) {
    const [copied, setCopied] = useState(false);
    const isLeader = myPlayer?.is_leader;
    const connected = players.filter(p => p.is_connected);

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
                  <code className="text-2xl font-mono text-red-400 font-bold">{currentRoom.code}</code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(currentRoom.code);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="p-2 hover:bg-gray-700 rounded transition"
                  >
                    {copied ? <Check size={20} className="text-green-500" /> : <Copy size={20} />}
                  </button>
                </div>
              </div>
              
              <button onClick={handleLeave} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center gap-2">
                <LogOut size={18} />Leave
              </button>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Users size={20} />Players ({connected.length}/10)
              </h3>
              <div className="space-y-2">
                {players.map(p => (
                  <div key={p.id} className={`p-3 rounded-lg flex items-center justify-between ${
                    p.is_connected ? 'bg-gray-700' : 'bg-red-900 bg-opacity-30 border border-red-500'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${p.is_connected ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span className={p.id === myPlayerId ? 'font-bold' : ''}>
                        {p.name}{p.id === myPlayerId && ' (You)'}
                      </span>
                      {p.is_leader && <Crown size={16} className="text-yellow-500" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {isLeader && (
              <button
                onClick={handleStartGame}
                disabled={connected.length < 5 || connected.length > 10}
                className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-semibold transition"
              >
                {connected.length < 5 ? `Need ${5 - connected.length} more players` :
                 connected.length > 10 ? 'Too many players (max 10)' : 'Start Game'}
              </button>
            )}

            {!isLeader && (
              <div className="text-center text-gray-400 py-3">
                Waiting for leader to start...
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ROLE REVEAL SCREEN
  if (currentView === 'role_reveal' && myPlayer?.role) {
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
                <div className={`p-6 rounded-lg border-4 ${myPlayer.party === 'liberal' ? 'bg-blue-900 bg-opacity-30 border-blue-500' : 'bg-red-900 bg-opacity-30 border-red-500'}`}>
                  <div className="text-4xl font-bold mb-2">
                    {myPlayer.role === ROLES.HITLER ? '🎩 HITLER' : myPlayer.party === 'liberal' ? '🗽 LIBERAL' : '⚔️ FASCIST'}
                  </div>
                  <div className="text-xl">Party: {myPlayer.party.toUpperCase()}</div>
                </div>

                {myPlayer.role === ROLES.HITLER && players.length <= 6 && (
                  <div className="text-sm text-gray-400 bg-gray-900 p-4 rounded-lg text-left">
                    <p className="mb-2">Your Fascist teammate:</p>
                    {fascists.map(p => <div key={p.id}>• {p.name}</div>)}
                  </div>
                )}

                {myPlayer.role === ROLES.FASCIST && (
                  <div className="text-sm text-gray-400 bg-gray-900 p-4 rounded-lg text-left">
                    <p className="mb-2">Your team:</p>
                    {hitler && <div>• {hitler.name} (Hitler)</div>}
                    {fascists.map(p => <div key={p.id}>• {p.name}</div>)}
                  </div>
                )}

                <button
                  onClick={() => {
                    localStorage.setItem(`seen_role_${myPlayerId}`, 'true');
                    window.location.reload();
                  }}
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
  }

  // GAME SCREEN
  if (currentView === 'game' && currentRoom && myPlayer) {
    return <GameBoard 
      room={currentRoom} 
      players={players} 
      myPlayer={myPlayer} 
      onUpdateGameState={updateGameState}
      onLeave={handleLeave}
    />;
  }

  return <div className="min-h-screen bg-black flex items-center justify-center text-white">Loading...</div>;
};

// GAME BOARD COMPONENT
const GameBoard = ({ room, players, myPlayer, onUpdateGameState, onLeave }) => {
  const gs = room.game_state;
  const phase = gs.phase;
  const alive = players.filter(p => p.is_connected && !gs.executedPlayers?.includes(p.id));
  const pres = alive[gs.presidentIndex];
  const chanc = gs.nominatedChancellor ? players.find(p => p.id === gs.nominatedChancellor) : null;
  const isPres = pres?.id === myPlayer.id;
  const isChanc = chanc?.id === myPlayer.id;
  const [investigating, setInvestigating] = useState(null);

  // Game Over
  if (phase === PHASES.GAME_OVER) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 via-gray-900 to-black text-white flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-gray-800 rounded-lg p-8 border-4 border-yellow-500">
          <h1 className="text-4xl font-bold text-center mb-6">
            {gs.winner === 'liberal' ? '🗽 LIBERALS WIN!' : '⚔️ FASCISTS WIN!'}
          </h1>
          <p className="text-xl text-center mb-8">{gs.winCondition}</p>
          
          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-3">Players:</h3>
            {players.map(p => (
              <div key={p.id} className={`p-3 rounded-lg mb-2 ${p.party === 'liberal' ? 'bg-blue-900 bg-opacity-30' : 'bg-red-900 bg-opacity-30'}`}>
                {p.name} - {p.role === ROLES.HITLER ? 'Hitler' : p.party}
              </div>
            ))}
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
            <h3 className="text-xl font-semibold mb-3">Liberal Policies</h3>
            <div className="flex gap-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className={`w-12 h-16 rounded border-2 ${i < gs.liberalPolicies ? 'bg-blue-600 border-blue-400' : 'bg-gray-700 border-gray-600'}`} />
              ))}
            </div>
          </div>

          <div className="bg-red-900 bg-opacity-30 p-6 rounded-lg border-2 border-red-500">
            <h3 className="text-xl font-semibold mb-3">Fascist Policies</h3>
            <div className="flex gap-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className={`w-12 h-16 rounded border-2 ${i < gs.fascistPolicies ? 'bg-red-600 border-red-400' : 'bg-gray-700 border-gray-600'}`} />
              ))}
            </div>
          </div>
        </div>

        {/* Game Info */}
        <div className="bg-gray-800 rounded-lg p-6 border border-red-900 mb-6">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <span className="text-gray-400">Your Role:</span>
              <div className={`font-bold text-lg ${myPlayer.party === 'liberal' ? 'text-blue-400' : 'text-red-400'}`}>
                {myPlayer.role === ROLES.HITLER ? 'Hitler' : myPlayer.party}
              </div>
            </div>
            <div>
              <span className="text-gray-400">Phase:</span>
              <div className="font-bold text-lg text-yellow-400">{phase.replace(/_/g, ' ').toUpperCase()}</div>
            </div>
            <div>
              <span className="text-gray-400">President:</span>
              <div className="font-bold text-lg">
                {pres?.name}{isPres && ' (You)'}
              </div>
            </div>
          </div>
        </div>

        {/* NOMINATION */}
        {phase === PHASES.NOMINATION && isPres && (
          <div className="bg-gray-800 rounded-lg p-6 border-2 border-yellow-500 mb-6">
            <h3 className="text-xl font-semibold mb-4">Nominate a Chancellor</h3>
            <div className="grid grid-cols-3 gap-3">
              {alive.filter(p => 
                p.id !== pres.id && 
                p.id !== gs.lastChancellor && 
                (alive.length > 5 || p.id !== gs.lastPresident)
              ).map(p => (
                <button
                  key={p.id}
                  onClick={async () => {
                    await onUpdateGameState({
                      ...gs,
                      nominatedChancellor: p.id,
                      phase: PHASES.VOTING,
                      votes: {}
                    });
                  }}
                  className="p-3 bg-blue-600 hover:bg-blue-700 rounded-lg"
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {phase === PHASES.NOMINATION && !isPres && (
          <div className="bg-gray-800 rounded-lg p-6 border border-red-900 mb-6 text-center">
            <p className="text-gray-400">Waiting for {pres?.name} to nominate a Chancellor...</p>
          </div>
        )}

        {/* VOTING */}
        {phase === PHASES.VOTING && (
          <div className="bg-gray-800 rounded-lg p-6 border-2 border-yellow-500 mb-6">
            <h3 className="text-xl font-semibold mb-4">
              Vote: {pres?.name} and {chanc?.name}
            </h3>
            
            {gs.votes[myPlayer.id] === undefined ? (
              <div className="flex gap-4 justify-center">
                <button
                  onClick={async () => {
                    const newVotes = { ...gs.votes, [myPlayer.id]: 'ja' };
                    await onUpdateGameState({ ...gs, votes: newVotes });
                    
                    if (Object.keys(newVotes).length === alive.length) {
                      setTimeout(async () => {
                        const ja = Object.values(newVotes).filter(v => v === 'ja').length;
                        
                        if (ja > alive.length / 2) {
                          // Check Hitler win
                          if (gs.fascistPolicies >= 3 && chanc.role === ROLES.HITLER) {
                            await onUpdateGameState({
                              ...gs,
                              phase: PHASES.GAME_OVER,
                              winner: 'fascist',
                              winCondition: 'Hitler elected Chancellor'
                            });
                            return;
                          }
                          
                          await onUpdateGameState({
                            ...gs,
                            phase: PHASES.LEGISLATIVE_PRESIDENT,
                            electionTracker: 0,
                            lastPresident: pres.id,
                            lastChancellor: chanc.id,
                            presidentHand: gs.policyDeck.slice(0, 3),
                            policyDeck: gs.policyDeck.slice(3)
                          });
                        } else {
                          const newTracker = gs.electionTracker + 1;
                          
                          if (newTracker >= 3) {
                            const topPolicy = gs.policyDeck[0];
                            const newLib = gs.liberalPolicies + (topPolicy === 'liberal' ? 1 : 0);
                            const newFas = gs.fascistPolicies + (topPolicy === 'fascist' ? 1 : 0);
                            
                            const newState = {
                              ...gs,
                              liberalPolicies: newLib,
                              fascistPolicies: newFas,
                              policyDeck: gs.policyDeck.slice(1),
                              electionTracker: 0,
                              phase: PHASES.NOMINATION,
                              presidentIndex: (gs.presidentIndex + 1) % alive.length,
                              nominatedChancellor: null,
                              votes: {},
                              lastPresident: null,
                              lastChancellor: null
                            };
                            
                            if (newLib >= 5) {
                              newState.phase = PHASES.GAME_OVER;
                              newState.winner = 'liberal';
                              newState.winCondition = '5 Liberal policies';
                            } else if (newFas >= 6) {
                              newState.phase = PHASES.GAME_OVER;
                              newState.winner = 'fascist';
                              newState.winCondition = '6 Fascist policies';
                            }
                            
                            await onUpdateGameState(newState);
                          } else {
                            await onUpdateGameState({
                              ...gs,
                              electionTracker: newTracker,
                              phase: PHASES.NOMINATION,
                              presidentIndex: (gs.presidentIndex + 1) % alive.length,
                              nominatedChancellor: null,
                              votes: {}
                            });
                          }
                        }
                      }, 3000);
                    }
                  }}
                  className="px-8 py-4 bg-green-600 hover:bg-green-700 rounded-lg text-xl font-bold"
                >
                  JA!
                </button>
                <button
                  onClick={async () => {
                    const newVotes = { ...gs.votes, [myPlayer.id]: 'nein' };
                    await onUpdateGameState({ ...gs, votes: newVotes });
                    
                    if (Object.keys(newVotes).length === alive.length) {
                      setTimeout(async () => {
                        const ja = Object.values(newVotes).filter(v => v === 'ja').length;
                        
                        if (ja > alive.length / 2) {
                          if (gs.fascistPolicies >= 3 && chanc.role === ROLES.HITLER) {
                            await onUpdateGameState({
                              ...gs,
                              phase: PHASES.GAME_OVER,
                              winner: 'fascist',
                              winCondition: 'Hitler elected Chancellor'
                            });
                            return;
                          }
                          
                          await onUpdateGameState({
                            ...gs,
                            phase: PHASES.LEGISLATIVE_PRESIDENT,
                            electionTracker: 0,
                            lastPresident: pres.id,
                            lastChancellor: chanc.id,
                            presidentHand: gs.policyDeck.slice(0, 3),
                            policyDeck: gs.policyDeck.slice(3)
                          });
                        } else {
                          const newTracker = gs.electionTracker + 1;
                          
                          if (newTracker >= 3) {
                            const topPolicy = gs.policyDeck[0];
                            const newLib = gs.liberalPolicies + (topPolicy === 'liberal' ? 1 : 0);
                            const newFas = gs.fascistPolicies + (topPolicy === 'fascist' ? 1 : 0);
                            
                            const newState = {
                              ...gs,
                              liberalPolicies: newLib,
                              fascistPolicies: newFas,
                              policyDeck: gs.policyDeck.slice(1),
                              electionTracker: 0,
                              phase: PHASES.NOMINATION,
                              presidentIndex: (gs.presidentIndex + 1) % alive.length,
                              nominatedChancellor: null,
                              votes: {},
                              lastPresident: null,
                              lastChancellor: null
                            };
                            
                            if (newLib >= 5) {
                              newState.phase = PHASES.GAME_OVER;
                              newState.winner = 'liberal';
                              newState.winCondition = '5 Liberal policies';
                            } else if (newFas >= 6) {
                              newState.phase = PHASES.GAME_OVER;
                              newState.winner = 'fascist';
                              newState.winCondition = '6 Fascist policies';
                            }
                            
                            await onUpdateGameState(newState);
                          } else {
                            await onUpdateGameState({
                              ...gs,
                              electionTracker: newTracker,
                              phase: PHASES.NOMINATION,
                              presidentIndex: (gs.presidentIndex + 1) % alive.length,
                              nominatedChancellor: null,
                              votes: {}
                            });
                          }
                        }
                      }, 3000);
                    }
                  }}
                  className="px-8 py-4 bg-red-600 hover:bg-red-700 rounded-lg text-xl font-bold"
                >
                  NEIN!
                </button>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-lg mb-4">You voted: <span className="font-bold">{gs.votes[myPlayer.id].toUpperCase()}</span></p>
                <p className="text-gray-400">Waiting... ({Object.keys(gs.votes).length}/{alive.length})</p>
              </div>
            )}

            {Object.keys(gs.votes).length === alive.length && (
              <div className="mt-6 pt-6 border-t border-gray-700">
                <h4 className="text-lg font-semibold mb-3">Results:</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-900 bg-opacity-30 p-4 rounded-lg">
                    <div className="text-2xl font-bold">JA: {Object.values(gs.votes).filter(v => v === 'ja').length}</div>
                  </div>
                  <div className="bg-red-900 bg-opacity-30 p-4 rounded-lg">
                    <div className="text-2xl font-bold">NEIN: {Object.values(gs.votes).filter(v => v === 'nein').length}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* LEGISLATIVE PRESIDENT */}
        {phase === PHASES.LEGISLATIVE_PRESIDENT && (
          <div className="bg-gray-800 rounded-lg p-6 border-2 border-yellow-500 mb-6">
            {isPres ? (
              <>
                <h3 className="text-xl font-semibold mb-4">Discard one policy</h3>
                <div className="flex gap-4 justify-center">
                  {gs.presidentHand.map((policy, i) => (
                    <button
                      key={i}
                      onClick={async () => {
                        const remaining = gs.presidentHand.filter((_, idx) => idx !== i);
                        await onUpdateGameState({
                          ...gs,
                          phase: PHASES.LEGISLATIVE_CHANCELLOR,
                          chancellorHand: remaining,
                          discardPile: [...gs.discardPile, policy]
                        });
                      }}
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
                <p>President {pres?.name} is reviewing policies...</p>
              </div>
            )}
          </div>
        )}

        {/* LEGISLATIVE CHANCELLOR */}
        {phase === PHASES.LEGISLATIVE_CHANCELLOR && (
          <div className="bg-gray-800 rounded-lg p-6 border-2 border-yellow-500 mb-6">
            {isChanc ? (
              <>
                <h3 className="text-xl font-semibold mb-4">Enact one policy</h3>
                <div className="flex gap-4 justify-center">
                  {gs.chancellorHand.map((policy, i) => (
                    <button
                      key={i}
                      onClick={async () => {
                        const discarded = gs.chancellorHand.filter((_, idx) => idx !== i);
                        const newLib = gs.liberalPolicies + (policy === 'liberal' ? 1 : 0);
                        const newFas = gs.fascistPolicies + (policy === 'fascist' ? 1 : 0);
                        
                        const action = policy === 'fascist' ? getExecutiveAction(alive.length, newFas) : null;
                        
                        const newState = {
                          ...gs,
                          liberalPolicies: newLib,
                          fascistPolicies: newFas,
                          discardPile: [...gs.discardPile, ...discarded],
                          phase: action ? PHASES.EXECUTIVE : PHASES.NOMINATION,
                          executiveAction: action,
                          presidentIndex: action ? gs.presidentIndex : (gs.presidentIndex + 1) % alive.length,
                          nominatedChancellor: null,
                          votes: {}
                        };
                        
                        if (newLib >= 5) {
                          newState.phase = PHASES.GAME_OVER;
                          newState.winner = 'liberal';
                          newState.winCondition = '5 Liberal policies';
                        } else if (newFas >= 6) {
                          newState.phase = PHASES.GAME_OVER;
                          newState.winner = 'fascist';
                          newState.winCondition = '6 Fascist policies';
                        }
                        
                        await onUpdateGameState(newState);
                      }}
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
                <p>Chancellor {chanc?.name} is enacting a policy...</p>
              </div>
            )}
          </div>
        )}

        {/* EXECUTIVE ACTION */}
        {phase === PHASES.EXECUTIVE && (
          <div className="bg-gray-800 rounded-lg p-6 border-2 border-purple-500 mb-6">
            {isPres ? (
              <>
                <h3 className="text-xl font-semibold mb-4">
                  Executive Action: {gs.executiveAction?.replace(/_/g, ' ').toUpperCase()}
                </h3>
                
                {gs.executiveAction === EXECUTIVE_ACTIONS.EXECUTION && (
                  <>
                    <p className="text-gray-400 mb-4">Execute a player:</p>
                    <div className="grid grid-cols-3 gap-3">
                      {alive.filter(p => p.id !== pres.id).map(p => (
                        <button
                          key={p.id}
                          onClick={async () => {
                            const isHitler = p.role === ROLES.HITLER;
                            
                            const newState = {
                              ...gs,
                              executedPlayers: [...gs.executedPlayers, p.id],
                              phase: isHitler ? PHASES.GAME_OVER : PHASES.NOMINATION,
                              presidentIndex: (gs.presidentIndex + 1) % alive.length,
                              nominatedChancellor: null
                            };
                            
                            if (isHitler) {
                              newState.winner = 'liberal';
                              newState.winCondition = 'Hitler assassinated';
                            }
                            
                            await onUpdateGameState(newState);
                          }}
                          className="p-3 bg-red-600 hover:bg-red-700 rounded-lg flex items-center gap-2 justify-center"
                        >
                          <Ban size={20} />{p.name}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {gs.executiveAction === EXECUTIVE_ACTIONS.INVESTIGATE && (
                  <>
                    <p className="text-gray-400 mb-4">Investigate a player:</p>
                    <div className="grid grid-cols-3 gap-3">
                      {alive.filter(p => p.id !== pres.id && !gs.investigatedPlayers.includes(p.id)).map(p => (
                        <button
                          key={p.id}
                          onClick={() => setInvestigating(p)}
                          className="p-3 bg-purple-600 hover:bg-purple-700 rounded-lg flex items-center gap-2 justify-center"
                        >
                          <Search size={20} />{p.name}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {gs.executiveAction === EXECUTIVE_ACTIONS.POLICY_PEEK && (
                  <div className="text-center">
                    <p className="mb-4">Next 3 policies:</p>
                    <div className="flex gap-4 justify-center mb-4">
                      {gs.policyDeck.slice(0, 3).map((policy, i) => (
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
                        await onUpdateGameState({
                          ...gs,
                          phase: PHASES.NOMINATION,
                          presidentIndex: (gs.presidentIndex + 1) % alive.length,
                          nominatedChancellor: null
                        });
                      }}
                      className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg"
                    >
                      Continue
                    </button>
                  </div>
                )}

                {gs.executiveAction === EXECUTIVE_ACTIONS.SPECIAL_ELECTION && (
                  <>
                    <p className="text-gray-400 mb-4">Choose next President:</p>
                    <div className="grid grid-cols-3 gap-3">
                      {alive.filter(p => p.id !== pres.id).map(p => (
                        <button
                          key={p.id}
                          onClick={async () => {
                            const specialIndex = alive.findIndex(pl => pl.id === p.id);
                            await onUpdateGameState({
                              ...gs,
                              phase: PHASES.NOMINATION,
                              presidentIndex: specialIndex,
                              nominatedChancellor: null
                            });
                          }}
                          className="p-3 bg-yellow-600 hover:bg-yellow-700 rounded-lg"
                        >
                          {p.name}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="text-center text-gray-400">
                <p>President {pres?.name} is using their power...</p>
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
                onClick={async () => {
                  setInvestigating(null);
                  await onUpdateGameState({
                    ...gs,
                    investigatedPlayers: [...gs.investigatedPlayers, investigating.id],
                    phase: PHASES.NOMINATION,
                    presidentIndex: (gs.presidentIndex + 1) % alive.length,
                    nominatedChancellor: null
                  });
                }}
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
          <div className="grid grid-cols-3 gap-3">
            {alive.map(p => (
              <div
                key={p.id}
                className={`p-3 rounded-lg border-2 ${
                  p.id === pres?.id ? 'bg-yellow-900 bg-opacity-30 border-yellow-500' :
                  p.id === chanc?.id ? 'bg-purple-900 bg-opacity-30 border-purple-500' :
                  'bg-gray-700 border-gray-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  {p.id === pres?.id && <Crown size={16} className="text-yellow-500" />}
                  <span className={p.id === myPlayer.id ? 'font-bold' : ''}>
                    {p.name}{p.id === myPlayer.id && ' (You)'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {gs.executedPlayers?.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-700">
              <h4 className="text-sm font-semibold mb-2 text-gray-400">Executed:</h4>
              <div className="flex gap-2">
                {gs.executedPlayers.map(id => {
                  const p = players.find(pl => pl.id === id);
                  return p ? <span key={id} className="text-sm text-red-400">{p.name}</span> : null;
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SecretHitlerGame;