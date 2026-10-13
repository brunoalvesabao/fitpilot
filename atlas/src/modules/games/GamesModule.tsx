import { useCallback } from 'react';
import type { SetStateAction } from 'react';
import type { GameTrophyEntry, PokemonGeneration, ScreenId, ToPlayConsole } from '../../types';
import { useStore } from '../../lib/store';
import { useNav } from '../../navigation';
import GamesScreen from './GamesScreen';

type Submenu = 'TROPHIES' | 'POKÉMON' | 'TO PLAY';
const TO_SUBMENU: Record<string, Submenu> = { 'games-trophies': 'TROPHIES', 'games-pokemon': 'POKÉMON', 'games-toplay': 'TO PLAY' };
const TO_SCREEN: Record<Submenu, ScreenId> = { TROPHIES: 'games-trophies', 'POKÉMON': 'games-pokemon', 'TO PLAY': 'games-toplay' };

const apply = <T,>(v: SetStateAction<T>, prev: T): T => (typeof v === 'function' ? (v as (p: T) => T)(prev) : v);

/** Liga a tela de Games (portada do Nocturne) ao armazenamento do Atlas. */
export default function GamesModule({ screen }: { screen: ScreenId }) {
  const { data, setGames, toast } = useStore();
  const { navigate } = useNav();
  const g = data.games;

  const setTrophyEntries = useCallback((v: SetStateAction<GameTrophyEntry[]>) => setGames((p) => ({ ...p, trophyEntries: apply(v, p.trophyEntries) })), [setGames]);
  const setToPlayConsoles = useCallback((v: SetStateAction<ToPlayConsole[]>) => setGames((p) => ({ ...p, toPlayConsoles: apply(v, p.toPlayConsoles) })), [setGames]);
  const setPokemonGenerations = useCallback(
    (v: SetStateAction<PokemonGeneration[]>) => setGames((p) => ({ ...p, pokemonGenerations: apply(v, p.pokemonGenerations) })),
    [setGames],
  );

  return (
    <GamesScreen
      trophyEntries={g.trophyEntries}
      setTrophyEntries={setTrophyEntries}
      toPlayConsoles={g.toPlayConsoles}
      setToPlayConsoles={setToPlayConsoles}
      pokemonGenerations={g.pokemonGenerations}
      setPokemonGenerations={setPokemonGenerations}
      triggerToast={toast}
      activeSubmenu={TO_SUBMENU[screen] || 'TROPHIES'}
      setActiveSubmenu={(s: Submenu) => navigate(TO_SCREEN[s])}
    />
  );
}
