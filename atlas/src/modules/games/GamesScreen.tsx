import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Search, 
  Calendar, 
  Trophy, 
  Gamepad2, 
  Eye, 
  EyeOff, 
  Check, 
  X, 
  ChevronRight,
  ChevronUp,
  TrendingUp,
  AlertCircle,
  HelpCircle,
  List,
  Grid,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Upload,
  Filter,
  Sparkles
} from 'lucide-react';
import { GameTrophyEntry, ToPlayConsole, PokemonGeneration, PokemonEntry } from '../../types';
import TrophiesDashboard from './TrophiesDashboard';

interface GamesScreenProps {
  trophyEntries: GameTrophyEntry[];
  setTrophyEntries: React.Dispatch<React.SetStateAction<GameTrophyEntry[]>>;
  toPlayConsoles: ToPlayConsole[];
  setToPlayConsoles: React.Dispatch<React.SetStateAction<ToPlayConsole[]>>;
  pokemonGenerations: PokemonGeneration[];
  setPokemonGenerations: React.Dispatch<React.SetStateAction<PokemonGeneration[]>>;
  triggerToast: (msg: string) => void;
  activeSubmenu: GameSubmenu;
  setActiveSubmenu: (tab: GameSubmenu) => void;
}

type GameSubmenu = 'TROPHIES' | 'POKÉMON' | 'TO PLAY';

// Utility: parse dd/mm/aa format into Date object safely
function parseDDMMAA(str: string): Date | null {
  const parts = str.split('/');
  if (parts.length !== 3) return null;
  
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // 0-indexed
  let year = parseInt(parts[2], 10);
  
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  
  if (year < 100) {
    year += 2000; // Assume 20xx for yy format
  }
  
  return new Date(year, month, day);
}

// Helper to format Date string YYYY-MM-DD back to dd/mm/aa string
function formatYYYYMMDDToDDMMAA(str?: string): string {
  if (!str) return '';
  try {
    const [year, month, day] = str.split('-');
    const shortYear = year.slice(-2);
    return `${day}/${month}/${shortYear}`;
  } catch (_) {
    return str || '';
  }
}

// Auto mask for dd/mm/aa date inputs
const handleDateMask = (val: string, setter: (v: string) => void) => {
  let clean = val.replace(/[^\d]/g, '');
  if (clean.length <= 2) {
    setter(clean);
  } else if (clean.length <= 4) {
    setter(clean.slice(0, 2) + '/' + clean.slice(2));
  } else {
    setter(clean.slice(0, 2) + '/' + clean.slice(2, 4) + '/' + clean.slice(4, 6));
  }
};

const POKEMON_TYPES = [
  'Normal', 'Grass', 'Fire', 'Water', 'Electric', 'Ground', 'Rock', 'Flying', 'Bug',
  'Poison', 'Fighting', 'Psychic', 'Ghost', 'Dark', 'Dragon', 'Ice', 'Steel', 'Fairy'
];

const validateAndStandardiseType = (typeStr: string): string | null => {
  if (!typeStr.trim()) return null;
  const normalized = typeStr.trim().toLowerCase();
  const found = POKEMON_TYPES.find(t => t.toLowerCase() === normalized);
  return found || null;
};

const SPRITE_BASE = 'https://raw.githubusercontent.com/armindoneto/nocturne/main/pokedex';
const POKEAPI_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';

function getPokemonSpriteUrl(pokemon: PokemonEntry, isShiny: boolean = false): string | null {
  if (!pokemon) return null;
  const prefix = isShiny ? 'shiny' : '';
  if (pokemon.spriteId) return `${SPRITE_BASE}/${prefix}${pokemon.spriteId}.png`;
  const id = pokemon.id;
  if (!id || id.startsWith('pokemon-custom-')) {
    const n = parseInt(pokemon.num, 10);
    return Number.isFinite(n) && n > 0 ? `${POKEAPI_BASE}/${isShiny ? 'shiny/' : ''}${n}.png` : null;
  }
  // Os sprites do Nocturne usam o id com zeros à esquerda (ex.: 001, 019alo, shiny025)
  return `${SPRITE_BASE}/${prefix}${id}.png`;
}

/** Se o sprite não carregar, tenta o PokeAPI (forma base) antes de mostrar o ícone vazio. */
function handleSpriteError(img: HTMLImageElement, pokemon: PokemonEntry, isShiny: boolean) {
  const n = parseInt(pokemon.num, 10);
  if (!img.getAttribute('data-tried-fallback') && Number.isFinite(n) && n > 0) {
    img.setAttribute('data-tried-fallback', 'true');
    img.src = `${POKEAPI_BASE}/${isShiny ? 'shiny/' : ''}${n}.png`;
    return;
  }
  img.style.display = 'none';
  const fallback = img.parentElement?.querySelector('.fallback-icon');
  if (fallback) fallback.classList.remove('hidden');
}

// Points required for a specific level L based on user points table
function getPointsRequiredForLevel(L: number): number {
  if (L <= 1) return 0;
  if (L <= 100) {
    return (L - 1) * 60;
  }
  if (L <= 200) {
    return 5940 + (L - 100) * 90;
  }
  if (L <= 300) {
    return 14940 + (L - 200) * 450;
  }
  if (L <= 400) {
    return 59940 + (L - 300) * 900;
  }
  if (L <= 500) {
    return 149940 + (L - 400) * 1350;
  }
  if (L <= 600) {
    return 284940 + (L - 500) * 1800;
  }
  if (L <= 700) {
    return 464940 + (L - 600) * 2250;
  }
  if (L <= 800) {
    return 689940 + (L - 700) * 2700;
  }
  if (L <= 900) {
    return 959940 + (L - 800) * 3150;
  }
  if (L <= 1000) {
    return 1274940 + (L - 900) * 3600;
  }
  // Beyond 1000
  return 1634940 + (L - 1000) * 3600;
}

