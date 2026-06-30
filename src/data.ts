import type { Idol, BhajanTrack } from './types';

export const IDOLS: Idol[] = [
  { id: 'ganesha',  name: 'Ganesha',  emoji: '🐘', description: 'Remover of Obstacles', color: '#FF8C00' },
  { id: 'lakshmi',  name: 'Lakshmi',  emoji: '🪷', description: 'Goddess of Wealth',    color: '#FF69B4' },
  { id: 'shiva',    name: 'Shiva',    emoji: '🔱', description: 'The Destroyer',         color: '#4169E1' },
  { id: 'durga',    name: 'Durga',    emoji: '⚔️',  description: 'Goddess of Power',     color: '#DC143C' },
  { id: 'krishna',  name: 'Krishna',  emoji: '🦚', description: 'The Divine Flute',      color: '#6A0DAD' },
  { id: 'ram',      name: 'Ram',      emoji: '🏹', description: 'The Righteous King',    color: '#228B22' },
  { id: 'hanuman',  name: 'Hanuman',  emoji: '🙏', description: 'The Devoted Warrior',   color: '#FF4500' },
  { id: 'saraswati',name: 'Saraswati',emoji: '🎶', description: 'Goddess of Wisdom',     color: '#00CED1' },
];

export const BHAJANS: BhajanTrack[] = [
  { id: 'om-namah', title: 'Om Namah Shivaya', deity: 'Shiva',   url: '' },
  { id: 'jai-ganesha', title: 'Jai Ganesha', deity: 'Ganesha',   url: '' },
  { id: 'hare-krishna', title: 'Hare Krishna Mahamantra', deity: 'Krishna', url: '' },
  { id: 'jai-ambe', title: 'Jai Ambe Gauri', deity: 'Durga',     url: '' },
  { id: 'hanuman-chalisa', title: 'Hanuman Chalisa', deity: 'Hanuman', url: '' },
  { id: 'lakshmi-aarti', title: 'Lakshmi Aarti', deity: 'Lakshmi', url: '' },
];
