import newbornImg from './assets/characters/Newborn.png';
import infantImg from './assets/characters/Infant.png';
import kidImg from './assets/characters/Kid.png';
import teenagerImg from './assets/characters/Teenager.png';
import adultImg from './assets/characters/Adult.png';
import elderImg from './assets/characters/Elder.png';

// Each life stage covers POINTS_PER_STAGE life-points.
// Completing a focus session = +1 life point. Abandoning one = +2 (ages faster).
export const POINTS_PER_STAGE = 2;

export const STAGES = [
  {
    name: 'Newborn',
    milestoneEmoji: '👶',
    tagline: 'Just arrived. Everything is new.',
    bg: '#FFF6E9',
    image: newbornImg,
    pose: 'wobble',
  },
  {
    name: 'Infant',
    milestoneEmoji: '🍼',
    tagline: 'Wobbly, curious, all cheeks.',
    bg: '#FFF1DE',
    image: infantImg,
    pose: 'bounce',
  },
  {
    name: 'Kid',
    milestoneEmoji: '🎒',
    tagline: 'Off to school with a backpack.',
    bg: '#E9F6EA',
    image: kidImg,
    pose: 'bounce',
  },
  {
    name: 'Teenager',
    milestoneEmoji: '🎧',
    tagline: 'Finding their own style.',
    bg: '#E7F1FB',
    image: teenagerImg,
    pose: 'sway',
  },
  {
    name: 'Adult',
    milestoneEmoji: '💼',
    tagline: 'Building a life, one day at a time.',
    bg: '#EFEAFA',
    image: adultImg,
    pose: 'sway',
  },
  {
    name: 'Elder',
    milestoneEmoji: '🌙',
    tagline: 'A long life, well spent.',
    bg: '#ECEFF1',
    image: elderImg,
    pose: 'lean',
  },
];

export const TOTAL_LIFE_POINTS = STAGES.length * POINTS_PER_STAGE;

export function stageIndexForPoints(points) {
  return Math.min(Math.floor(points / POINTS_PER_STAGE), STAGES.length - 1);
}