// Get Level corresponding to the total points
function getLevelForPoints(points: number): number {
  if (points <= 0) return 1;
  let low = 1;
  let high = 2000;
  
  while (getPointsRequiredForLevel(high) <= points) {
    high *= 2;
  }
  
  let ans = 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (getPointsRequiredForLevel(mid) <= points) {
      ans = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return ans;
}

// Get Rank Info based on Level
function getRankInfo(level: number) {
  if (level < 100) return { name: 'Starter I', img: '/games/starter1.png' };
  if (level < 200) return { name: 'Starter II', img: '/games/starter2.png' };
  if (level < 300) return { name: 'Starter III', img: '/games/starter3.png' };
  if (level < 400) return { name: 'Skilled I', img: '/games/skilled1.png' };
  if (level < 500) return { name: 'Skilled II', img: '/games/skilled2.png' };
  if (level < 600) return { name: 'Skilled III', img: '/games/skilled3.png' };
  if (level < 700) return { name: 'Elite I', img: '/games/elite1.png' };
  if (level < 800) return { name: 'Elite II', img: '/games/elite2.png' };
  if (level < 1000) return { name: 'Elite III', img: '/games/elite3.png' };
  return { name: 'Master', img: '/games/master.png' };
}

export default function GamesScreen({
  trophyEntries,
  setTrophyEntries,
  toPlayConsoles = [],
  setToPlayConsoles,
  pokemonGenerations = [],
  setPokemonGenerations,
  triggerToast,
  activeSubmenu,
  setActiveSubmenu
}: GamesScreenProps) {
  
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('ALL');
  const [showGarapaFilter, setShowGarapaFilter] = useState<'ALL' | 'GARAPA' | 'NOT_GARAPA' | 'PLATINUM'>('ALL');
  const [showHidden, setShowHidden] = useState(false);
  const [sortBy, setSortBy] = useState<'title_asc' | 'custom'>('custom');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [showDashboard, setShowDashboard] = useState(false);

  // Delete confirmation State
  const [gameToDelete, setGameToDelete] = useState<{ id: string; name: string } | null>(null);

  // Reorder custom list State
  const [reorderTargetGame, setReorderTargetGame] = useState<GameTrophyEntry | null>(null);
  const [reorderSearchQuery, setReorderSearchQuery] = useState('');
  const [isReorderModalOpen, setIsReorderModalOpen] = useState(false);

  const handleReorderGame = (targetId: string, position: 'before' | 'after' | 'start' | 'end', referenceId?: string) => {
    setTrophyEntries(prev => {
      const list = [...prev];
      const sourceIndex = list.findIndex(item => item.id === targetId);
      if (sourceIndex === -1) return prev;
      
      const sourceItem = list[sourceIndex];
      // Remove from old position
      list.splice(sourceIndex, 1);
      
      if (position === 'start') {
        list.unshift(sourceItem);
      } else if (position === 'end') {
        list.push(sourceItem);
      } else {
        const refIndex = list.findIndex(item => item.id === referenceId);
        if (refIndex === -1) {
          // If reference not found, return original list
          return prev;
        }
        if (position === 'before') {
          list.splice(refIndex, 0, sourceItem);
        } else if (position === 'after') {
          list.splice(refIndex + 1, 0, sourceItem);
        }
      }
      return list;
    });
    
    // Auto switch sorting to custom so they can see it instantly
    if (sortBy !== 'custom') {
      setSortBy('custom');
      triggerToast('Ordem personalizada atualizada e selecionada!');
    } else {
      triggerToast('Ordem do jogo atualizada com sucesso!');
    }
    
    // Close modal
    setIsReorderModalOpen(false);
    setReorderTargetGame(null);
    setReorderSearchQuery('');
  };

  const otherGames = useMemo(() => {
    if (!reorderTargetGame) return [];
    const list = trophyEntries.filter(item => item.id !== reorderTargetGame.id);
    if (!reorderSearchQuery.trim()) {
      return list;
    }
    const cleanQuery = reorderSearchQuery.toLowerCase().trim();
    return list.filter(item => (item.jogo || '').toLowerCase().includes(cleanQuery));
  }, [trophyEntries, reorderTargetGame, reorderSearchQuery]);

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<GameTrophyEntry | null>(null);
  
  // Form Fields
  const [formJogo, setFormJogo] = useState('');
  const [formPlatina, setFormPlatina] = useState<number | ''>('');
  const [formOuro, setFormOuro] = useState<number | ''>('');
  const [formPrata, setFormPrata] = useState<number | ''>('');
  const [formBronze, setFormBronze] = useState<number | ''>('');
  const [formPlatforms, setFormPlatforms] = useState<('PS3' | 'PSVita' | 'PS4' | 'PS5')[]>([]);
  const [formGarapa, setFormGarapa] = useState(false);
  const [formHide, setFormHide] = useState(false);
  const [formDataPlatina, setFormDataPlatina] = useState('');

  // --- TO PLAY STATES ---
  const [newConsoleName, setNewConsoleName] = useState('');
  const [newGameNames, setNewGameNames] = useState<Record<string, string>>({});
  const [checkingGames, setCheckingGames] = useState<Record<string, boolean>>({});

  const handleAddConsole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newConsoleName.trim()) return;
    const exists = toPlayConsoles.some(c => c.name.toLowerCase() === newConsoleName.trim().toLowerCase());
    if (exists) {
      triggerToast('Este console já foi adicionado!');
      return;
    }
    const updated = [...toPlayConsoles, {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
      name: newConsoleName.trim(),
      games: []
    }];
    setToPlayConsoles(updated);
    setNewConsoleName('');
    triggerToast('Console adicionado com sucesso!');
  };

  const handleDeleteConsole = (consoleId: string) => {
    const updated = toPlayConsoles.filter(c => c.id !== consoleId);
    setToPlayConsoles(updated);
    triggerToast('Console removido.');
  };

  const handleAddGame = (consoleId: string) => {
    const gameName = newGameNames[consoleId] || '';
    if (!gameName.trim()) return;

    const updated = toPlayConsoles.map(c => {
      if (c.id === consoleId) {
        const gameExists = c.games.some(g => g.name.toLowerCase() === gameName.trim().toLowerCase());
        if (gameExists) {
          triggerToast('Este jogo já está na lista!');
          return c;
        }
        return {
          ...c,
          games: [...c.games, {
            id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
            name: gameName.trim()
          }]
        };
      }
      return c;
    });

    setToPlayConsoles(updated);
    setNewGameNames(prev => ({ ...prev, [consoleId]: '' }));
    triggerToast('Jogo adicionado à lista!');
  };

  const handleMarkAsPlayed = (consoleId: string, gameId: string) => {
    if (checkingGames[gameId]) return; // prevent double clicks
    setCheckingGames(prev => ({ ...prev, [gameId]: true }));
    setTimeout(() => {
      const updated = toPlayConsoles.map(c => {
        if (c.id === consoleId) {
          return {
            ...c,
            games: c.games.filter(g => g.id !== gameId)
          };
        }
        return c;
      });
      setToPlayConsoles(updated);
      setCheckingGames(prev => {
        const copy = { ...prev };
        delete copy[gameId];
        return copy;
      });
      triggerToast('Jogo jogado e removido da lista!');
    }, 400);
  };

  // --- POKEMON STATES & HANDLERS ---
  const [pokedexViewMode, setPokedexViewMode] = useState<'normal' | 'shiny'>('normal');
  const [expandedGens, setExpandedGens] = useState<string[]>(['gen1']);
  const [pokemonSearchQuery, setPokemonSearchQuery] = useState('');
  const [selectedFilterTypes, setSelectedFilterTypes] = useState<string[]>([]);
  const [selectedFilterLegendary, setSelectedFilterLegendary] = useState(false);
  const [selectedFilterMythical, setSelectedFilterMythical] = useState(false);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [newPokemonNum, setNewPokemonNum] = useState('');
  const [newPokemonName, setNewPokemonName] = useState('');
  const [newPokemonSpriteId, setNewPokemonSpriteId] = useState('');
  const [newPokemonHasMale, setNewPokemonHasMale] = useState(true);
  const [newPokemonHasFemale, setNewPokemonHasFemale] = useState(true);
  const [newPokemonHasGenderless, setNewPokemonHasGenderless] = useState(false);
  const [newPokemonType1, setNewPokemonType1] = useState('Normal');
  const [newPokemonType2, setNewPokemonType2] = useState('');
  const [newPokemonIsLegendary, setNewPokemonIsLegendary] = useState(false);
  const [newPokemonIsMythical, setNewPokemonIsMythical] = useState(false);
  const [newPokemonIsExtraForm, setNewPokemonIsExtraForm] = useState(false);
  
  const [filterNotCaught, setFilterNotCaught] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const wasPokemonSearchingRef = React.useRef(false);

  // Auto-expand generations that have matching results when searching or filtering
  React.useEffect(() => {
    const query = pokemonSearchQuery.toLowerCase().trim();
    const hasActiveFilters = selectedFilterTypes.length > 0 || selectedFilterLegendary || selectedFilterMythical || filterNotCaught;
    const hasValidQuery = query.length >= 3;

    if (hasValidQuery || hasActiveFilters) {
      wasPokemonSearchingRef.current = true;
      const matchingGenIds = pokemonGenerations.filter(gen => {
        return gen.pokemons.some(p => {
          if (pokedexViewMode === 'shiny' && (p.isExtraForm || p.isShinyExcluded)) return false;

          if (query) {
            const matchesSearch = p.name.toLowerCase().includes(query) || p.num.includes(query);
            if (!matchesSearch) return false;
          }
          if (selectedFilterTypes.length > 0) {
            const hasType1 = p.type1 && selectedFilterTypes.includes(p.type1);
            const hasType2 = p.type2 && selectedFilterTypes.includes(p.type2);
            if (!hasType1 && !hasType2) return false;
          }
          if (selectedFilterLegendary && !p.isLegendary) return false;
          if (selectedFilterMythical && !p.isMythical) return false;
          if (filterNotCaught) {
            if (pokedexViewMode === 'shiny') {
              if (p.isShinyCaught) return false;
            } else {
              const isFullyCaught = p.isExtraForm || (
                (!p.hasMale || p.isMaleCaught) &&
                (!p.hasFemale || p.isFemaleCaught) &&
                (!p.hasGenderless || p.isGenderlessCaught)
              );
              if (isFullyCaught) return false;
            }
          }
          return true;
        });
      }).map(gen => gen.id);

      setExpandedGens(matchingGenIds);
    } else {
      if (wasPokemonSearchingRef.current) {
        wasPokemonSearchingRef.current = false;
        setExpandedGens(['gen1']);
      }
    }
  }, [pokemonSearchQuery, selectedFilterTypes, selectedFilterLegendary, selectedFilterMythical, filterNotCaught, pokemonGenerations, pokedexViewMode]);

  React.useEffect(() => {
    const scroller = document.getElementById('content-scroller') || window;
    const handleScroll = () => {
      const scrollTop = scroller instanceof HTMLElement ? scroller.scrollTop : window.scrollY;
      if (scrollTop > 300) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };
    scroller.addEventListener('scroll', handleScroll);
    window.addEventListener('scroll', handleScroll);
    return () => {
      scroller.removeEventListener('scroll', handleScroll);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const scrollToTop = () => {
    const scroller = document.getElementById('content-scroller');
    if (scroller) {
      scroller.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Modal State & Selected Gen for Add Pokemon
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addPokemonGenId, setAddPokemonGenId] = useState('gen1');

  // Shiny Uncheck/Exclude Modal State
  const [shinyUncheckTarget, setShinyUncheckTarget] = useState<{ genId: string; pokemon: PokemonEntry } | null>(null);
  const [isRestoreShinyModalOpen, setIsRestoreShinyModalOpen] = useState(false);

  // Excluded Shinies list for restore modal
  const excludedShiniesList = useMemo(() => {
    const result: { genId: string; genName: string; pokemon: PokemonEntry }[] = [];
    pokemonGenerations.forEach(gen => {
      gen.pokemons.forEach(p => {
        if (p.isShinyExcluded) {
          result.push({ genId: gen.id, genName: gen.name, pokemon: p });
        }
      });
    });
    return result;
  }, [pokemonGenerations]);

  // Edit Pokemon States
  const [editingPokemon, setEditingPokemon] = useState<PokemonEntry | null>(null);
  const [editingPokemonGenId, setEditingPokemonGenId] = useState('');
  const [editPokemonNum, setEditPokemonNum] = useState('');
  const [editPokemonName, setEditPokemonName] = useState('');
  const [editPokemonSpriteId, setEditPokemonSpriteId] = useState('');
  const [editPokemonHasMale, setEditPokemonHasMale] = useState(true);
  const [editPokemonHasFemale, setEditPokemonHasFemale] = useState(true);
  const [editPokemonHasGenderless, setEditPokemonHasGenderless] = useState(false);
  const [editPokemonType1, setEditPokemonType1] = useState('Normal');
  const [editPokemonType2, setEditPokemonType2] = useState('');
  const [editPokemonIsLegendary, setEditPokemonIsLegendary] = useState(false);
  const [editPokemonIsMythical, setEditPokemonIsMythical] = useState(false);
  const [editPokemonIsExtraForm, setEditPokemonIsExtraForm] = useState(false);

  const handleTogglePokemonCatch = (generationId: string, pokemonId: string, gender: 'male' | 'female' | 'genderless' | 'shiny') => {
    if (gender === 'shiny') {
      const gen = pokemonGenerations.find(g => g.id === generationId);
      const targetPk = gen?.pokemons.find(pk => pk.id === pokemonId);
      if (targetPk && targetPk.isShinyCaught) {
        setShinyUncheckTarget({ genId: generationId, pokemon: targetPk });
        return;
      }
    }

    setPokemonGenerations(prev => prev.map(gen => {
      if (gen.id !== generationId) return gen;
      return {
        ...gen,
        pokemons: gen.pokemons.map(pk => {
          if (pk.id !== pokemonId) return pk;
          if (gender === 'male') {
            return { ...pk, isMaleCaught: !pk.isMaleCaught };
          } else if (gender === 'female') {
            return { ...pk, isFemaleCaught: !pk.isFemaleCaught };
          } else if (gender === 'genderless') {
            return { ...pk, isGenderlessCaught: !pk.isGenderlessCaught };
          } else if (gender === 'shiny') {
            return { ...pk, isShinyCaught: !pk.isShinyCaught };
          }
          return pk;
        })
      };
    }));
  };

  const handleConfirmUncheckShiny = () => {
    if (!shinyUncheckTarget) return;
    const { genId, pokemon } = shinyUncheckTarget;
    setPokemonGenerations(prev => prev.map(gen => {
      if (gen.id !== genId) return gen;
      return {
        ...gen,
        pokemons: gen.pokemons.map(pk => {
          if (pk.id !== pokemon.id) return pk;
          return { ...pk, isShinyCaught: false };
        })
      };
    }));
    triggerToast(`Shiny desmarcado para ${pokemon.name}.`);
    setShinyUncheckTarget(null);
  };

  const handleConfirmExcludeShiny = () => {
    if (!shinyUncheckTarget) return;
    const { genId, pokemon } = shinyUncheckTarget;
    setPokemonGenerations(prev => prev.map(gen => {
      if (gen.id !== genId) return gen;
      return {
        ...gen,
        pokemons: gen.pokemons.map(pk => {
          if (pk.id !== pokemon.id) return pk;
          return { ...pk, isShinyCaught: false, isShinyExcluded: true };
        })
      };
    }));
    triggerToast(`${pokemon.name} foi retirado da lista de Shinies.`);
    setShinyUncheckTarget(null);
  };

  const handleRestoreShinyPokemon = (genId: string, pokemonId: string, pokemonName: string) => {
    setPokemonGenerations(prev => prev.map(gen => {
      if (gen.id !== genId) return gen;
      return {
        ...gen,
        pokemons: gen.pokemons.map(pk => {
          if (pk.id !== pokemonId) return pk;
          return { ...pk, isShinyExcluded: false };
        })
      };
    }));
    triggerToast(`${pokemonName} restaurado na lista de Shinies.`);
  };

  const handleRestoreAllExcludedShinies = () => {
    setPokemonGenerations(prev => prev.map(gen => ({
      ...gen,
      pokemons: gen.pokemons.map(pk => ({ ...pk, isShinyExcluded: false }))
    })));
    triggerToast('Todos os Pokémons foram restaurados para a lista Shiny.');
    setIsRestoreShinyModalOpen(false);
  };

  const handleStartEditPokemon = (genId: string, p: PokemonEntry) => {
    setEditingPokemon(p);
    setEditingPokemonGenId(genId);
    setEditPokemonNum(p.num);
    setEditPokemonName(p.name);
    setEditPokemonSpriteId(p.spriteId || '');
    setEditPokemonHasMale(p.hasMale);
    setEditPokemonHasFemale(p.hasFemale);
    setEditPokemonHasGenderless(p.hasGenderless);
    setEditPokemonType1(p.type1 || 'Normal');
    setEditPokemonType2(p.type2 || '');
    setEditPokemonIsLegendary(!!p.isLegendary);
    setEditPokemonIsMythical(!!p.isMythical);
    setEditPokemonIsExtraForm(!!p.isExtraForm);
  };

  const handleSaveEditPokemon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPokemon) return;
    if (!editPokemonName.trim()) {
      triggerToast('O nome do Pokémon é obrigatório.');
      return;
    }

    const validatedType1 = validateAndStandardiseType(editPokemonType1);
    if (!validatedType1) {
      triggerToast('O primeiro tipo é obrigatório e deve ser um dos tipos válidos da lista.');
      return;
    }
    let validatedType2 = undefined;
    if (editPokemonType2.trim()) {
      validatedType2 = validateAndStandardiseType(editPokemonType2);
      if (!validatedType2) {
        triggerToast('O segundo tipo inserido não é um tipo válido da lista.');
        return;
      }
    }

    setPokemonGenerations(prev => prev.map(gen => {
      if (gen.id !== editingPokemonGenId) return gen;
      return {
        ...gen,
        pokemons: gen.pokemons.map(p => {
          if (p.id !== editingPokemon.id) return p;
          return {
            ...p,
            num: editPokemonNum.trim() || '???',
            name: editPokemonName.trim(),
            spriteId: editPokemonSpriteId.trim() || undefined,
            hasMale: editPokemonIsExtraForm ? false : editPokemonHasMale,
            hasFemale: editPokemonIsExtraForm ? false : editPokemonHasFemale,
            hasGenderless: editPokemonIsExtraForm ? false : editPokemonHasGenderless,
            type1: validatedType1,
            type2: validatedType2 || undefined,
            isLegendary: editPokemonIsExtraForm ? false : editPokemonIsLegendary,
            isMythical: editPokemonIsExtraForm ? false : editPokemonIsMythical,
            isExtraForm: editPokemonIsExtraForm
          };
        })
      };
    }));

    triggerToast(`Pokémon "${editPokemonName.trim()}" atualizado com sucesso!`);
    setEditingPokemon(null);
  };

  const handleAddPokemon = (genId: string, e: React.FormEvent) => {
    e.preventDefault();
    if (!newPokemonName.trim()) {
      triggerToast('O nome do Pokémon é obrigatório.');
      return;
    }

    const validatedType1 = validateAndStandardiseType(newPokemonType1);
    if (!validatedType1) {
      triggerToast('O primeiro tipo é obrigatório e deve ser um dos tipos válidos da lista.');
      return;
    }
    let validatedType2 = undefined;
    if (newPokemonType2.trim()) {
      validatedType2 = validateAndStandardiseType(newPokemonType2);
      if (!validatedType2) {
        triggerToast('O segundo tipo inserido não é um tipo válido da lista.');
        return;
      }
    }
    
    const numToUse = newPokemonNum.trim() || '???';
    const newEntry: PokemonEntry = {
      id: `pokemon-custom-${Date.now()}`,
      num: numToUse,
      name: newPokemonName.trim(),
      hasMale: newPokemonIsExtraForm ? false : newPokemonHasMale,
      hasFemale: newPokemonIsExtraForm ? false : newPokemonHasFemale,
      hasGenderless: newPokemonIsExtraForm ? false : newPokemonHasGenderless,
      isMaleCaught: false,
      isFemaleCaught: false,
      isGenderlessCaught: false,
      spriteId: newPokemonSpriteId.trim() || undefined,
      type1: validatedType1,
      type2: validatedType2 || undefined,
      isLegendary: newPokemonIsExtraForm ? false : newPokemonIsLegendary,
      isMythical: newPokemonIsExtraForm ? false : newPokemonIsMythical,
      isExtraForm: newPokemonIsExtraForm
    };

    setPokemonGenerations(prev => prev.map(gen => {
      if (gen.id !== genId) return gen;
      return {
        ...gen,
        pokemons: [...gen.pokemons, newEntry]
      };
    }));

    setNewPokemonName('');
    setNewPokemonSpriteId('');
    setNewPokemonType1('Normal');
    setNewPokemonType2('');
    setNewPokemonIsLegendary(false);
    setNewPokemonIsMythical(false);
    setNewPokemonIsExtraForm(false);

    const parsedNum = parseInt(numToUse, 10);
    if (!isNaN(parsedNum)) {
      setNewPokemonNum(String(parsedNum + 1).padStart(3, '0'));
    } else {
      setNewPokemonNum('');
    }
    
    setIsAddModalOpen(false);
    triggerToast(`${newEntry.name} adicionado com sucesso!`);
  };

  const handleDeletePokemon = (genId: string, pokemonId: string, pokemonName: string) => {
    setPokemonGenerations(prev => prev.map(gen => {
      if (gen.id !== genId) return gen;
      return {
        ...gen,
        pokemons: gen.pokemons.filter(p => p.id !== pokemonId)
      };
    }));
    triggerToast(`${pokemonName} removido da lista.`);
  };

  const handleMovePokemon = (generationId: string, pokemonId: string, direction: 'up' | 'down') => {
    setPokemonGenerations(prev => prev.map(gen => {
      if (gen.id !== generationId) return gen;
      
      const list = [...gen.pokemons];
      const index = list.findIndex(p => p.id === pokemonId);
      if (index === -1) return gen;

      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= list.length) return gen;

      // Swap elements
      const temp = list[index];
      list[index] = list[targetIndex];
      list[targetIndex] = temp;

      return {
        ...gen,
        pokemons: list
      };
    }));
  };

  // --- STATS CALCULATION ---
  const stats = useMemo(() => {
    const list = trophyEntries || [];
    const totalGames = list.length;
    const totalPlatinas = list.reduce((sum, entry) => sum + (entry?.platina || 0), 0);
    const totalOuros = list.reduce((sum, entry) => sum + (entry?.ouro || 0), 0);
    const totalPratas = list.reduce((sum, entry) => sum + (entry?.prata || 0), 0);
    const totalBronzes = list.reduce((sum, entry) => sum + (entry?.bronze || 0), 0);
    const totalGarapas = list.filter(entry => entry?.garapa).length;
    const totalHidden = list.filter(entry => entry?.hide).length;

    // PlayStation Points: Bronze=15, Silver=30, Gold=90, Platinum=300
    const totalPoints = (totalPlatinas * 300) + (totalOuros * 90) + (totalPratas * 30) + (totalBronzes * 15);

    // Calculate level and rank based on new formulas
    const level = getLevelForPoints(totalPoints);
    const rankInfo = getRankInfo(level);
    const rankName = rankInfo.name;
    const rankImg = rankInfo.img;

    const minPts = getPointsRequiredForLevel(level);
    const maxPts = getPointsRequiredForLevel(level + 1);

    const progressPercent = Math.min(
      100, 
      Math.max(0, ((totalPoints - minPts) / (maxPts - minPts)) * 100)
    );

    return {
      totalGames,
      totalPlatinas,
      totalOuros,
      totalPratas,
      totalBronzes,
      totalPoints,
      totalGarapas,
      totalHidden,
      level,
      rankName,
      rankImg,
      progressPercent,
      minPts,
      maxPts
    };
  }, [trophyEntries]);

  // --- FILTERED AND SORTED LIST ---
  const filteredEntries = useMemo(() => {
    const list = trophyEntries || [];
    return list
      .filter(entry => {
        if (!entry) return false;
        // Search query
        const matchesSearch = (entry.jogo || '').toLowerCase().includes(searchQuery.toLowerCase());
        
        // Platform filter
        const matchesPlatform = selectedPlatform === 'ALL' || (entry.platforms || []).includes(selectedPlatform as any);
        
        // Garapa / Platinum filter
        const matchesGarapa = 
          showGarapaFilter === 'ALL' || 
          (showGarapaFilter === 'GARAPA' && entry.garapa) || 
          (showGarapaFilter === 'NOT_GARAPA' && !entry.garapa) ||
          (showGarapaFilter === 'PLATINUM' && (entry.platina || 0) > 0);
        
        // Hide filter
        const matchesHide = showHidden ? true : !entry.hide;

        return matchesSearch && matchesPlatform && matchesGarapa && matchesHide;
      })
      .sort((a, b) => {
        if (sortBy === 'title_asc') {
          return (a.jogo || '').localeCompare(b.jogo || '');
        }
        // 'custom' order: maintains the natural original order in which they were added/loaded in the app
        return 0;
      });
  }, [trophyEntries, searchQuery, selectedPlatform, showGarapaFilter, showHidden, sortBy]);

  // --- ACTIONS ---
  const handleOpenAddForm = () => {
    setEditingEntry(null);
    setFormJogo('');
    setFormPlatina('');
    setFormOuro('');
    setFormPrata('');
    setFormBronze('');
    setFormPlatforms([]);
    setFormGarapa(false);
    setFormHide(false);
    setFormDataPlatina('');
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (entry: GameTrophyEntry) => {
    setEditingEntry(entry);
    setFormJogo(entry.jogo);
    setFormPlatina(entry.platina === 0 ? '' : entry.platina);
    setFormOuro(entry.ouro === 0 ? '' : entry.ouro);
    setFormPrata(entry.prata === 0 ? '' : entry.prata);
    setFormBronze(entry.bronze === 0 ? '' : entry.bronze);
    setFormPlatforms(entry.platforms);
    setFormGarapa(entry.garapa);
    setFormHide(entry.hide);
    setFormDataPlatina(entry.dataPlatina ? formatYYYYMMDDToDDMMAA(entry.dataPlatina) : '');
    setIsFormOpen(true);
  };

  const handleDeleteEntry = (id: string, name: string) => {
    setGameToDelete({ id, name });
  };

  const confirmDeleteEntry = () => {
    if (gameToDelete) {
      setTrophyEntries(prev => prev.filter(item => item.id !== gameToDelete.id));
      triggerToast(`Jogo "${gameToDelete.name}" removido com sucesso.`);
      setGameToDelete(null);
    }
  };

  const togglePlatformInForm = (platform: 'PS3' | 'PSVita' | 'PS4' | 'PS5') => {
    if (formPlatforms.includes(platform)) {
      setFormPlatforms(prev => prev.filter(p => p !== platform));
    } else {
      setFormPlatforms(prev => [...prev, platform]);
    }
  };

  const handleSaveEntry = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validations
    if (!formJogo.trim()) {
      triggerToast('O nome do jogo é obrigatório!');
      return;
    }
    
    if (formPlatforms.length === 0) {
      triggerToast('Selecione pelo menos uma plataforma!');
      return;
    }

    const platValue = formPlatina === '' ? 0 : Math.max(0, Number(formPlatina) || 0);
    const ouroValue = formOuro === '' ? 0 : Math.max(0, Number(formOuro) || 0);
    const prataValue = formPrata === '' ? 0 : Math.max(0, Number(formPrata) || 0);
    const bronzeValue = formBronze === '' ? 0 : Math.max(0, Number(formBronze) || 0);

    let parsedDateStr: string | undefined = undefined;
    if (formDataPlatina.trim()) {
      const parsedDate = parseDDMMAA(formDataPlatina.trim());
      if (!parsedDate || isNaN(parsedDate.getTime())) {
        triggerToast('Data de Platina inválida. Use o formato dd/mm/aa.');
        return;
      }
      const y = parsedDate.getFullYear();
      const m = String(parsedDate.getMonth() + 1).padStart(2, '0');
      const d = String(parsedDate.getDate()).padStart(2, '0');
      parsedDateStr = `${y}-${m}-${d}`;
    }

    const savedData: GameTrophyEntry = {
      id: editingEntry ? editingEntry.id : `game_${Date.now()}`,
      jogo: formJogo.trim(),
      platina: platValue,
      ouro: ouroValue,
      prata: prataValue,
      bronze: bronzeValue,
      platforms: formPlatforms,
      garapa: formGarapa,
      hide: formHide,
      dataPlatina: parsedDateStr
    };

    if (editingEntry) {
      setTrophyEntries(prev => prev.map(item => item.id === editingEntry.id ? savedData : item));
      triggerToast(`Jogo "${savedData.jogo}" atualizado.`);
    } else {
      setTrophyEntries(prev => [...prev, savedData]);
      triggerToast(`Jogo "${savedData.jogo}" adicionado com sucesso!`);
    }

    setIsFormOpen(false);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Sem data';
    try {
      const [year, month, day] = dateStr.split('-');
      return `${day}/${month}/${year}`;
    } catch (_) {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6 text-left" id="games-module-root">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant/20 pb-4" id="games-header-bar">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-brand-primary/10 rounded-2xl flex items-center justify-center border border-brand-primary/20 gold-glow">
            <Gamepad2 size={24} className="text-brand-primary animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-display font-black text-white tracking-wider uppercase">
              {activeSubmenu === 'TROPHIES' && 'TROPHIES'}
              {activeSubmenu === 'POKÉMON' && 'POKÉMON'}
              {activeSubmenu === 'TO PLAY' && 'TO PLAY'}
            </h2>
          </div>
        </div>

        {activeSubmenu === 'TROPHIES' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDashboard(prev => !prev)}
              className="flex items-center gap-2 px-4 py-2.5 bg-bg-surface-med/50 hover:bg-bg-surface-med border border-outline-variant/30 text-text-high rounded-xl text-xs font-bold tracking-wider font-mono transition-all cursor-pointer shadow-sm hover:border-brand-primary/50"
              id="btn-toggle-dashboard"
            >
              {showDashboard ? (
                <>
                  <List size={14} className="text-brand-primary" />
                  <span>VER LISTA</span>
                </>
              ) : (
                <>
                  <TrendingUp size={14} className="text-brand-primary animate-pulse" />
                  <span>DASHBOARD</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* RENDER ACTIVE SCREEN */}
      {activeSubmenu === 'TROPHIES' && (
        showDashboard ? (
          <TrophiesDashboard trophyEntries={trophyEntries} onBack={() => setShowDashboard(false)} />
        ) : (
          <div className="space-y-6" id="trophies-view-container">
          
          {/* TROPHY DASHBOARD OVERVIEW */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="trophies-dashboard">
            
            {/* LEVEL & PROGRESS PANEL */}
            <div className="lg:col-span-5 bg-bg-surface-low border border-outline-variant/60 rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-4" id="trophies-rank-card">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-2xl font-display font-black text-white uppercase flex items-baseline gap-2">
                    <span>Nível {stats.level}</span>
                    <span className="text-xs font-mono font-normal text-brand-primary uppercase">{stats.rankName}</span>
                  </h3>
                  <div className="flex items-center gap-1.5 mt-1 text-xs font-mono text-brand-primary">
                    <Trophy size={14} />
                    <span>{stats.totalPoints.toLocaleString('pt-BR')} Pontos</span>
                  </div>
                </div>
                
                {/* Rank Badge Image with elegant fallback/glow */}
                <div className="w-16 h-16 bg-bg-surface-med/50 rounded-2xl border border-outline-variant/30 p-2 flex items-center justify-center relative gold-glow">
                  <img 
                    src={stats.rankImg} 
                    alt={stats.rankName} 
                    className="w-12 h-12 object-contain" 
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      // Fallback if image doesn't exist
                      (e.currentTarget as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%23ffe08b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34"/><path d="M12 2a4 4 0 0 1 4 4v5a4 4 0 0 1-4 4 4 4 0 0 1-4-4V6a4 4 0 0 1 4-4z"/></svg>';
                    }}
                  />
                </div>
              </div>

              {/* Progress Bar to next Rank */}
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-mono text-text-muted">
                  <span>Progresso para próximo nível</span>
                  <span>{Math.floor(stats.progressPercent)}%</span>
                </div>
                <div className="h-2 w-full bg-bg-surface-med rounded-full overflow-hidden border border-outline-variant/10">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${stats.progressPercent}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className="h-full bg-gradient-to-r from-brand-primary to-amber-400 rounded-full"
                  />
                </div>
                <div className="flex justify-between text-[9px] font-mono text-text-muted">
                  <span>Min: {stats.minPts.toLocaleString('pt-BR')}</span>
                  <span>Max: {stats.maxPts.toLocaleString('pt-BR')}</span>
                </div>
              </div>
            </div>

            {/* TROPHY COUNTERS (COL-SPAN-7) */}
            <div className="lg:col-span-7 bg-bg-surface-low border border-outline-variant/60 rounded-3xl p-6 shadow-xl flex flex-col justify-between" id="trophies-totals-card">
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4" id="trophy-medal-grid">
                
                {/* PLATINUM */}
                <div className="bg-bg-surface-med/30 border border-outline-variant/10 rounded-2xl p-4 flex flex-col items-center justify-center text-center relative overflow-hidden group">
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-cyan-400/50" />
                  <img src="/games/plat.png" alt="Platina" className="w-10 h-10 object-contain mb-2 group-hover:scale-110 transition-transform" referrerPolicy="no-referrer" />
                  <span className="text-xl font-display font-black text-white">{stats.totalPlatinas}</span>
                  <span className="text-[9px] font-mono text-cyan-300 font-bold uppercase mt-1">Platina</span>
                </div>

                {/* GOLD */}
                <div className="bg-bg-surface-med/30 border border-outline-variant/10 rounded-2xl p-4 flex flex-col items-center justify-center text-center relative overflow-hidden group">
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-amber-400/50" />
                  <img src="/games/gold.png" alt="Ouro" className="w-10 h-10 object-contain mb-2 group-hover:scale-110 transition-transform" referrerPolicy="no-referrer" />
                  <span className="text-xl font-display font-black text-white">{stats.totalOuros}</span>
                  <span className="text-[9px] font-mono text-amber-300 font-bold uppercase mt-1">Ouro</span>
                </div>

                {/* SILVER */}
                <div className="bg-bg-surface-med/30 border border-outline-variant/10 rounded-2xl p-4 flex flex-col items-center justify-center text-center relative overflow-hidden group">
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-zinc-300/50" />
                  <img src="/games/silver.png" alt="Prata" className="w-10 h-10 object-contain mb-2 group-hover:scale-110 transition-transform" referrerPolicy="no-referrer" />
                  <span className="text-xl font-display font-black text-white">{stats.totalPratas}</span>
                  <span className="text-[9px] font-mono text-zinc-300 font-bold uppercase mt-1">Prata</span>
                </div>

                {/* BRONZE */}
                <div className="bg-bg-surface-med/30 border border-outline-variant/10 rounded-2xl p-4 flex flex-col items-center justify-center text-center relative overflow-hidden group">
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-amber-700/50" />
                  <img src="/games/bronze.png" alt="Bronze" className="w-10 h-10 object-contain mb-2 group-hover:scale-110 transition-transform" referrerPolicy="no-referrer" />
                  <span className="text-xl font-display font-black text-white">{stats.totalBronzes}</span>
                  <span className="text-[9px] font-mono text-amber-600 font-bold uppercase mt-1">Bronze</span>
                </div>

              </div>

              {/* Footer Stat Row */}
              <div className="flex items-center justify-between border-t border-outline-variant/15 pt-4 mt-4 text-[10px] font-mono text-text-muted">
                <span>Total de Jogos: <strong className="text-white font-black font-display">{stats.totalGames}</strong></span>
                <span>Garapas: <strong className="text-orange-400 font-black font-display">{stats.totalGarapas}</strong></span>
                {stats.totalHidden > 0 && (
                  <span>Ocultos: <strong className="text-red-400 font-black font-display">{stats.totalHidden}</strong></span>
                )}
              </div>
            </div>

          </div>

          {/* FILTER & CONTROL BAR */}
          <div className="bg-bg-surface-low border border-outline-variant/60 rounded-3xl p-5 shadow-xl flex flex-col gap-4" id="trophies-filters-bar">
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              
              {/* Search */}
              <div className="relative w-full md:max-w-xs lg:max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                <input
                  type="text"
                  placeholder="Buscar jogo..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="bg-bg-surface-med/40 border border-outline-variant/40 hover:border-outline-variant/80 focus:border-brand-primary focus:outline-none rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-text-muted/60 w-full transition-all font-sans"
                  id="search-trophy-input"
                />
              </div>

              {/* Platform Selector Tabs - Adding p-2 padding to prevent clipping active item scale and ring */}
              <div className="flex items-center gap-2 overflow-x-auto md:overflow-x-visible p-2 scrollbar-none shrink-0" id="platform-filter-tabs">
                {['ALL', 'PS3', 'PSVita', 'PS4', 'PS5'].map(platform => {
                  const isActive = selectedPlatform === platform;
                  return (
                    <button
                      key={platform}
                      onClick={() => setSelectedPlatform(platform)}
                      className={`rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                        isActive
                          ? 'ring-2 ring-brand-primary scale-105'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                      title={platform === 'ALL' ? 'Todas' : platform}
                    >
                      {platform === 'ALL' ? (
                        <div className={`h-9 px-3.5 flex items-center justify-center rounded-xl font-display font-black text-[10px] uppercase tracking-widest border transition-all ${
                          isActive 
                            ? 'bg-brand-primary text-black border-brand-primary' 
                            : 'bg-bg-surface-med/30 border-outline-variant/30 text-text-muted'
                        }`}>
                          TODAS
                        </div>
                      ) : (
                        <div className="bg-white border border-white/20 rounded-xl p-1.5 w-9 h-9 flex items-center justify-center shadow-sm">
                          <img 
                            src={`/games/${platform.toLowerCase()}.png`} 
                            alt={platform} 
                            className="w-6 h-6 object-contain" 
                            referrerPolicy="no-referrer"
                            onError={(e) => e.currentTarget.style.display = 'none'}
                          />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-outline-variant/15 pt-4">
              
              {/* Checkbox filters */}
              <div className="flex flex-wrap items-center gap-4">
                
                {/* Garapa Filter Radio/Switcher */}
                <div className="flex bg-bg-surface-med/30 border border-outline-variant/20 rounded-xl p-0.5 text-[9px] font-bold tracking-wider font-mono">
                  <button
                    onClick={() => setShowGarapaFilter('ALL')}
                    className={`px-2.5 py-1 rounded-lg ${showGarapaFilter === 'ALL' ? 'bg-bg-surface-high text-brand-primary shadow-sm' : 'text-text-muted'}`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setShowGarapaFilter('GARAPA')}
                    className={`px-2.5 py-1 rounded-lg ${showGarapaFilter === 'GARAPA' ? 'bg-orange-500/20 text-orange-400 shadow-sm' : 'text-text-muted'}`}
                  >
                    Garapa
                  </button>
                  <button
                    onClick={() => setShowGarapaFilter('NOT_GARAPA')}
                    className={`px-2.5 py-1 rounded-lg ${showGarapaFilter === 'NOT_GARAPA' ? 'bg-indigo-500/20 text-indigo-400 shadow-sm' : 'text-text-muted'}`}
                  >
                    Comum
                  </button>
                  <button
                    onClick={() => setShowGarapaFilter('PLATINUM')}
                    className={`px-2.5 py-1 rounded-lg ${showGarapaFilter === 'PLATINUM' ? 'bg-cyan-500/20 text-cyan-400 shadow-sm' : 'text-text-muted'}`}
                  >
                    Platina
                  </button>
                </div>

                {/* Show Hidden Toggle */}
                {stats.totalHidden > 0 && (
                  <button
                    onClick={() => setShowHidden(prev => !prev)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold tracking-wider font-mono border transition-all cursor-pointer ${
                      showHidden
                        ? 'bg-red-500/10 text-red-400 border-red-500/30'
                        : 'bg-bg-surface-med/20 border-outline-variant/20 text-text-muted hover:text-white'
                    }`}
                  >
                    {showHidden ? <Eye size={13} /> : <EyeOff size={13} />}
                    <span>Mostrar Ocultos ({stats.totalHidden})</span>
                  </button>
                )}

              </div>

              {/* Sort & Grid Layout Buttons */}
              <div className="flex items-center gap-3">
                
                {/* Sort selector */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-text-muted">Filtrar por:</span>
                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value as any)}
                    className="bg-bg-surface-med/40 border border-outline-variant/40 rounded-xl px-2 py-1.5 text-[10px] font-bold font-mono text-white focus:outline-none focus:border-brand-primary"
                  >
                    <option value="custom">Ordem Personalizada</option>
                    <option value="title_asc">Ordem Alfabética</option>
                  </select>
                </div>

                {/* View switcher */}
                <div className="flex border border-outline-variant/25 rounded-xl overflow-hidden p-0.5">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-brand-primary text-black' : 'text-text-muted hover:text-white'}`}
                    title="Visualização em Grade"
                  >
                    <Grid size={14} />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-brand-primary text-black' : 'text-text-muted hover:text-white'}`}
                    title="Visualização em Tabela"
                  >
                    <List size={14} />
                  </button>
                </div>

              </div>

            </div>

          </div>

          {/* LIST / GRID OF ENTRIES */}
          {filteredEntries.length === 0 ? (
            <div className="bg-bg-surface-low border border-outline-variant/40 rounded-3xl p-12 text-center text-text-muted flex flex-col items-center justify-center space-y-3" id="no-game-results">
              <Gamepad2 size={36} className="text-text-muted/40" />
              <div>
                <p className="text-sm font-bold text-white">Nenhum jogo encontrado</p>
                <p className="text-xs text-text-muted mt-1">Experimente alterar os filtros ou adicione um novo lançamento!</p>
              </div>
            </div>
          ) : viewMode === 'grid' ? (
            
            /* GRID VIEW (GAME SHELVES) */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" id="games-grid">
              <AnimatePresence mode="popLayout">
                {filteredEntries.map(entry => {
                  const points = (entry.platina * 300) + (entry.ouro * 90) + (entry.prata * 30) + (entry.bronze * 15);
                  return (
                    <motion.div
                      key={entry.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className={`bg-bg-surface-low border rounded-3xl p-5 shadow-lg flex flex-col justify-between space-y-4 group relative overflow-hidden ${
                        entry.hide ? 'border-red-500/20 opacity-70' : 'border-outline-variant/50 hover:border-outline-variant'
                      }`}
                      id={`game-card-${entry.id}`}
                    >

                      {/* Header with platform icons and Edit/Delete buttons on hover */}
                      <div className="flex items-start justify-between">
                        
                        {/* Platform badges Row */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {(entry.platforms || []).map(platform => (
                            <div 
                              key={platform} 
                              className="bg-white border border-white/20 rounded-lg p-1.5 flex items-center justify-center shrink-0 w-7 h-7 shadow-sm"
                              title={platform}
                            >
                              <img 
                                src={`/games/${platform.toLowerCase()}.png`} 
                                alt={platform} 
                                className="w-4 h-4 object-contain" 
                                referrerPolicy="no-referrer"
                                onError={(e) => e.currentTarget.style.display = 'none'}
                              />
                            </div>
                          ))}
                        </div>

                        {/* Actions (always visible) */}
                        <div className="flex items-center gap-1.5 transition-opacity">
                          <button
                            onClick={() => {
                              setReorderTargetGame(entry);
                              setIsReorderModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-bg-surface-med border border-outline-variant/20 text-text-muted hover:text-brand-primary hover:border-brand-primary/40 transition-all cursor-pointer"
                            title="Mudar posição na ordem personalizada"
                          >
                            <ArrowUpDown size={12} />
                          </button>
                          <button
                            onClick={() => handleOpenEditForm(entry)}
                            className="p-1.5 rounded-lg bg-bg-surface-med border border-outline-variant/20 text-text-muted hover:text-brand-primary hover:border-brand-primary/40 transition-all cursor-pointer"
                            title="Editar lançamento"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            onClick={() => handleDeleteEntry(entry.id, entry.jogo)}
                            className="p-1.5 rounded-lg bg-bg-surface-med border border-outline-variant/20 text-text-muted hover:text-red-400 hover:border-red-500/40 transition-all cursor-pointer"
                            title="Excluir lançamento"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      {/* Game Title & Garapa label */}
                      <div>
                        <h4 className="text-sm font-display font-black text-white leading-tight uppercase tracking-wide group-hover:text-brand-primary transition-colors">
                          {entry.jogo}
                        </h4>
                        
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          {entry.hide && (
                            <span className="bg-red-500/10 border border-red-500/20 text-[8px] font-black tracking-widest text-red-400 font-mono px-2 py-0.5 rounded-full flex items-center gap-1">
                              <EyeOff size={10} /> Ocultado
                            </span>
                          )}
                          {entry.garapa && (
                            <span className="bg-orange-500/10 border border-orange-500/25 text-[8px] font-black tracking-widest text-orange-400 font-mono px-2 py-0.5 rounded-full">
                              Garapa
                            </span>
                          )}
                          <span className="text-[9px] font-mono text-text-muted flex items-center gap-1">
                            <Calendar size={11} /> {formatDate(entry.dataPlatina)}
                          </span>
                        </div>
                      </div>

                      {/* Trophy row counter with gorgeous icons */}
                      <div className="bg-bg-surface-med/25 border border-outline-variant/15 rounded-2xl p-3 flex items-center justify-between" id={`game-card-trophies-${entry.id}`}>
                        <div className="flex items-center gap-4">
                          
                          {/* Platina count */}
                          <div className="flex items-center gap-1.5" title="Platina">
                            <img src="/games/plat.png" alt="" className="w-5 h-5 object-contain" referrerPolicy="no-referrer" />
                            <span className="font-display font-black text-xs text-cyan-200">{entry.platina}</span>
                          </div>

                          {/* Ouro count */}
                          <div className="flex items-center gap-1.5" title="Ouro">
                            <img src="/games/gold.png" alt="" className="w-5 h-5 object-contain" referrerPolicy="no-referrer" />
                            <span className="font-display font-black text-xs text-amber-200">{entry.ouro}</span>
                          </div>

                          {/* Prata count */}
                          <div className="flex items-center gap-1.5" title="Prata">
                            <img src="/games/silver.png" alt="" className="w-5 h-5 object-contain" referrerPolicy="no-referrer" />
                            <span className="font-display font-black text-xs text-zinc-300">{entry.prata}</span>
                          </div>

                          {/* Bronze count */}
                          <div className="flex items-center gap-1.5" title="Bronze">
                            <img src="/games/bronze.png" alt="" className="w-5 h-5 object-contain" referrerPolicy="no-referrer" />
                            <span className="font-display font-black text-xs text-amber-600">{entry.bronze}</span>
                          </div>

                        </div>

                        {/* Calculated game points */}
                        <div className="text-right flex flex-col justify-center">
                          <span className="text-[10px] font-black font-display text-white">{points.toLocaleString('pt-BR')}</span>
                          <span className="text-[8px] font-mono text-text-muted uppercase">Pts</span>
                        </div>
                      </div>

                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          ) : (
            
            /* COMPACT TABLE VIEW */
            <div className="bg-bg-surface-low border border-outline-variant/60 rounded-3xl overflow-hidden shadow-xl" id="games-table-container">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse" id="games-table">
                  <thead>
                    <tr className="border-b border-outline-variant/20 text-text-muted text-[10px] font-black uppercase tracking-widest font-display bg-bg-surface-med/10">
                      <th className="py-4 px-5">Jogo</th>
                      <th className="py-4 px-3">Plataformas</th>
                      <th className="py-4 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <img src="/games/plat.png" alt="Platina" className="w-4 h-4 object-contain" referrerPolicy="no-referrer" />
                        </div>
                      </th>
                      <th className="py-4 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <img src="/games/gold.png" alt="Ouro" className="w-4 h-4 object-contain" referrerPolicy="no-referrer" />
                        </div>
                      </th>
                      <th className="py-4 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <img src="/games/silver.png" alt="Prata" className="w-4 h-4 object-contain" referrerPolicy="no-referrer" />
                        </div>
                      </th>
                      <th className="py-4 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <img src="/games/bronze.png" alt="Bronze" className="w-4 h-4 object-contain" referrerPolicy="no-referrer" />
                        </div>
                      </th>
                      <th className="py-4 px-4 text-center">Pts</th>
                      <th className="py-4 px-4">Data Platina</th>
                      <th className="py-4 px-5 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10">
                    {filteredEntries.map(entry => {
                      const points = (entry.platina * 300) + (entry.ouro * 90) + (entry.prata * 30) + (entry.bronze * 15);
                      return (
                        <tr 
                          key={entry.id} 
                          className={`hover:bg-bg-surface-med/20 transition-all group ${entry.hide ? 'opacity-60 bg-red-500/5' : ''}`}
                          id={`game-row-${entry.id}`}
                        >
                          {/* Name / Garapa */}
                          <td className="py-3 px-5">
                            <div className="flex flex-col">
                              <span className="font-display font-black text-xs text-white uppercase group-hover:text-brand-primary transition-colors">
                                {entry.jogo}
                              </span>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                {entry.hide && (
                                  <span className="text-[8px] text-red-400 font-bold font-mono tracking-widest uppercase bg-red-500/10 px-1 rounded">
                                    Ocultado
                                  </span>
                                )}
                                {entry.garapa && (
                                  <span className="text-[8px] text-orange-400 font-bold font-mono tracking-widest">
                                    Garapa
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Platforms */}
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {(entry.platforms || []).map(p => (
                                <div 
                                  key={p} 
                                  className="bg-white border border-white/20 rounded-lg p-1 flex items-center justify-center shrink-0 w-6 h-6 shadow-sm"
                                  title={p}
                                >
                                  <img 
                                    src={`/games/${p.toLowerCase()}.png`} 
                                    alt={p} 
                                    className="w-3.5 h-3.5 object-contain" 
                                    referrerPolicy="no-referrer"
                                    onError={(e) => e.currentTarget.style.display = 'none'}
                                  />
                                </div>
                              ))}
                            </div>
                          </td>

                          {/* Medals counts */}
                          <td className="py-3 px-3 text-center font-display font-black text-xs text-cyan-200">{entry.platina}</td>
                          <td className="py-3 px-3 text-center font-display font-black text-xs text-amber-200">{entry.ouro}</td>
                          <td className="py-3 px-3 text-center font-display font-black text-xs text-zinc-300">{entry.prata}</td>
                          <td className="py-3 px-3 text-center font-display font-black text-xs text-amber-600">{entry.bronze}</td>
                          
                          {/* Points */}
                          <td className="py-3 px-4 text-center font-mono text-xs font-black text-brand-primary">{points}</td>
                          
                          {/* Date */}
                          <td className="py-3 px-4 text-xs font-mono text-text-muted">{formatDate(entry.dataPlatina)}</td>
                          
                          {/* Actions */}
                          <td className="py-3 px-5 text-right">
                            <div className="flex items-center justify-end gap-2 transition-opacity">
                              <button
                                onClick={() => {
                                  setReorderTargetGame(entry);
                                  setIsReorderModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-text-muted hover:text-brand-primary hover:bg-brand-primary/10 transition-all cursor-pointer"
                                title="Mudar posição na ordem personalizada"
                              >
                                <ArrowUpDown size={12} />
                              </button>
                              <button
                                onClick={() => handleOpenEditForm(entry)}
                                className="p-1.5 rounded-lg text-text-muted hover:text-brand-primary hover:bg-brand-primary/10 transition-all cursor-pointer"
                                title="Editar"
                              >
                                <Edit2 size={12} />
                              </button>
                              <button
                                onClick={() => handleDeleteEntry(entry.id, entry.jogo)}
                                className="p-1.5 rounded-lg text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                                title="Excluir"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          )}

          {/* FLOATING ACTION BUTTON (FAB) FOR GAME LAUNCHES */}
          <motion.button
            key="add-game-fab"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleOpenAddForm}
            className="fixed bottom-20 md:bottom-8 right-6 w-14 h-14 bg-brand-primary text-black rounded-full flex items-center justify-center shadow-2xl hover:brightness-110 z-30 cursor-pointer gold-glow ring-2 ring-brand-primary/20"
            title="Novo Lançamento de Jogo"
            id="global-add-game-fab-btn"
          >
            <Plus size={28} strokeWidth={3} />
          </motion.button>

        </div>
        )
      )}

      {activeSubmenu === 'POKÉMON' && (() => {
        // Calculate global statistics based on view mode
        let globalTotal = 0;
        let globalCaught = 0;
        
        if (pokedexViewMode === 'shiny') {
          pokemonGenerations.forEach(gen => {
            gen.pokemons.forEach(p => {
              if (p.isExtraForm || p.isShinyExcluded) return;
              globalTotal++;
              if (p.isShinyCaught) globalCaught++;
            });
          });
        } else {
          pokemonGenerations.forEach(gen => {
            gen.pokemons.forEach(p => {
              if (p.isExtraForm) return;
              if (p.hasMale) {
                globalTotal++;
                if (p.isMaleCaught) globalCaught++;
              }
              if (p.hasFemale) {
                globalTotal++;
                if (p.isFemaleCaught) globalCaught++;
              }
              if (p.hasGenderless) {
                globalTotal++;
                if (p.isGenderlessCaught) globalCaught++;
              }
            });
          });
        }

        const uniqueNums = new Set<string>();
        pokemonGenerations.forEach(gen => {
          gen.pokemons.forEach(p => {
            if (pokedexViewMode === 'shiny' && (p.isExtraForm || p.isShinyExcluded)) return;
            if (p.num) {
              uniqueNums.add(p.num);
            }
          });
        });
        const totalUniquePokemons = uniqueNums.size;

        const globalPercent = globalTotal > 0 ? (globalCaught / globalTotal) * 100 : 0;
        const globalPercentFormatted = globalPercent.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        const genRegions: Record<string, string> = {
          gen1: 'Kanto',
          gen2: 'Johto',
          gen3: 'Hoenn',
          gen4: 'Sinnoh',
          gen5: 'Unova',
          gen6: 'Kalos',
          gen7: 'Alola',
          gen8: 'Galar',
          gen9: 'Paldea'
        };

        const genGames: Record<string, string> = {
          gen1: 'Red, Blue, Green, Yellow',
          gen2: 'Gold, Silver, Crystal',
          gen3: 'Ruby, Sapphire, Emerald',
          gen4: 'Diamond, Pearl, Platinum',
          gen5: 'Black, White',
          gen6: 'X, Y',
          gen7: 'Sun, Moon',
          gen8: 'Sword, Shield',
          gen9: 'Scarlet, Violet'
        };

        return (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 w-full text-left"
            id="pokemon-screen-content"
          >
            {/* Global Stats Banner */}
            <div className="bg-bg-surface-low border border-outline-variant/40 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-1.5 text-center md:text-left">
                <h3 className="font-display font-black text-2xl text-white uppercase tracking-wider flex items-center justify-center md:justify-start gap-2.5">
                  <span className="inline-block w-3.5 h-3.5 rounded-full bg-red-500 animate-pulse"></span>
                  POKÉDEX
                </h3>
                <p className="text-xs font-mono font-bold text-text-muted uppercase tracking-wider">
                  Pokémons: <span className="text-red-400 font-black text-sm">{totalUniquePokemons}</span>
                </p>
              </div>

              <div className="flex items-center gap-4 sm:gap-6 w-full md:w-auto justify-center md:justify-end flex-wrap">
                {/* NORMAL / SHINY Mode Toggle Buttons */}
                <div className="flex items-center bg-bg-surface-med/60 p-1 rounded-2xl border border-outline-variant/30">
                  <button
                    type="button"
                    onClick={() => setPokedexViewMode('normal')}
                    className={`px-3 py-1.5 rounded-xl font-display font-black text-xs uppercase tracking-wider transition-all cursor-pointer select-none ${
                      pokedexViewMode === 'normal'
                        ? 'bg-red-500 text-white shadow-md font-black'
                        : 'text-text-muted hover:text-white'
                    }`}
                  >
                    NORMAL
                  </button>
                  <button
                    type="button"
                    onClick={() => setPokedexViewMode('shiny')}
                    className={`px-3 py-1.5 rounded-xl font-display font-black text-xs uppercase tracking-wider transition-all cursor-pointer select-none flex items-center gap-1.5 ${
                      pokedexViewMode === 'shiny'
                        ? 'bg-amber-500 text-black shadow-md font-black'
                        : 'text-text-muted hover:text-white'
                    }`}
                  >
                    <Sparkles size={13} className={pokedexViewMode === 'shiny' ? 'text-black' : 'text-amber-400'} />
                    SHINY
                  </button>
                </div>

                <div className="text-right">
                  <span className="text-2xl font-mono font-black text-white">{globalCaught}</span>
                  <span className="text-xs font-semibold text-text-muted"> / {globalTotal} {pokedexViewMode === 'shiny' ? 'Shinies' : 'Caught'}</span>
                </div>
                <div className="relative w-16 h-16 flex items-center justify-center shrink-0" id="global-pokedex-progress">
                  {/* Circular Progress */}
                  <svg className="w-full h-full transform -rotate-90 animate-fade-in" viewBox="0 0 36 36">
                    {/* Background circle */}
                    <path
                      className="text-outline-variant/20"
                      strokeWidth="3.5"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845
                        a 15.9155 15.9155 0 0 1 0 31.831
                        a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    {/* Progress circle */}
                    <path
                      className={pokedexViewMode === 'shiny' ? "text-amber-400 transition-all duration-500 ease-out" : "text-red-500 transition-all duration-500 ease-out"}
                      strokeWidth="3.5"
                      strokeDasharray={`${globalPercent}, 100`}
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845
                        a 15.9155 15.9155 0 0 1 0 31.831
                        a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <span className="absolute text-[10px] font-mono font-black text-white">{globalPercentFormatted}%</span>
                </div>
              </div>
            </div>

            {/* Search and Action globally */}
            <div className="bg-bg-surface-low border border-outline-variant/40 rounded-3xl p-4 sm:p-5 shadow-lg">
              <div className="flex flex-col lg:flex-row lg:items-center gap-3 w-full">
                {/* Search Input */}
                <div className="relative flex-1 bg-bg-surface-med/30 rounded-2xl border border-outline-variant/30 px-4 py-2.5 flex items-center gap-2.5">
                  <Search size={16} className="text-text-muted shrink-0" />
                  <input
                    type="text"
                    placeholder="Buscar Pokémon..."
                    value={pokemonSearchQuery}
                    onChange={(e) => setPokemonSearchQuery(e.target.value)}
                    className="w-full bg-transparent text-xs text-white placeholder-text-muted/60 focus:outline-none"
                  />
                  {pokemonSearchQuery && (
                    <button
                      onClick={() => setPokemonSearchQuery('')}
                      className="text-text-muted hover:text-white transition-all text-xs font-mono font-bold"
                    >
                      Limpar
                    </button>
                  )}
                </div>

                {/* Buttons Row */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {/* "Não Pegos" Button */}
                  <button
                    type="button"
                    onClick={() => setFilterNotCaught(!filterNotCaught)}
                    className={`h-10 px-3 sm:px-4 rounded-2xl border flex items-center justify-center gap-2 font-display font-black text-xs uppercase tracking-wider transition-all select-none cursor-pointer flex-1 sm:flex-initial ${
                      filterNotCaught
                        ? 'bg-red-500/15 border-red-500/50 text-red-400 font-bold'
                        : 'bg-bg-surface-med/60 hover:bg-bg-surface-med hover:text-white border-outline-variant/30 hover:border-outline-variant text-text-high'
                    }`}
                    title="Mostrar apenas Pokémon não completamente pegos"
                  >
                    <span className={`w-2 h-2 rounded-full ${filterNotCaught ? 'bg-red-500 animate-pulse' : 'bg-text-muted'}`} />
                    <span>Não Pegos</span>
                  </button>

                  {/* Filter Button and Popover */}
                  <div className="relative flex-1 sm:flex-initial">
                    <button
                      type="button"
                      onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                      className={`h-10 w-full sm:w-auto px-3 sm:px-4 rounded-2xl border flex items-center justify-center gap-2 font-display font-black text-xs uppercase tracking-wider transition-all select-none cursor-pointer ${
                        selectedFilterTypes.length > 0 || selectedFilterLegendary || selectedFilterMythical
                          ? 'bg-red-500/15 border-red-500/50 text-red-400'
                          : 'bg-bg-surface-med/60 hover:bg-bg-surface-med hover:text-white border-outline-variant/30 hover:border-outline-variant text-text-high'
                      }`}
                      title="Filtrar Pokémon"
                    >
                      <Filter size={14} className={selectedFilterTypes.length > 0 || selectedFilterLegendary || selectedFilterMythical ? 'text-red-400' : 'text-text-muted'} />
                      <span>Filtros</span>
                      {(selectedFilterTypes.length > 0 || selectedFilterLegendary || selectedFilterMythical) && (
                        <span className="bg-red-500 text-white font-mono font-bold text-[9px] px-1.5 py-0.5 rounded-full flex items-center justify-center min-w-[18px]">
                          {selectedFilterTypes.length + (selectedFilterLegendary ? 1 : 0) + (selectedFilterMythical ? 1 : 0)}
                        </span>
                      )}
                    </button>

                    <AnimatePresence>
                      {isFilterDropdownOpen && (
                        <>
                          {/* Backdrop to close */}
                          <div className="fixed inset-0 z-40" onClick={() => setIsFilterDropdownOpen(false)} />
                          
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                            transition={{ duration: 0.15 }}
                            className="absolute right-0 mt-2 w-72 bg-bg-surface-high border border-outline-variant/60 rounded-2xl p-4 shadow-2xl z-50 space-y-4"
                          >
                            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-2">
                              <span className="text-xs font-black uppercase tracking-wider text-white font-display">Filtros</span>
                              {(selectedFilterTypes.length > 0 || selectedFilterLegendary || selectedFilterMythical) && (
                                <button
                                  onClick={() => {
                                    setSelectedFilterTypes([]);
                                    setSelectedFilterLegendary(false);
                                    setSelectedFilterMythical(false);
                                  }}
                                  className="text-[10px] font-black uppercase tracking-wider text-red-400 hover:text-red-300 transition-all cursor-pointer"
                                >
                                  Limpar Filtros
                                </button>
                              )}
                            </div>

                            {/* Rarity Selectors */}
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => setSelectedFilterLegendary(!selectedFilterLegendary)}
                                className={`py-1.5 px-2 rounded-xl text-[10px] font-bold transition-all border flex items-center justify-center gap-1.5 cursor-pointer ${
                                  selectedFilterLegendary
                                    ? 'bg-amber-500/15 border-amber-500/50 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.15)]'
                                    : 'bg-bg-surface-med/30 border-outline-variant/15 text-text-muted hover:text-white hover:border-outline-variant/40'
                                }`}
                              >
                                <div className="w-5 h-5 rounded-full bg-amber-500/15 border border-amber-500 text-amber-500 font-black flex items-center justify-center text-[9px] select-none">
                                  L
                                </div>
                                Lendário
                              </button>
                              <button
                                type="button"
                                onClick={() => setSelectedFilterMythical(!selectedFilterMythical)}
                                className={`py-1.5 px-2 rounded-xl text-[10px] font-bold transition-all border flex items-center justify-center gap-1.5 cursor-pointer ${
                                  selectedFilterMythical
                                    ? 'bg-purple-500/15 border-purple-500/50 text-purple-300 shadow-[0_0_8px_rgba(168,85,247,0.15)]'
                                    : 'bg-bg-surface-med/30 border-outline-variant/15 text-text-muted hover:text-white hover:border-outline-variant/40'
                                }`}
                              >
                                <div className="w-5 h-5 rounded-full bg-purple-500/15 border border-purple-500 text-purple-500 font-black flex items-center justify-center text-[9px] select-none">
                                  M
                                </div>
                                Mítico
                              </button>
                            </div>

                            {/* Types Selector */}
                            <div className="space-y-1.5">
                              <label className="text-[9px] font-black uppercase tracking-wider text-text-muted block">Tipos de Pokémon</label>
                              <div className="grid grid-cols-3 gap-1.5 max-h-[180px] overflow-y-auto pr-1 bg-bg-surface-med/20 p-2 rounded-xl border border-outline-variant/20 scrollbar-thin scrollbar-thumb-outline-variant/40">
                                {POKEMON_TYPES.map(t => {
                                  const isSelected = selectedFilterTypes.includes(t);
                                  return (
                                    <button
                                      key={t}
                                      type="button"
                                      onClick={() => {
                                        if (isSelected) {
                                          setSelectedFilterTypes(selectedFilterTypes.filter(x => x !== t));
                                        } else {
                                          setSelectedFilterTypes([...selectedFilterTypes, t]);
                                        }
                                      }}
                                      className={`py-1.5 rounded-xl text-[9px] font-bold transition-all border flex flex-col items-center justify-center gap-1 cursor-pointer ${
                                        isSelected
                                          ? 'bg-red-500/15 border-red-500/50 text-white font-black'
                                          : 'bg-bg-surface-med/40 border-outline-variant/10 text-text-muted/80 hover:text-white hover:bg-bg-surface-med/80 hover:border-outline-variant/30'
                                      }`}
                                    >
                                      <img
                                        src={`https://raw.githubusercontent.com/armindoneto/nocturne/main/pokedex/${t.toLowerCase()}.png`}
                                        alt={t}
                                        title={t}
                                        referrerPolicy="no-referrer"
                                        className="w-5 h-5 object-contain shrink-0"
                                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                      />
                                      <span>{t}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Restore Excluded Shinies Button */}
                  {pokedexViewMode === 'shiny' && excludedShiniesList.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setIsRestoreShinyModalOpen(true)}
                      className="bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 px-3 rounded-2xl flex items-center justify-center gap-1.5 font-display font-black text-xs uppercase tracking-wider transition-all h-10 select-none cursor-pointer flex-1 sm:flex-initial"
                      title="Ver Pokémons Ocultados da lista Shiny"
                    >
                      <EyeOff size={15} />
                      <span>Ocultos ({excludedShiniesList.length})</span>
                    </button>
                  )}

                  {/* Add Pokémon Button */}
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(true)}
                    className="bg-red-500 hover:bg-red-600 text-white px-3 sm:px-4 rounded-2xl flex items-center justify-center gap-1.5 font-display font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-red-500/10 cursor-pointer h-10 select-none flex-1 sm:flex-initial"
                    title="Adicionar Novo Pokémon"
                  >
                    <Plus size={16} strokeWidth={3} />
                    <span>Adicionar</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Generations List */}
            <div className="space-y-4" id="pokemon-generations-list">
              {pokemonGenerations.map((gen) => {
                const regionName = genRegions[gen.id] || 'Desconhecida';
                const isExpanded = expandedGens.includes(gen.id);

                // Calculate progress for this generation
                let genTotalNeeded = 0;
                let genCaughtCount = 0;

                if (pokedexViewMode === 'shiny') {
                  gen.pokemons.forEach(p => {
                    if (p.isExtraForm || p.isShinyExcluded) return;
                    genTotalNeeded++;
                    if (p.isShinyCaught) genCaughtCount++;
                  });
                } else {
                  gen.pokemons.forEach(p => {
                    if (p.isExtraForm) return;
                    if (p.hasMale) {
                      genTotalNeeded++;
                      if (p.isMaleCaught) genCaughtCount++;
                    }
                    if (p.hasFemale) {
                      genTotalNeeded++;
                      if (p.isFemaleCaught) genCaughtCount++;
                    }
                    if (p.hasGenderless) {
                      genTotalNeeded++;
                      if (p.isGenderlessCaught) genCaughtCount++;
                    }
                  });
                }

                const genPercent = genTotalNeeded > 0 ? (genCaughtCount / genTotalNeeded) * 100 : 0;
                const genPercentFormatted = genPercent.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

                // Filter pokemons of this generation
                const filteredPokemons = gen.pokemons.filter(p => {
                  // Hide extra forms and shiny-excluded in shiny mode
                  if (pokedexViewMode === 'shiny' && (p.isExtraForm || p.isShinyExcluded)) {
                    return false;
                  }

                  // Search query filter
                  if (pokemonSearchQuery.trim()) {
                    const query = pokemonSearchQuery.toLowerCase().trim();
                    const matchesSearch = p.name.toLowerCase().includes(query) || p.num.includes(query);
                    if (!matchesSearch) return false;
                  }

                  // Type filter
                  if (selectedFilterTypes.length > 0) {
                    const hasType1 = p.type1 && selectedFilterTypes.includes(p.type1);
                    const hasType2 = p.type2 && selectedFilterTypes.includes(p.type2);
                    if (!hasType1 && !hasType2) return false;
                  }

                  // Legendary filter
                  if (selectedFilterLegendary && !p.isLegendary) {
                    return false;
                  }

                  // Mythical filter
                  if (selectedFilterMythical && !p.isMythical) {
                    return false;
                  }

                  // "Não Pegos" filter
                  if (filterNotCaught) {
                    if (pokedexViewMode === 'shiny') {
                      if (p.isShinyCaught) return false;
                    } else {
                      const isFullyCaught = p.isExtraForm || (
                        (!p.hasMale || p.isMaleCaught) &&
                        (!p.hasFemale || p.isFemaleCaught) &&
                        (!p.hasGenderless || p.isGenderlessCaught)
                      );
                      if (isFullyCaught) return false;
                    }
                  }

                  return true;
                });

                return (
                  <div
                    key={gen.id}
                    className={`bg-bg-surface-low border rounded-3xl overflow-hidden shadow-md transition-all ${
                      isExpanded ? 'border-outline-variant' : 'border-outline-variant/30 hover:border-outline-variant/60'
                    }`}
                  >
                    {/* Header */}
                    <div
                      onClick={() => {
                        if (isExpanded) {
                          setExpandedGens(expandedGens.filter(id => id !== gen.id));
                        } else {
                          setExpandedGens([...expandedGens, gen.id]);
                        }
                      }}
                      className="px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer select-none bg-bg-surface-low hover:bg-bg-surface-med/25 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center shrink-0">
                          <span className="text-red-400 font-display font-black text-sm">G{gen.id.replace('gen', '')}</span>
                        </div>
                        <div>
                          <h4 className="font-display font-black text-xs text-white uppercase tracking-wider flex items-center flex-wrap gap-2">
                            {gen.name}
                            <span className="text-[10px] font-black text-text-muted/60 bg-bg-surface-med/55 px-2 py-0.5 rounded-md border border-outline-variant/10 shrink-0">
                              {regionName}
                            </span>
                            <span className="text-[10px] font-black text-text-muted/60 bg-bg-surface-med/55 px-2 py-0.5 rounded-md border border-outline-variant/10 shrink-0">
                              {genGames[gen.id] || ''}
                            </span>
                          </h4>
                          <p className="text-[10px] font-mono font-bold text-text-muted uppercase tracking-wider mt-0.5">
                            {new Set(gen.pokemons.filter(p => pokedexViewMode === 'shiny' ? (!p.isExtraForm && !p.isShinyExcluded) : !p.isExtraForm).map(p => p.num)).size} Pokémons • {genCaughtCount}/{genTotalNeeded} {pokedexViewMode === 'shiny' ? 'Shinies' : 'Gêneros'}
                          </p>
                        </div>
                      </div>

                      {/* Progress bar in header */}
                      <div className="flex items-center gap-4 w-full sm:w-auto">
                        <div className="flex-1 sm:w-32 bg-bg-surface-med/50 h-2 rounded-full overflow-hidden border border-outline-variant/10">
                          <div
                            className={pokedexViewMode === 'shiny' ? "bg-amber-400 h-full rounded-full transition-all duration-500" : "bg-red-500 h-full rounded-full transition-all duration-500"}
                            style={{ width: `${genPercent}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-mono font-black text-white shrink-0 min-w-[35px] text-right">
                          {genPercentFormatted}%
                        </span>
                        <ChevronRight
                          size={18}
                          className={`text-text-muted transition-all duration-300 transform ${isExpanded ? 'rotate-90 text-white' : ''}`}
                        />
                      </div>
                    </div>

                    {/* Expandable Panel */}
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="border-t border-outline-variant/20 bg-bg-surface-low/30"
                        >
                          <div className="p-6 space-y-6">
                            {/* Pokemons List table */}
                            {filteredPokemons.length === 0 ? (
                              <div className="text-center py-10 border border-dashed border-outline-variant/20 rounded-2xl space-y-2">
                                <AlertCircle size={24} className="text-text-muted/40 mx-auto" />
                                <p className="text-xs font-semibold text-text-muted">Nenhum Pokémon encontrado nesta geração.</p>
                                {pokemonSearchQuery && (
                                  <button
                                    onClick={() => setPokemonSearchQuery('')}
                                    className="text-[10px] font-black uppercase tracking-wider text-red-400 hover:underline"
                                  >
                                    Limpar filtro de busca
                                  </button>
                                )}
                              </div>
                            ) : (
                              <>
                                {/* Desktop View (Keep original layout) */}
                                <div className="hidden md:block overflow-x-auto rounded-2xl border border-outline-variant/30 bg-bg-surface-med/5">
                                  <table className="w-full text-left border-collapse">
                                    <thead>
                                      <tr className="bg-bg-surface-med/25 border-b border-outline-variant/35 text-[10px] font-black uppercase tracking-wider text-text-muted font-display select-none">
                                        <th className="py-4 px-4 w-16">Nº</th>
                                        <th className="py-4 px-4 w-24 text-center"></th>
                                        <th className="py-4 px-4">Pokémon</th>
                                        <th className="py-4 px-4 text-center w-16"></th>
                                        <th className="py-4 px-4 text-center w-28">Tipo</th>
                                        {pokedexViewMode === 'shiny' ? (
                                          <th className="py-4 px-4 text-center w-36">
                                            <div className="inline-flex items-center justify-center gap-1.5 mx-auto text-amber-400">
                                              <Sparkles size={14} className="shrink-0" />
                                              <span>Shiny</span>
                                            </div>
                                          </th>
                                        ) : (
                                          <>
                                            <th className="py-4 px-4 text-center w-32">
                                              <div className="inline-flex items-center justify-center gap-1.5 mx-auto">
                                                <svg className="w-4 h-4 text-blue-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                  <circle cx="10" cy="14" r="5" />
                                                  <path d="M15 9l5-5" />
                                                  <path d="M16 4h4v4" />
                                                </svg>
                                                <span>Masculino</span>
                                              </div>
                                            </th>
                                            <th className="py-4 px-4 text-center w-32">
                                              <div className="inline-flex items-center justify-center gap-1.5 mx-auto">
                                                <svg className="w-4 h-4 text-pink-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                  <circle cx="12" cy="9" r="5" />
                                                  <path d="M12 14v7" />
                                                  <path d="M9 18h6" />
                                                </svg>
                                                <span>Feminino</span>
                                              </div>
                                            </th>
                                            <th className="py-4 px-4 text-center w-32">
                                              <div className="inline-flex items-center justify-center gap-1.5 mx-auto">
                                                <svg className="w-4 h-4 text-purple-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                  <circle cx="12" cy="12" r="6" />
                                                  <circle cx="12" cy="12" r="2" />
                                                </svg>
                                                <span>Sem Gênero</span>
                                              </div>
                                            </th>
                                          </>
                                        )}
                                        <th className="py-4 px-4 text-center w-32">Ações</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-outline-variant/15 text-xs text-text-high">
                                      {filteredPokemons.map((p, pIdx) => {
                                        const isFullyCaught = pokedexViewMode === 'shiny'
                                          ? !!p.isShinyCaught
                                          : (p.isExtraForm || (
                                              (!p.hasMale || p.isMaleCaught) &&
                                              (!p.hasFemale || p.isFemaleCaught) &&
                                              (!p.hasGenderless || p.isGenderlessCaught)
                                            ));
                                        return (
                                          <tr
                                            key={p.id}
                                            className={`transition-all group/row border-l-4 ${
                                              isFullyCaught
                                                ? 'bg-[#0f2d21] hover:bg-[#143d2c] border-l-emerald-400 [.light_&]:bg-emerald-500/15 [.light_&]:hover:bg-emerald-500/25 [.light_&]:border-l-emerald-500'
                                                : 'bg-[#2d1212] hover:bg-[#3d1818] border-l-red-500 [.light_&]:bg-red-500/10 [.light_&]:hover:bg-red-500/20 [.light_&]:border-l-red-500'
                                            }`}
                                          >
                                            {/* ID / Num */}
                                            <td className="py-3 px-4 font-mono font-bold text-text-muted/65 select-none">
                                              #{p.num}
                                            </td>
                                            {/* Sprite */}
                                            <td className="py-1 px-4 text-center w-24 min-w-[96px]">
                                              <div className="w-20 h-20 flex items-center justify-center relative mx-auto">
                                                {getPokemonSpriteUrl(p, pokedexViewMode === 'shiny') ? (
                                                  <img
                                                    src={getPokemonSpriteUrl(p, pokedexViewMode === 'shiny')!}
                                                    alt={p.name}
                                                    referrerPolicy="no-referrer"
                                                    className="w-20 h-20 object-contain z-10"
                                                    onError={(e) => handleSpriteError(e.currentTarget, p, pokedexViewMode === 'shiny')}
                                                  />
                                                ) : null}
                                                <div className={`fallback-icon absolute inset-0 flex items-center justify-center ${getPokemonSpriteUrl(p, pokedexViewMode === 'shiny') ? 'hidden' : ''}`}>
                                                  <svg className="w-7 h-7 text-text-muted/20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <circle cx="12" cy="12" r="10" />
                                                    <line x1="2" y1="12" x2="22" y2="12" />
                                                    <circle cx="12" cy="12" r="3" fill="currentColor" className="text-bg-surface-low" />
                                                  </svg>
                                                </div>
                                              </div>
                                            </td>
                                            {/* Name */}
                                            <td className={`py-3 px-4 font-semibold text-sm transition-colors ${
                                              isFullyCaught
                                                ? 'text-emerald-400 font-bold [.light_&]:text-emerald-800'
                                                : 'text-red-400 font-bold [.light_&]:text-red-800'
                                            }`}>
                                              {p.name}
                                            </td>
                                            {/* Legendário/Mítico Column */}
                                            <td className="py-3 px-4 text-center w-16">
                                              <div className="flex items-center justify-center min-h-[24px]">
                                                {p.isLegendary && (
                                                  <div className="w-6 h-6 rounded-full bg-amber-500/15 border border-amber-500 text-amber-500 font-black flex items-center justify-center text-[10px] shadow-[0_0_8px_rgba(245,158,11,0.25)] select-none shrink-0" title="Lendário">
                                                    L
                                                  </div>
                                                )}
                                                {p.isMythical && (
                                                  <div className="w-6 h-6 rounded-full bg-purple-500/15 border border-purple-500 text-purple-500 font-black flex items-center justify-center text-[10px] shadow-[0_0_8px_rgba(168,85,247,0.25)] select-none shrink-0" title="Mítico">
                                                    M
                                                  </div>
                                                )}
                                              </div>
                                            </td>
                                            {/* Tipo Column */}
                                            <td className="py-3 px-4 text-center w-28">
                                              <div className="flex items-center justify-center gap-1.5 min-h-[24px]">
                                                {p.type1 && (
                                                  <img
                                                    src={`https://raw.githubusercontent.com/armindoneto/nocturne/main/pokedex/${p.type1.toLowerCase()}.png`}
                                                    alt={p.type1}
                                                    title={p.type1}
                                                    referrerPolicy="no-referrer"
                                                    className="w-6 h-6 object-contain shrink-0 animate-fade-in"
                                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                  />
                                                )}
                                                {p.type2 && (
                                                  <img
                                                    src={`https://raw.githubusercontent.com/armindoneto/nocturne/main/pokedex/${p.type2.toLowerCase()}.png`}
                                                    alt={p.type2}
                                                    title={p.type2}
                                                    referrerPolicy="no-referrer"
                                                    className="w-6 h-6 object-contain shrink-0 animate-fade-in"
                                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                  />
                                                )}
                                              </div>
                                            </td>
                                            {pokedexViewMode === 'shiny' ? (
                                              /* Shiny Catch Checkbox */
                                              <td className="py-3 px-4 text-center">
                                                <div className="flex justify-center">
                                                  <button
                                                    type="button"
                                                    onClick={() => handleTogglePokemonCatch(gen.id, p.id, 'shiny')}
                                                    className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer select-none relative ${
                                                      p.isShinyCaught
                                                        ? 'bg-amber-500/90 border-amber-400 text-black shadow-[0_0_12px_rgba(245,158,11,0.55)] hover:scale-105 active:scale-95'
                                                        : 'border-amber-500/35 bg-amber-500/5 hover:bg-amber-500/20 hover:border-amber-400/80 text-amber-400/60 hover:scale-105 active:scale-95'
                                                    }`}
                                                    title={p.isShinyCaught ? 'Marcado como pego (Shiny)' : 'Marcar como pego (Shiny)'}
                                                  >
                                                    <Sparkles className={`w-4.5 h-4.5 transition-colors ${p.isShinyCaught ? 'text-black' : 'text-amber-400'}`} />
                                                    {p.isShinyCaught && (
                                                      <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full flex items-center justify-center text-white border border-bg-surface-low shadow-md">
                                                        <Check size={9} strokeWidth={4} />
                                                      </div>
                                                    )}
                                                  </button>
                                                </div>
                                              </td>
                                            ) : (
                                              <>
                                                {/* Male Catch Checkbox */}
                                                <td className="py-3 px-4 text-center">
                                                  <div className="flex justify-center">
                                                    <button
                                                      type="button"
                                                      onClick={() => handleTogglePokemonCatch(gen.id, p.id, 'male')}
                                                      disabled={!p.hasMale}
                                                      className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer select-none relative ${
                                                        !p.hasMale
                                                          ? 'border-neutral-900 bg-neutral-950/10 text-neutral-800/20 cursor-not-allowed opacity-15'
                                                          : p.isMaleCaught
                                                          ? 'bg-blue-600/90 border-blue-400 text-white shadow-[0_0_12px_rgba(59,130,246,0.55)] hover:scale-105 active:scale-95'
                                                          : 'border-blue-500/35 bg-blue-500/5 hover:bg-blue-500/20 hover:border-blue-400/80 text-blue-400/60 hover:scale-105 active:scale-95'
                                                      }`}
                                                      title={p.hasMale ? (p.isMaleCaught ? 'Marcado como pego (Masculino)' : 'Marcar como pego (Masculino)') : 'Gênero indisponível'}
                                                    >
                                                      {p.hasMale ? (
                                                        <>
                                                          <svg className={`w-4.5 h-4.5 transition-colors ${p.isMaleCaught ? 'text-white' : 'text-blue-400'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={p.isMaleCaught ? "3" : "2.5"} strokeLinecap="round" strokeLinejoin="round">
                                                            <circle cx="10" cy="14" r="5" />
                                                            <path d="M15 9l5-5" />
                                                            <path d="M16 4h4v4" />
                                                          </svg>
                                                          {p.isMaleCaught && (
                                                            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full flex items-center justify-center text-white border border-bg-surface-low shadow-md">
                                                              <Check size={9} strokeWidth={4} />
                                                            </div>
                                                          )}
                                                        </>
                                                      ) : (
                                                        <span className="text-neutral-700/40 text-xs">-</span>
                                                      )}
                                                    </button>
                                                  </div>
                                                </td>
                                                {/* Female Catch Checkbox */}
                                                <td className="py-3 px-4 text-center">
                                                  <div className="flex justify-center">
                                                    <button
                                                      type="button"
                                                      onClick={() => handleTogglePokemonCatch(gen.id, p.id, 'female')}
                                                      disabled={!p.hasFemale}
                                                      className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer select-none relative ${
                                                        !p.hasFemale
                                                          ? 'border-neutral-900 bg-neutral-950/10 text-neutral-800/20 cursor-not-allowed opacity-15'
                                                          : p.isFemaleCaught
                                                          ? 'bg-pink-600/90 border-pink-400 text-white shadow-[0_0_12px_rgba(236,72,153,0.55)] hover:scale-105 active:scale-95'
                                                          : 'border-pink-500/35 bg-pink-500/5 hover:bg-pink-500/20 hover:border-pink-400/80 text-pink-400/60 hover:scale-105 active:scale-95'
                                                      }`}
                                                      title={p.hasFemale ? (p.isFemaleCaught ? 'Marcado como pego (Feminino)' : 'Marcar como pego (Feminino)') : 'Gênero indisponível'}
                                                    >
                                                      {p.hasFemale ? (
                                                        <>
                                                          <svg className={`w-4.5 h-4.5 transition-colors ${p.isFemaleCaught ? 'text-white' : 'text-pink-400'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={p.isFemaleCaught ? "3" : "2.5"} strokeLinecap="round" strokeLinejoin="round">
                                                            <circle cx="12" cy="9" r="5" />
                                                            <path d="M12 14v7" />
                                                            <path d="M9 18h6" />
                                                          </svg>
                                                          {p.isFemaleCaught && (
                                                            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full flex items-center justify-center text-white border border-bg-surface-low shadow-md">
                                                              <Check size={9} strokeWidth={4} />
                                                            </div>
                                                          )}
                                                        </>
                                                      ) : (
                                                        <span className="text-neutral-700/40 text-xs">-</span>
                                                      )}
                                                    </button>
                                                  </div>
                                                </td>
                                                {/* Genderless Catch Checkbox */}
                                                <td className="py-3 px-4 text-center">
                                                  <div className="flex justify-center">
                                                    <button
                                                      type="button"
                                                      onClick={() => handleTogglePokemonCatch(gen.id, p.id, 'genderless')}
                                                      disabled={!p.hasGenderless}
                                                      className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer select-none relative ${
                                                        !p.hasGenderless
                                                          ? 'border-neutral-900 bg-neutral-950/10 text-neutral-800/20 cursor-not-allowed opacity-15'
                                                          : p.isGenderlessCaught
                                                          ? 'bg-purple-600/90 border-purple-400 text-white shadow-[0_0_12px_rgba(168,85,247,0.55)] hover:scale-105 active:scale-95'
                                                          : 'border-purple-500/35 bg-purple-500/5 hover:bg-purple-500/20 hover:border-purple-400/80 text-purple-400/60 hover:scale-105 active:scale-95'
                                                      }`}
                                                      title={p.hasGenderless ? (p.isGenderlessCaught ? 'Marcado como pego (Sem Gênero)' : 'Marcar como pego (Sem Gênero)') : 'Disponível apenas para espécies sem gênero'}
                                                    >
                                                      {p.hasGenderless ? (
                                                        <>
                                                          <svg className={`w-4.5 h-4.5 transition-colors ${p.isGenderlessCaught ? 'text-white' : 'text-purple-400'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={p.isGenderlessCaught ? "3" : "2.5"} strokeLinecap="round" strokeLinejoin="round">
                                                            <circle cx="12" cy="12" r="6" />
                                                            <circle cx="12" cy="12" r="2" />
                                                          </svg>
                                                          {p.isGenderlessCaught && (
                                                            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full flex items-center justify-center text-white border border-bg-surface-low shadow-md">
                                                              <Check size={9} strokeWidth={4} />
                                                            </div>
                                                          )}
                                                        </>
                                                      ) : (
                                                        <span className="text-neutral-700/40 text-xs">-</span>
                                                      )}
                                                    </button>
                                                  </div>
                                                </td>
                                              </>
                                            )}
                                            {/* Actions */}
                                            <td className="py-3 px-4 text-center">
                                              <div className="flex items-center justify-center gap-1.5">
                                                <button
                                                  type="button"
                                                  onClick={() => handleMovePokemon(gen.id, p.id, 'up')}
                                                  disabled={pIdx === 0}
                                                  className={`text-text-muted hover:text-white transition-all flex items-center justify-center w-6 h-6 bg-bg-surface-med/15 hover:bg-bg-surface-med/40 rounded-lg cursor-pointer border border-outline-variant/15 hover:border-outline-variant/30 ${
                                                    pIdx === 0 ? 'pointer-events-none opacity-25' : 'opacity-100'
                                                  }`}
                                                  title="Mover para Cima"
                                                >
                                                  <ArrowUp size={12} />
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => handleMovePokemon(gen.id, p.id, 'down')}
                                                  disabled={pIdx === filteredPokemons.length - 1}
                                                  className={`text-text-muted hover:text-white transition-all flex items-center justify-center w-6 h-6 bg-bg-surface-med/15 hover:bg-bg-surface-med/40 rounded-lg cursor-pointer border border-outline-variant/15 hover:border-outline-variant/30 ${
                                                    pIdx === filteredPokemons.length - 1 ? 'pointer-events-none opacity-25' : 'opacity-100'
                                                  }`}
                                                  title="Mover para Baixo"
                                                >
                                                  <ArrowDown size={12} />
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => handleStartEditPokemon(gen.id, p)}
                                                  className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition-all flex items-center justify-center w-6 h-6 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg cursor-pointer border border-blue-500/15 hover:border-blue-500/30"
                                                  title="Editar Pokémon"
                                                >
                                                  <Edit2 size={12} />
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => handleDeletePokemon(gen.id, p.id, p.name)}
                                                  className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition-all flex items-center justify-center w-6 h-6 bg-red-500/10 hover:bg-red-500/20 rounded-lg cursor-pointer border border-red-500/15 hover:border-red-500/30"
                                                  title="Remover Pokémon"
                                                >
                                                  <Trash2 size={12} />
                                                </button>
                                              </div>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>

                                {/* Mobile Cards List (Scroll-free presentation) */}
                                <div className="block md:hidden space-y-4">
                                  {filteredPokemons.map((p, pIdx) => {
                                    const isFullyCaught = pokedexViewMode === 'shiny'
                                      ? !!p.isShinyCaught
                                      : (p.isExtraForm || (
                                          (!p.hasMale || p.isMaleCaught) &&
                                          (!p.hasFemale || p.isFemaleCaught) &&
                                          (!p.hasGenderless || p.isGenderlessCaught)
                                        ));
                                    return (
                                      <div
                                        key={p.id}
                                        className={`p-4 rounded-2xl border transition-all flex flex-col gap-3.5 relative ${
                                          isFullyCaught
                                            ? 'bg-[#0f2d21] border-emerald-500/30 [.light_&]:bg-emerald-500/10 [.light_&]:border-emerald-500/20'
                                            : 'bg-[#1e0a0a] border-red-500/20 [.light_&]:bg-red-500/5 [.light_&]:border-red-500/10'
                                        }`}
                                      >
                                        {/* Header Row: #Num, Name, and Badges (L, M) */}
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-[10px] font-mono font-bold text-text-muted/65 select-none">#{p.num}</span>
                                            <span className={`font-bold text-sm ${
                                              isFullyCaught
                                                ? 'text-emerald-400 [.light_&]:text-emerald-800'
                                                : 'text-red-400 [.light_&]:text-red-800'
                                            }`}>
                                              {p.name}
                                            </span>
                                            {p.isLegendary && (
                                              <span className="w-5 h-5 rounded-full bg-amber-500/15 border border-amber-500 text-amber-500 font-black flex items-center justify-center text-[9px] shadow-[0_0_8px_rgba(245,158,11,0.25)] select-none shrink-0" title="Lendário">L</span>
                                            )}
                                            {p.isMythical && (
                                              <span className="w-5 h-5 rounded-full bg-purple-500/15 border border-purple-500 text-purple-500 font-black flex items-center justify-center text-[9px] shadow-[0_0_8px_rgba(168,85,247,0.25)] select-none shrink-0" title="Mítico">M</span>
                                            )}
                                          </div>

                                          {/* Types */}
                                          <div className="flex items-center gap-1 shrink-0">
                                            {p.type1 && (
                                              <img
                                                src={`https://raw.githubusercontent.com/armindoneto/nocturne/main/pokedex/${p.type1.toLowerCase()}.png`}
                                                alt={p.type1}
                                                title={p.type1}
                                                referrerPolicy="no-referrer"
                                                className="w-5 h-5 object-contain"
                                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                              />
                                            )}
                                            {p.type2 && (
                                              <img
                                                src={`https://raw.githubusercontent.com/armindoneto/nocturne/main/pokedex/${p.type2.toLowerCase()}.png`}
                                                alt={p.type2}
                                                title={p.type2}
                                                referrerPolicy="no-referrer"
                                                className="w-5 h-5 object-contain"
                                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                              />
                                            )}
                                          </div>
                                        </div>

                                        {/* Mid Row: Sprite and Checkboxes */}
                                        <div className="flex items-center gap-4">
                                          {/* Sprite */}
                                          <div className="w-16 h-16 flex items-center justify-center shrink-0 relative">
                                            {getPokemonSpriteUrl(p, pokedexViewMode === 'shiny') ? (
                                              <img
                                                src={getPokemonSpriteUrl(p, pokedexViewMode === 'shiny')!}
                                                alt={p.name}
                                                referrerPolicy="no-referrer"
                                                className="w-16 h-16 object-contain z-10 animate-fade-in"
                                                onError={(e) => handleSpriteError(e.currentTarget, p, pokedexViewMode === 'shiny')}
                                              />
                                            ) : null}
                                            <div className={`fallback-icon absolute inset-0 flex items-center justify-center ${getPokemonSpriteUrl(p, pokedexViewMode === 'shiny') ? 'hidden' : ''}`}>
                                              <svg className="w-5 h-5 text-text-muted/20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <circle cx="12" cy="12" r="10" />
                                                <line x1="2" y1="12" x2="22" y2="12" />
                                              </svg>
                                            </div>
                                          </div>

                                          {/* Catch States Buttons */}
                                          {pokedexViewMode === 'shiny' ? (
                                            <div className="flex-1 flex justify-center">
                                              {/* Shiny Catch */}
                                              <button
                                                type="button"
                                                onClick={() => handleTogglePokemonCatch(gen.id, p.id, 'shiny')}
                                                className={`py-2 px-6 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer select-none relative ${
                                                  p.isShinyCaught
                                                    ? 'bg-amber-500/90 border-amber-400 text-black shadow-[0_0_8px_rgba(245,158,11,0.4)] hover:scale-105 active:scale-95'
                                                    : 'border-amber-500/25 bg-amber-500/5 text-amber-400/60 hover:scale-105 active:scale-95'
                                                }`}
                                                title={p.isShinyCaught ? 'Marcado como pego (Shiny)' : 'Marcar como pego (Shiny)'}
                                              >
                                                <Sparkles className={`w-4 h-4 ${p.isShinyCaught ? 'text-black' : 'text-amber-400'}`} />
                                                <span className="text-[10px] font-black uppercase tracking-wider">Shiny</span>
                                                {p.isShinyCaught && (
                                                  <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full flex items-center justify-center text-white border border-bg-surface-low shadow-sm">
                                                    <Check size={8} strokeWidth={4} />
                                                  </div>
                                                )}
                                              </button>
                                            </div>
                                          ) : (
                                            <div className="flex-1 grid grid-cols-3 gap-1.5">
                                            {/* Male Catch */}
                                            <button
                                              type="button"
                                              onClick={() => handleTogglePokemonCatch(gen.id, p.id, 'male')}
                                              disabled={!p.hasMale}
                                              className={`py-2 px-1 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer select-none relative ${
                                                !p.hasMale
                                                  ? 'border-neutral-900 bg-neutral-950/10 text-neutral-800/10 opacity-15 cursor-not-allowed'
                                                  : p.isMaleCaught
                                                  ? 'bg-blue-600/90 border-blue-400 text-white shadow-[0_0_8px_rgba(59,130,246,0.4)] hover:scale-105 active:scale-95'
                                                  : 'border-blue-500/25 bg-blue-500/5 text-blue-400/60 hover:scale-105 active:scale-95'
                                              }`}
                                              title={p.hasMale ? (p.isMaleCaught ? 'Marcado como pego (Masculino)' : 'Marcar como pego (Masculino)') : 'Indisponível'}
                                            >
                                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                <circle cx="10" cy="14" r="5" />
                                                <path d="M15 9l5-5" />
                                                <path d="M16 4h4v4" />
                                              </svg>
                                              <span className="text-[8px] font-black uppercase tracking-wider">Masc</span>
                                              {p.isMaleCaught && (
                                                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full flex items-center justify-center text-white border border-bg-surface-low shadow-sm">
                                                  <Check size={8} strokeWidth={4} />
                                                </div>
                                              )}
                                            </button>

                                            {/* Female Catch */}
                                            <button
                                              type="button"
                                              onClick={() => handleTogglePokemonCatch(gen.id, p.id, 'female')}
                                              disabled={!p.hasFemale}
                                              className={`py-2 px-1 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer select-none relative ${
                                                !p.hasFemale
                                                  ? 'border-neutral-900 bg-neutral-950/10 text-neutral-800/10 opacity-15 cursor-not-allowed'
                                                  : p.isFemaleCaught
                                                  ? 'bg-pink-600/90 border-pink-400 text-white shadow-[0_0_8px_rgba(236,72,153,0.4)] hover:scale-105 active:scale-95'
                                                  : 'border-pink-500/25 bg-pink-500/5 text-pink-400/60 hover:scale-105 active:scale-95'
                                              }`}
                                              title={p.hasFemale ? (p.isFemaleCaught ? 'Marcado como pego (Feminino)' : 'Marcar como pego (Feminino)') : 'Indisponível'}
                                            >
                                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                <circle cx="12" cy="9" r="5" />
                                                <path d="M12 14v7" />
                                                <path d="M9 18h6" />
                                              </svg>
                                              <span className="text-[8px] font-black uppercase tracking-wider">Fem</span>
                                              {p.isFemaleCaught && (
                                                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full flex items-center justify-center text-white border border-bg-surface-low shadow-sm">
                                                  <Check size={8} strokeWidth={4} />
                                                </div>
                                              )}
                                            </button>

                                            {/* Genderless Catch */}
                                            <button
                                              type="button"
                                              onClick={() => handleTogglePokemonCatch(gen.id, p.id, 'genderless')}
                                              disabled={!p.hasGenderless}
                                              className={`py-2 px-1 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer select-none relative ${
                                                !p.hasGenderless
                                                  ? 'border-neutral-900 bg-neutral-950/10 text-neutral-800/10 opacity-15 cursor-not-allowed'
                                                  : p.isGenderlessCaught
                                                  ? 'bg-purple-600/90 border-purple-400 text-white shadow-[0_0_8px_rgba(168,85,247,0.4)] hover:scale-105 active:scale-95'
                                                  : 'border-purple-500/25 bg-purple-500/5 text-purple-400/60 hover:scale-105 active:scale-95'
                                              }`}
                                              title={p.hasGenderless ? (p.isGenderlessCaught ? 'Marcado como pego (Sem Gênero)' : 'Marcar como pego (Sem Gênero)') : 'Indisponível'}
                                            >
                                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                <circle cx="12" cy="12" r="6" />
                                                <circle cx="12" cy="12" r="2" />
                                              </svg>
                                              <span className="text-[8px] font-black uppercase tracking-wider">S/ Gên</span>
                                              {p.isGenderlessCaught && (
                                                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full flex items-center justify-center text-white border border-bg-surface-low shadow-sm">
                                                  <Check size={8} strokeWidth={4} />
                                                </div>
                                              )}
                                            </button>
                                          </div>
                                        )}
                                        </div>

                                        {/* Actions Row */}
                                        <div className="flex items-center justify-between pt-2 border-t border-outline-variant/15">
                                          <div className="flex items-center gap-1.5">
                                            <button
                                              type="button"
                                              onClick={() => handleMovePokemon(gen.id, p.id, 'up')}
                                              disabled={pIdx === 0}
                                              className={`text-text-muted hover:text-white transition-all flex items-center justify-center w-7 h-7 bg-bg-surface-med/15 rounded-lg border border-outline-variant/15 ${
                                                pIdx === 0 ? 'pointer-events-none opacity-20' : 'cursor-pointer'
                                              }`}
                                              title="Mover para Cima"
                                            >
                                              <ArrowUp size={12} />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => handleMovePokemon(gen.id, p.id, 'down')}
                                              disabled={pIdx === filteredPokemons.length - 1}
                                              className={`text-text-muted hover:text-white transition-all flex items-center justify-center w-7 h-7 bg-bg-surface-med/15 rounded-lg border border-outline-variant/15 ${
                                                pIdx === filteredPokemons.length - 1 ? 'pointer-events-none opacity-20' : 'cursor-pointer'
                                              }`}
                                              title="Mover para Baixo"
                                            >
                                              <ArrowDown size={12} />
                                            </button>
                                          </div>

                                          <div className="flex items-center gap-1.5">
                                            <button
                                              type="button"
                                              onClick={() => handleStartEditPokemon(gen.id, p)}
                                              className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition-all flex items-center justify-center w-7 h-7 bg-blue-500/10 rounded-lg cursor-pointer border border-blue-500/15 hover:border-blue-500/30"
                                              title="Editar Pokémon"
                                            >
                                              <Edit2 size={12} />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => handleDeletePokemon(gen.id, p.id, p.name)}
                                              className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition-all flex items-center justify-center w-7 h-7 bg-red-500/10 rounded-lg cursor-pointer border border-red-500/15 hover:border-red-500/30"
                                              title="Remover Pokémon"
                                            >
                                              <Trash2 size={12} />
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>

            {/* Add Pokémon Modal */}
            <AnimatePresence>
              {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                  {/* Backdrop */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setIsAddModalOpen(false)}
                    className="fixed inset-0 bg-black/80 backdrop-blur-md"
                  />
                  
                  {/* Container */}
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="bg-bg-surface-low border border-outline-variant/60 rounded-3xl p-6 shadow-2xl max-w-md w-full relative z-10 space-y-5 overflow-hidden text-left"
                  >
                    <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
                      <h3 className="font-display font-black text-sm text-white uppercase tracking-wider flex items-center gap-2">
                        <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                        Adicionar Pokémon
                      </h3>
                      <button
                        onClick={() => setIsAddModalOpen(false)}
                        className="text-text-muted hover:text-white transition-all w-8 h-8 rounded-lg flex items-center justify-center hover:bg-bg-surface-med/40"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    <form onSubmit={(e) => handleAddPokemon(addPokemonGenId, e)} className="space-y-4">
                      {/* Generation Selector */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-text-muted font-display block">Geração Destino</label>
                        <select
                          value={addPokemonGenId}
                          onChange={(e) => setAddPokemonGenId(e.target.value)}
                          className="w-full bg-bg-surface-med/50 border border-outline-variant/30 focus:border-red-500 focus:outline-none rounded-xl px-3 py-2.5 text-xs text-white transition-all cursor-pointer"
                        >
                          {pokemonGenerations.map(gen => (
                            <option key={gen.id} value={gen.id} className="bg-bg-surface-low text-white">
                              {gen.name} ({genRegions[gen.id] || ''})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        {/* Number */}
                        <div className="col-span-1 space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-wider text-text-muted font-display block">Nº</label>
                          <input
                            type="text"
                            placeholder="000"
                            maxLength={8}
                            value={newPokemonNum}
                            onChange={(e) => setNewPokemonNum(e.target.value)}
                            className="w-full bg-bg-surface-med/50 border border-outline-variant/30 focus:border-red-500 focus:outline-none rounded-xl px-3 py-2.5 text-xs text-white transition-all text-center font-mono"
                          />
                        </div>

                        {/* Name */}
                        <div className="col-span-2 space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-wider text-text-muted font-display block">Nome do Pokémon</label>
                          <input
                            type="text"
                            required
                            placeholder="Ex: Chikorita"
                            maxLength={40}
                            value={newPokemonName}
                            onChange={(e) => setNewPokemonName(e.target.value)}
                            className="w-full bg-bg-surface-med/50 border border-outline-variant/30 focus:border-red-500 focus:outline-none rounded-xl px-3 py-2.5 text-xs text-white transition-all"
                          />
                        </div>
                      </div>

                      {/* Sprite ID */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-text-muted font-display block">ID do Sprite</label>
                        <input
                          type="text"
                          placeholder="Ex: 003 ou 003f"
                          maxLength={30}
                          value={newPokemonSpriteId}
                          onChange={(e) => setNewPokemonSpriteId(e.target.value)}
                          className="w-full bg-bg-surface-med/50 border border-outline-variant/30 focus:border-red-500 focus:outline-none rounded-xl px-3 py-2.5 text-xs text-white transition-all font-mono"
                        />
                      </div>

                      {/* Types (Tipos) */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-wider text-text-muted font-display block">Tipo 1 (Obrigatório)</label>
                          <select
                            value={newPokemonType1}
                            onChange={(e) => setNewPokemonType1(e.target.value)}
                            className="w-full bg-bg-surface-med/50 border border-outline-variant/30 focus:border-red-500 focus:outline-none rounded-xl px-3 py-2 text-xs text-white transition-all cursor-pointer"
                          >
                            {POKEMON_TYPES.map(t => (
                              <option key={t} value={t} className="bg-bg-surface-low text-white">{t}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-wider text-text-muted font-display block">Tipo 2 (Opcional)</label>
                          <select
                            value={newPokemonType2}
                            onChange={(e) => setNewPokemonType2(e.target.value)}
                            className="w-full bg-bg-surface-med/50 border border-outline-variant/30 focus:border-red-500 focus:outline-none rounded-xl px-3 py-2 text-xs text-white transition-all cursor-pointer"
                          >
                            <option value="" className="bg-bg-surface-low text-text-muted">Nenhum</option>
                            {POKEMON_TYPES.map(t => (
                              <option key={t} value={t} className="bg-bg-surface-low text-white">{t}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Attributes (Legendary, Mythical, Extra Form) */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-text-muted font-display block">Atributos Especiais</label>
                        <div className="grid grid-cols-3 gap-2 bg-bg-surface-med/20 p-2 rounded-2xl border border-outline-variant/20">
                          <button
                            type="button"
                            onClick={() => {
                              const val = !newPokemonIsLegendary;
                              setNewPokemonIsLegendary(val);
                              if (val) setNewPokemonIsMythical(false);
                            }}
                            className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border flex items-center justify-center gap-1 cursor-pointer ${
                              newPokemonIsLegendary
                                ? 'bg-amber-500/15 border-amber-500/50 text-amber-300'
                                : 'bg-transparent border-transparent text-text-muted/40 hover:text-text-muted/70'
                            }`}
                          >
                            Lendário
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const val = !newPokemonIsMythical;
                              setNewPokemonIsMythical(val);
                              if (val) setNewPokemonIsLegendary(false);
                            }}
                            className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border flex items-center justify-center gap-1 cursor-pointer ${
                              newPokemonIsMythical
                                ? 'bg-purple-500/15 border-purple-500/50 text-purple-300'
                                : 'bg-transparent border-transparent text-text-muted/40 hover:text-text-muted/70'
                            }`}
                          >
                            Mítico
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const val = !newPokemonIsExtraForm;
                              setNewPokemonIsExtraForm(val);
                              if (val) {
                                setNewPokemonHasMale(false);
                                setNewPokemonHasFemale(false);
                                setNewPokemonHasGenderless(false);
                              }
                            }}
                            className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border flex items-center justify-center gap-1 cursor-pointer ${
                              newPokemonIsExtraForm
                                ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
                                : 'bg-transparent border-transparent text-text-muted/40 hover:text-text-muted/70'
                            }`}
                          >
                            Extra Form
                          </button>
                        </div>
                      </div>

                      {/* Genders Available */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-text-muted font-display block">Gêneros Disponíveis</label>
                        {newPokemonIsExtraForm ? (
                          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3 text-[10px] text-emerald-400 font-semibold leading-normal">
                            ✨ Pokémon marcado como Extra Form! Ele será considerado pego automaticamente e não terá distinção de gênero.
                          </div>
                        ) : (
                          <div className="grid grid-cols-3 gap-2 bg-bg-surface-med/20 p-2 rounded-2xl border border-outline-variant/20">
                            <button
                              type="button"
                              onClick={() => {
                                const val = !newPokemonHasMale;
                                setNewPokemonHasMale(val);
                                if (val) setNewPokemonHasGenderless(false);
                              }}
                              className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border flex items-center justify-center gap-1 cursor-pointer ${
                                newPokemonHasMale
                                  ? 'bg-blue-500/15 border-blue-500/50 text-blue-300'
                                  : 'bg-transparent border-transparent text-text-muted/40 hover:text-text-muted/70'
                              }`}
                            >
                              ♂ Masculino
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const val = !newPokemonHasFemale;
                                setNewPokemonHasFemale(val);
                                if (val) setNewPokemonHasGenderless(false);
                              }}
                              className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border flex items-center justify-center gap-1 cursor-pointer ${
                                newPokemonHasFemale
                                  ? 'bg-pink-500/15 border-pink-500/50 text-pink-300'
                                  : 'bg-transparent border-transparent text-text-muted/40 hover:text-text-muted/70'
                              }`}
                            >
                              ♀ Feminino
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const val = !newPokemonHasGenderless;
                                setNewPokemonHasGenderless(val);
                                if (val) {
                                  setNewPokemonHasMale(false);
                                  setNewPokemonHasFemale(false);
                                }
                              }}
                              className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border flex items-center justify-center gap-1 cursor-pointer ${
                                newPokemonHasGenderless
                                  ? 'bg-purple-500/15 border-purple-500/50 text-purple-300'
                                  : 'bg-transparent border-transparent text-text-muted/40 hover:text-text-muted/70'
                              }`}
                            >
                              - Sem Gên
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Footer actions */}
                      <div className="flex items-center gap-3 pt-3 border-t border-outline-variant/15">
                        <button
                          type="button"
                          onClick={() => setIsAddModalOpen(false)}
                          className="flex-1 py-2.5 bg-bg-surface-med/60 hover:bg-bg-surface-med border border-outline-variant/30 hover:border-outline-variant/50 text-white font-bold text-xs uppercase tracking-wider font-display rounded-xl transition-all cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white font-black text-xs uppercase tracking-wider font-display rounded-xl shadow-lg shadow-red-500/10 transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Plus size={14} strokeWidth={2.5} /> Adicionar
                        </button>
                      </div>
                    </form>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>



            {/* Edit Pokémon Modal */}
            <AnimatePresence>
              {editingPokemon && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                  {/* Backdrop */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setEditingPokemon(null)}
                    className="fixed inset-0 bg-black/80 backdrop-blur-md"
                  />
                  
                  {/* Container */}
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="bg-bg-surface-low border border-outline-variant/60 rounded-3xl p-6 shadow-2xl max-w-md w-full relative z-10 space-y-5 overflow-hidden text-left"
                  >
                    <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
                      <h3 className="font-display font-black text-sm text-white uppercase tracking-wider flex items-center gap-2">
                        <span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                        Editar Pokémon
                      </h3>
                      <button
                        onClick={() => setEditingPokemon(null)}
                        className="text-text-muted hover:text-white transition-all w-8 h-8 rounded-lg flex items-center justify-center hover:bg-bg-surface-med/40"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    <form onSubmit={handleSaveEditPokemon} className="space-y-4">
                      <div className="grid grid-cols-3 gap-3">
                        {/* Number */}
                        <div className="col-span-1 space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-wider text-text-muted font-display block">Nº</label>
                          <input
                            type="text"
                            placeholder="000"
                            maxLength={8}
                            value={editPokemonNum}
                            onChange={(e) => setEditPokemonNum(e.target.value)}
                            className="w-full bg-bg-surface-med/50 border border-outline-variant/30 focus:border-blue-500 focus:outline-none rounded-xl px-3 py-2.5 text-xs text-white transition-all text-center font-mono"
                          />
                        </div>

                        {/* Name */}
                        <div className="col-span-2 space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-wider text-text-muted font-display block">Nome do Pokémon</label>
                          <input
                            type="text"
                            required
                            placeholder="Ex: Chikorita"
                            maxLength={40}
                            value={editPokemonName}
                            onChange={(e) => setEditPokemonName(e.target.value)}
                            className="w-full bg-bg-surface-med/50 border border-outline-variant/30 focus:border-blue-500 focus:outline-none rounded-xl px-3 py-2.5 text-xs text-white transition-all"
                          />
                        </div>
                      </div>

                      {/* Sprite ID */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-text-muted font-display block">ID do Sprite</label>
                        <input
                          type="text"
                          placeholder="Ex: 003 ou 003f"
                          maxLength={30}
                          value={editPokemonSpriteId}
                          onChange={(e) => setEditPokemonSpriteId(e.target.value)}
                          className="w-full bg-bg-surface-med/50 border border-outline-variant/30 focus:border-blue-500 focus:outline-none rounded-xl px-3 py-2.5 text-xs text-white transition-all font-mono"
                        />
                      </div>

                      {/* Types (Tipos) */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-wider text-text-muted font-display block">Tipo 1 (Obrigatório)</label>
                          <select
                            value={editPokemonType1}
                            onChange={(e) => setEditPokemonType1(e.target.value)}
                            className="w-full bg-bg-surface-med/50 border border-outline-variant/30 focus:border-blue-500 focus:outline-none rounded-xl px-3 py-2 text-xs text-white transition-all cursor-pointer"
                          >
                            {POKEMON_TYPES.map(t => (
                              <option key={t} value={t} className="bg-bg-surface-low text-white">{t}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-wider text-text-muted font-display block">Tipo 2 (Opcional)</label>
                          <select
                            value={editPokemonType2}
                            onChange={(e) => setEditPokemonType2(e.target.value)}
                            className="w-full bg-bg-surface-med/50 border border-outline-variant/30 focus:border-blue-500 focus:outline-none rounded-xl px-3 py-2 text-xs text-white transition-all cursor-pointer"
                          >
                            <option value="" className="bg-bg-surface-low text-text-muted">Nenhum</option>
                            {POKEMON_TYPES.map(t => (
                              <option key={t} value={t} className="bg-bg-surface-low text-white">{t}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Attributes (Legendary, Mythical, Extra Form) */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-text-muted font-display block">Atributos Especiais</label>
                        <div className="grid grid-cols-3 gap-2 bg-bg-surface-med/20 p-2 rounded-2xl border border-outline-variant/20">
                          <button
                            type="button"
                            onClick={() => {
                              const val = !editPokemonIsLegendary;
                              setEditPokemonIsLegendary(val);
                              if (val) setEditPokemonIsMythical(false);
                            }}
                            className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border flex items-center justify-center gap-1 cursor-pointer ${
                              editPokemonIsLegendary
                                ? 'bg-amber-500/15 border-amber-500/50 text-amber-300'
                                : 'bg-transparent border-transparent text-text-muted/40 hover:text-text-muted/70'
                            }`}
                          >
                            Lendário
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const val = !editPokemonIsMythical;
                              setEditPokemonIsMythical(val);
                              if (val) setEditPokemonIsLegendary(false);
                            }}
                            className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border flex items-center justify-center gap-1 cursor-pointer ${
                              editPokemonIsMythical
                                ? 'bg-purple-500/15 border-purple-500/50 text-purple-300'
                                : 'bg-transparent border-transparent text-text-muted/40 hover:text-text-muted/70'
                            }`}
                          >
                            Mítico
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const val = !editPokemonIsExtraForm;
                              setEditPokemonIsExtraForm(val);
                              if (val) {
                                setEditPokemonHasMale(false);
                                setEditPokemonHasFemale(false);
                                setEditPokemonHasGenderless(false);
                              }
                            }}
                            className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border flex items-center justify-center gap-1 cursor-pointer ${
                              editPokemonIsExtraForm
                                ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
                                : 'bg-transparent border-transparent text-text-muted/40 hover:text-text-muted/70'
                            }`}
                          >
                            Extra Form
                          </button>
                        </div>
                      </div>

                      {/* Genders Available */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-text-muted font-display block">Gêneros Disponíveis</label>
                        {editPokemonIsExtraForm ? (
                          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3 text-[10px] text-emerald-400 font-semibold leading-normal">
                            ✨ Pokémon marcado como Extra Form! Ele será considerado pego automaticamente e não terá distinção de gênero.
                          </div>
                        ) : (
                          <div className="grid grid-cols-3 gap-2 bg-bg-surface-med/20 p-2 rounded-2xl border border-outline-variant/20">
                            <button
                              type="button"
                              onClick={() => {
                                const val = !editPokemonHasMale;
                                setEditPokemonHasMale(val);
                                if (val) setEditPokemonHasGenderless(false);
                              }}
                              className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border flex items-center justify-center gap-1 cursor-pointer ${
                                editPokemonHasMale
                                  ? 'bg-blue-500/15 border-blue-500/50 text-blue-300'
                                  : 'bg-transparent border-transparent text-text-muted/40 hover:text-text-muted/70'
                              }`}
                            >
                              ♂ Masculino
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const val = !editPokemonHasFemale;
                                setEditPokemonHasFemale(val);
                                if (val) setEditPokemonHasGenderless(false);
                              }}
                              className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border flex items-center justify-center gap-1 cursor-pointer ${
                                editPokemonHasFemale
                                  ? 'bg-pink-500/15 border-pink-500/50 text-pink-300'
                                  : 'bg-transparent border-transparent text-text-muted/40 hover:text-text-muted/70'
                              }`}
                            >
                              ♀ Feminino
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const val = !editPokemonHasGenderless;
                                setEditPokemonHasGenderless(val);
                                if (val) {
                                  setEditPokemonHasMale(false);
                                  setEditPokemonHasFemale(false);
                                }
                              }}
                              className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border flex items-center justify-center gap-1 cursor-pointer ${
                                editPokemonHasGenderless
                                  ? 'bg-purple-500/15 border-purple-500/50 text-purple-300'
                                  : 'bg-transparent border-transparent text-text-muted/40 hover:text-text-muted/70'
                              }`}
                            >
                              - Sem Gên
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Footer actions */}
                      <div className="flex items-center gap-3 pt-3 border-t border-outline-variant/15">
                        <button
                          type="button"
                          onClick={() => setEditingPokemon(null)}
                          className="flex-1 py-2.5 bg-bg-surface-med/60 hover:bg-bg-surface-med border border-outline-variant/30 hover:border-outline-variant/50 text-white font-bold text-xs uppercase tracking-wider font-display rounded-xl transition-all cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider font-display rounded-xl shadow-lg shadow-blue-600/10 transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Check size={14} strokeWidth={2.5} /> Salvar
                        </button>
                      </div>
                    </form>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* Shiny Uncheck / Exclude Selection Modal */}
            <AnimatePresence>
              {shinyUncheckTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                  {/* Backdrop */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShinyUncheckTarget(null)}
                    className="fixed inset-0 bg-black/80 backdrop-blur-md"
                  />

                  {/* Dialog Container */}
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="bg-bg-surface-low border border-outline-variant/60 rounded-3xl p-6 shadow-2xl max-w-sm w-full relative z-10 space-y-5 text-center overflow-hidden"
                  >
                    {/* Header Icon & Pokemon Preview */}
                    <div className="flex flex-col items-center gap-2 pt-1">
                      <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.25)] relative">
                        <Sparkles size={24} />
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-mono font-bold text-text-muted/70">#{shinyUncheckTarget.pokemon.num}</span>
                        <h3 className="font-display font-black text-base text-white">{shinyUncheckTarget.pokemon.name}</h3>
                      </div>
                      <p className="text-xs text-text-muted/80 leading-relaxed px-2">
                        Como você deseja alterar a marcação deste Pokémon na Pokédex Shiny?
                      </p>
                    </div>

                    {/* Action Choices */}
                    <div className="space-y-2.5 pt-1">
                      {/* Option 1: Desmarcar Shiny */}
                      <button
                        type="button"
                        onClick={handleConfirmUncheckShiny}
                        className="w-full py-3 px-4 rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-bold text-xs uppercase tracking-wider font-display flex items-center justify-between transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5">
                          <Sparkles size={16} className="text-amber-400 group-hover:scale-110 transition-transform" />
                          <span className="text-left font-black">Desmarcar Shiny</span>
                        </div>
                        <span className="text-[10px] text-amber-400/70 font-normal normal-case">Permanecer na lista</span>
                      </button>

                      {/* Option 2: Retirar da lista */}
                      <button
                        type="button"
                        onClick={handleConfirmExcludeShiny}
                        className="w-full py-3 px-4 rounded-2xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/40 text-red-300 font-bold text-xs uppercase tracking-wider font-display flex items-center justify-between transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5">
                          <EyeOff size={16} className="text-red-400 group-hover:scale-110 transition-transform" />
                          <span className="text-left font-black">Retirar da Lista</span>
                        </div>
                        <span className="text-[10px] text-red-400/70 font-normal normal-case">Ocultar dos shinies</span>
                      </button>
                    </div>

                    {/* Cancel */}
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => setShinyUncheckTarget(null)}
                        className="w-full py-2 text-xs text-text-muted hover:text-white font-semibold transition-colors cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* Modal for Restoring Excluded Shinies */}
            <AnimatePresence>
              {isRestoreShinyModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setIsRestoreShinyModalOpen(false)}
                    className="fixed inset-0 bg-black/80 backdrop-blur-md"
                  />

                  <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="bg-bg-surface-low border border-outline-variant/60 rounded-3xl p-6 shadow-2xl max-w-md w-full relative z-10 space-y-4 overflow-hidden text-left"
                  >
                    <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
                      <h3 className="font-display font-black text-sm text-white uppercase tracking-wider flex items-center gap-2">
                        <EyeOff size={16} className="text-amber-400" />
                        Pokémons Ocultados da Lista Shiny ({excludedShiniesList.length})
                      </h3>
                      <button
                        type="button"
                        onClick={() => setIsRestoreShinyModalOpen(false)}
                        className="text-text-muted hover:text-white transition-all w-8 h-8 rounded-lg flex items-center justify-center hover:bg-bg-surface-med/40"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    {excludedShiniesList.length === 0 ? (
                      <p className="text-xs text-text-muted text-center py-6">Nenhum Pokémon foi ocultado da lista Shiny.</p>
                    ) : (
                      <>
                        <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-outline-variant/40">
                          {excludedShiniesList.map(({ genId, genName, pokemon }) => (
                            <div key={pokemon.id} className="flex items-center justify-between p-2.5 bg-bg-surface-med/30 rounded-2xl border border-outline-variant/20">
                              <div className="flex items-center gap-3">
                                <span className="text-[10px] font-mono font-bold text-text-muted/60">#{pokemon.num}</span>
                                <div>
                                  <span className="font-bold text-xs text-white block">{pokemon.name}</span>
                                  <span className="text-[9px] text-text-muted/60">{genName}</span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRestoreShinyPokemon(genId, pokemon.id, pokemon.name)}
                                className="px-2.5 py-1 bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-xl text-[10px] font-bold transition-all cursor-pointer"
                              >
                                Restaurar
                              </button>
                            </div>
                          ))}
                        </div>

                        <div className="pt-2 border-t border-outline-variant/15 flex justify-end">
                          <button
                            type="button"
                            onClick={handleRestoreAllExcludedShinies}
                            className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/35 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold transition-all cursor-pointer"
                          >
                            Restaurar Todos
                          </button>
                        </div>
                      </>
                    )}
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })()}

      {activeSubmenu === 'TO PLAY' && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6 w-full"
          id="toplay-screen-content"
        >
          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-bg-surface-low border border-outline-variant/40 rounded-3xl p-5 shadow-lg">
            <div>
              <h3 className="font-display font-black text-xs text-white uppercase tracking-wider">Backlog de Consoles</h3>
            </div>
            <form onSubmit={handleAddConsole} className="w-full sm:max-w-xs flex items-center gap-2 bg-bg-surface-med/30 p-1.5 rounded-xl border border-outline-variant/30 shadow-inner">
              <input
                type="text"
                placeholder="Nome do console..."
                value={newConsoleName}
                onChange={(e) => setNewConsoleName(e.target.value)}
                maxLength={30}
                className="flex-1 bg-transparent text-white placeholder-text-muted/60 text-xs font-semibold px-2.5 outline-none border-none focus:ring-0"
              />
              <button
                type="submit"
                className="px-3.5 py-1.5 bg-brand-primary text-black rounded-lg text-[10px] font-black uppercase tracking-wider font-display hover:bg-brand-primary/95 transition-all flex items-center gap-1 cursor-pointer"
              >
                <Plus size={12} strokeWidth={2.5} /> Adicionar
              </button>
            </form>
          </div>

          {toPlayConsoles.length === 0 ? (
            <div className="bg-bg-surface-low border border-outline-variant/40 rounded-3xl p-12 text-center max-w-md mx-auto space-y-4 shadow-lg flex flex-col items-center" id="toplay-empty-state">
              <div className="w-12 h-12 bg-brand-primary/10 rounded-xl flex items-center justify-center border border-brand-primary/20">
                <Gamepad2 size={24} className="text-brand-primary" />
              </div>
              <p className="text-xs text-text-muted leading-relaxed">Nenhum console cadastrado. Adicione um console acima para começar a gerenciar sua lista de jogos pendentes!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="toplay-consoles-grid">
              {toPlayConsoles.map(consoleItem => (
                <div key={consoleItem.id} className="bg-bg-surface-low border border-outline-variant/50 rounded-2xl p-5 shadow-lg flex flex-col space-y-4 hover:border-outline-variant transition-all" id={`console-card-${consoleItem.id}`}>
                  {/* Card Header */}
                  <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
                    <h4 className="font-display font-black text-xs text-white uppercase tracking-wider flex items-center gap-2">
                      <Gamepad2 size={14} className="text-brand-primary/80" />
                      <span>{consoleItem.name}</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => handleDeleteConsole(consoleItem.id)}
                      className="w-7 h-7 rounded-lg hover:bg-red-500/10 text-text-muted hover:text-red-400 transition-all flex items-center justify-center cursor-pointer border border-transparent hover:border-red-500/15"
                      title="Excluir console"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  {/* Add game row */}
                  <div className="flex items-center gap-2 bg-bg-surface-med/40 p-1 rounded-xl border border-outline-variant/20">
                    <input
                      type="text"
                      placeholder="Novo jogo..."
                      value={newGameNames[consoleItem.id] || ''}
                      onChange={(e) => setNewGameNames(prev => ({ ...prev, [consoleItem.id]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddGame(consoleItem.id);
                        }
                      }}
                      maxLength={60}
                      className="flex-1 bg-transparent text-white placeholder-text-muted/60 text-xs px-2 py-1 outline-none border-none focus:ring-0"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddGame(consoleItem.id)}
                      className="w-7 h-7 bg-brand-primary hover:bg-brand-primary/90 text-black rounded-lg flex items-center justify-center transition-all cursor-pointer"
                    >
                      <Plus size={13} strokeWidth={2.5} />
                    </button>
                  </div>

                  {/* Games list */}
                  <div className="flex-1 space-y-2">
                    {consoleItem.games.length === 0 ? (
                      <div className="text-center py-6 text-text-muted/40 text-[10px] font-semibold uppercase tracking-wider font-mono">
                        Sem jogos pendentes
                      </div>
                    ) : (
                      <AnimatePresence initial={false}>
                        {consoleItem.games.map(game => {
                          const isChecking = checkingGames[game.id];
                          return (
                            <motion.div
                              key={game.id}
                              initial={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0, padding: 0 }}
                              transition={{ duration: 0.3 }}
                              className="flex items-center gap-3 bg-bg-surface-med/25 hover:bg-bg-surface-med/45 px-3 py-2 rounded-xl border border-outline-variant/15 hover:border-outline-variant/30 group transition-all"
                            >
                              <button
                                type="button"
                                onClick={() => handleMarkAsPlayed(consoleItem.id, game.id)}
                                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                                  isChecking 
                                    ? 'bg-brand-primary border-brand-primary text-black shadow-[0_0_8px_rgba(var(--brand-primary-rgb),0.5)]' 
                                    : 'border-brand-primary/60 bg-brand-primary/5 hover:border-brand-primary hover:bg-brand-primary/15 text-brand-primary'
                                }`}
                              >
                                <Check size={11} strokeWidth={3} className={isChecking ? 'scale-100 text-black' : 'opacity-0 scale-0 group-hover:opacity-100 group-hover:scale-100 transition-all'} />
                              </button>
                              <span className={`text-xs font-semibold flex-1 truncate transition-all ${
                                isChecking ? 'line-through text-text-muted/50' : 'text-text-high'
                              }`}>
                                {game.name}
                              </span>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* GAME ENTRY MODAL FORM */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto" id="game-modal-overlay">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-bg-surface-low border border-outline-variant rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden text-left"
              id="game-modal-body"
            >
              {/* Modal Header */}
              <div className="border-b border-outline-variant/20 px-6 py-5 flex items-center justify-between bg-bg-surface-med/20">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-brand-primary/10 flex items-center justify-center border border-brand-primary/20">
                    <Trophy size={16} className="text-brand-primary" />
                  </div>
                  <h3 className="font-display font-black text-sm text-white uppercase tracking-wider">
                    {editingEntry ? 'Editar Lançamento' : 'Novo Lançamento de Jogo'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="w-8 h-8 rounded-lg bg-bg-surface-med/50 hover:bg-bg-surface-med hover:text-white transition-all text-text-muted flex items-center justify-center cursor-pointer border border-outline-variant/15"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSaveEntry} className="p-6 space-y-5">
                
                {/* Jogo Name (Required) */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-text-muted font-display block">
                    Jogo <span className="text-brand-primary">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    value={formJogo}
                    onChange={e => setFormJogo(e.target.value)}
                    placeholder="Nome do jogo..."
                    className="w-full bg-bg-surface-med/40 border border-outline-variant/40 hover:border-outline-variant/80 focus:border-brand-primary focus:outline-none rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-text-muted/45 transition-all"
                    id="form-input-jogo-name"
                  />
                </div>

                {/* Platforms (At least one must be selected) */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-text-muted font-display block">
                    Plataformas <span className="text-brand-primary">* (Selecione pelo menos uma)</span>
                  </label>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" id="form-platforms-grid">
                    {(['PS3', 'PSVita', 'PS4', 'PS5'] as const).map(p => {
                      const isSelected = formPlatforms.includes(p);
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => togglePlatformInForm(p)}
                          className={`p-3 rounded-2xl border flex items-center justify-center transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-brand-primary/15 border-brand-primary shadow-lg shadow-brand-primary/5'
                              : 'bg-bg-surface-med/20 border-outline-variant/30 hover:border-outline-variant/60'
                          }`}
                          id={`form-btn-platform-${p.toLowerCase()}`}
                          title={p}
                        >
                          <div className="bg-white border border-white/20 rounded-xl p-1.5 w-10 h-10 flex items-center justify-center shadow-sm">
                            <img 
                              src={`/games/${p.toLowerCase()}.png`} 
                              alt={p} 
                              className="w-7 h-7 object-contain" 
                              referrerPolicy="no-referrer"
                              onError={(e) => e.currentTarget.style.display = 'none'}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Trophy counters */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-text-muted font-display block">
                    Quantidade de Troféus
                  </label>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4" id="form-trophies-counters">
                    
                    {/* Platina Counter */}
                    <div className="bg-bg-surface-med/15 border border-outline-variant/20 rounded-2xl p-3 flex flex-col items-center space-y-2">
                      <img src="/games/plat.png" alt="Platina" className="w-7 h-7 object-contain" referrerPolicy="no-referrer" />
                      <input
                        type="number"
                        min="0"
                        max="10"
                        placeholder="0"
                        value={formPlatina}
                        onChange={e => setFormPlatina(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full bg-bg-surface-med/50 border border-outline-variant/30 focus:border-brand-primary rounded-xl px-2 py-1 text-center font-display font-black text-sm text-cyan-100 placeholder:text-text-muted/40 no-spinners"
                      />
                    </div>

                    {/* Ouro Counter */}
                    <div className="bg-bg-surface-med/15 border border-outline-variant/20 rounded-2xl p-3 flex flex-col items-center space-y-2">
                      <img src="/games/gold.png" alt="Ouro" className="w-7 h-7 object-contain" referrerPolicy="no-referrer" />
                      <input
                        type="number"
                        min="0"
                        max="200"
                        placeholder="0"
                        value={formOuro}
                        onChange={e => setFormOuro(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full bg-bg-surface-med/50 border border-outline-variant/30 focus:border-brand-primary rounded-xl px-2 py-1 text-center font-display font-black text-sm text-amber-100 placeholder:text-text-muted/40 no-spinners"
                      />
                    </div>

                    {/* Prata Counter */}
                    <div className="bg-bg-surface-med/15 border border-outline-variant/20 rounded-2xl p-3 flex flex-col items-center space-y-2">
                      <img src="/games/silver.png" alt="Prata" className="w-7 h-7 object-contain" referrerPolicy="no-referrer" />
                      <input
                        type="number"
                        min="0"
                        max="200"
                        placeholder="0"
                        value={formPrata}
                        onChange={e => setFormPrata(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full bg-bg-surface-med/50 border border-outline-variant/30 focus:border-brand-primary rounded-xl px-2 py-1 text-center font-display font-black text-sm text-zinc-100 placeholder:text-text-muted/40 no-spinners"
                      />
                    </div>

                    {/* Bronze Counter */}
                    <div className="bg-bg-surface-med/15 border border-outline-variant/20 rounded-2xl p-3 flex flex-col items-center space-y-2">
                      <img src="/games/bronze.png" alt="Bronze" className="w-7 h-7 object-contain" referrerPolicy="no-referrer" />
                      <input
                        type="number"
                        min="0"
                        max="200"
                        placeholder="0"
                        value={formBronze}
                        onChange={e => setFormBronze(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full bg-bg-surface-med/50 border border-outline-variant/30 focus:border-brand-primary rounded-xl px-2 py-1 text-center font-display font-black text-sm text-amber-100 placeholder:text-text-muted/40 no-spinners"
                      />
                    </div>

                  </div>
                </div>

                {/* Platinum Date (Data da Platina) - Optional */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-text-muted font-display block">
                    Data da Platina (Opcional)
                  </label>
                  <input
                    type="text"
                    maxLength={8}
                    placeholder="dd/mm/aa"
                    value={formDataPlatina}
                    onChange={e => handleDateMask(e.target.value, setFormDataPlatina)}
                    className="w-full bg-bg-surface-med/40 border border-outline-variant/40 hover:border-outline-variant/80 focus:border-brand-primary focus:outline-none rounded-xl px-4 py-2.5 text-xs text-white font-mono transition-all"
                  />
                </div>

                {/* Additional checkboxes (Garapa, Hide) */}
                <div className="grid grid-cols-2 gap-4 bg-bg-surface-med/10 border border-outline-variant/20 rounded-2xl p-4">
                  
                  {/* Garapa Checkbox */}
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formGarapa}
                      onChange={e => setFormGarapa(e.target.checked)}
                      className="w-4.5 h-4.5 rounded border-outline-variant bg-bg-surface-med/50 text-brand-primary focus:ring-brand-primary cursor-pointer"
                    />
                    <span className="text-xs font-black font-display text-white uppercase block">Garapa</span>
                  </label>

                  {/* Hide Checkbox */}
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formHide}
                      onChange={e => setFormHide(e.target.checked)}
                      className="w-4.5 h-4.5 rounded border-outline-variant bg-bg-surface-med/50 text-brand-primary focus:ring-brand-primary cursor-pointer"
                    />
                    <span className="text-xs font-black font-display text-white uppercase block">Ocultar Jogo</span>
                  </label>

                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3 border-t border-outline-variant/20 pt-5 mt-2">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-outline-variant/30 text-xs font-bold text-text-muted hover:text-white transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-brand-primary text-black font-black text-xs uppercase tracking-wider transition-all cursor-pointer hover:brightness-110 shadow-lg shadow-brand-primary/10 flex items-center gap-1.5"
                  >
                    <Check size={14} strokeWidth={3} />
                    <span>Salvar Lançamento</span>
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {gameToDelete && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50" id="delete-confirm-overlay">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="bg-bg-surface-low border border-outline-variant rounded-3xl w-full max-w-md shadow-2xl p-6 text-left"
              id="delete-confirm-modal"
            >
              <div className="flex items-center gap-3 text-red-400 mb-4">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                  <Trash2 size={18} />
                </div>
                <h3 className="font-display font-black text-sm uppercase tracking-wider text-white">
                  Confirmar Exclusão
                </h3>
              </div>
              <p className="text-xs text-text-muted leading-relaxed font-sans mb-6">
                Tem certeza que deseja remover o jogo <strong className="text-white">"{gameToDelete.name}"</strong>? Esta ação não pode ser desfeita.
              </p>
              <div className="flex items-center justify-end gap-3 border-t border-outline-variant/15 pt-4">
                <button
                  type="button"
                  onClick={() => setGameToDelete(null)}
                  className="px-4 py-2.5 rounded-xl border border-outline-variant/30 text-xs font-bold text-text-muted hover:text-white transition-all cursor-pointer font-mono"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteEntry}
                  className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-black transition-all cursor-pointer font-display uppercase tracking-wider shadow-lg shadow-red-500/10"
                >
                  Excluir Jogo
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Reordenar Jogo */}
      <AnimatePresence>
        {isReorderModalOpen && reorderTargetGame && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm shadow-2xl" id="reorder-game-modal-overlay">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-bg-surface-low border border-outline-variant/60 rounded-3xl p-6 space-y-4 shadow-xl text-left flex flex-col max-h-[85vh]"
              id="reorder-game-modal-content"
            >
              {/* Header */}
              <div className="flex items-center gap-2 border-b border-outline-variant/30 pb-3 shrink-0">
                <ArrowUpDown className="text-brand-primary" size={18} />
                <h3 className="font-display font-black text-sm tracking-tight text-white uppercase flex-1">
                  Reordenar Jogo
                </h3>
                <button 
                  onClick={() => {
                    setIsReorderModalOpen(false);
                    setReorderTargetGame(null);
                    setReorderSearchQuery('');
                  }}
                  className="text-text-muted hover:text-white transition-all cursor-pointer p-1 rounded-lg bg-bg-surface-med/30 hover:bg-bg-surface-med"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="text-xs text-text-muted shrink-0">
                Você está movendo: <span className="font-bold text-white uppercase font-display">{reorderTargetGame.jogo}</span>
              </div>

              {/* Quick Actions (Top / Bottom) */}
              <div className="grid grid-cols-2 gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => handleReorderGame(reorderTargetGame.id, 'start')}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-bg-surface-med/50 hover:bg-bg-surface-med border border-outline-variant/30 hover:border-outline-variant/50 text-white font-black text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                >
                  <ArrowUp size={12} className="text-brand-primary" />
                  No início da lista
                </button>
                <button
                  type="button"
                  onClick={() => handleReorderGame(reorderTargetGame.id, 'end')}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-bg-surface-med/50 hover:bg-bg-surface-med border border-outline-variant/30 hover:border-outline-variant/50 text-white font-black text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                >
                  <ArrowDown size={12} className="text-brand-primary" />
                  No fim da lista
                </button>
              </div>

              <div className="border-t border-outline-variant/20 pt-3 flex flex-col flex-1 min-h-0">
                <label className="block text-[10px] uppercase tracking-widest text-[#ffe08b] font-bold font-mono mb-2 shrink-0">
                  Ou escolha um jogo de referência:
                </label>
                
                {/* Search bar */}
                <div className="relative mb-3 shrink-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted/60" size={14} />
                  <input
                    type="text"
                    placeholder="Buscar jogo de referência..."
                    value={reorderSearchQuery}
                    onChange={e => setReorderSearchQuery(e.target.value)}
                    className="w-full bg-black/40 border border-outline-variant/30 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-text-muted/50 focus:border-brand-primary outline-none"
                  />
                  {reorderSearchQuery && (
                    <button
                      onClick={() => setReorderSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-white"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                {/* List of reference games */}
                <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 min-h-[150px] scrollbar-thin scrollbar-thumb-outline-variant/30">
                  {otherGames.length === 0 ? (
                    <div className="text-center py-8 text-text-muted text-xs">
                      Nenhum jogo encontrado.
                    </div>
                  ) : (
                    otherGames.map(game => (
                      <div 
                        key={game.id} 
                        className="flex items-center justify-between bg-bg-surface-med/20 hover:bg-bg-surface-med/30 p-2.5 rounded-xl border border-outline-variant/10 transition-all gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-white truncate uppercase font-display">{game.jogo}</p>
                          <div className="flex gap-1 mt-0.5">
                            {(game.platforms || []).map(p => (
                              <span key={p} className="text-[8px] font-black font-mono text-brand-primary/80 bg-brand-primary/5 border border-brand-primary/10 px-1 rounded">
                                {p}
                              </span>
                            ))}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleReorderGame(reorderTargetGame.id, 'before', game.id)}
                            className="px-2.5 py-1.5 bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary border border-brand-primary/20 hover:border-brand-primary/40 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer"
                            title={`Inserir antes de ${game.jogo}`}
                          >
                            Antes
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReorderGame(reorderTargetGame.id, 'after', game.id)}
                            className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-white border border-outline-variant/30 hover:border-outline-variant/50 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer"
                            title={`Inserir depois de ${game.jogo}`}
                          >
                            Depois
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Footer buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-outline-variant/20 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsReorderModalOpen(false);
                    setReorderTargetGame(null);
                    setReorderSearchQuery('');
                  }}
                  className="text-text-muted hover:text-white font-extrabold uppercase text-[10px] tracking-widest py-2 px-4 transition-all cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Scroll to Top Button */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            onClick={scrollToTop}
            className="fixed bottom-6 md:bottom-24 right-6 z-50 p-3 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20 hover:shadow-red-500/30 transition-all border border-red-400/20 cursor-pointer flex items-center justify-center"
            title="Voltar ao topo"
            id="back-to-top-button"
          >
            <ChevronUp size={20} className="stroke-[3]" />
          </motion.button>
        )}
      </AnimatePresence>

    </div>
  );
}
