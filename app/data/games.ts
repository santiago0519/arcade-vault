export type Category = 'ARCADE' | 'PUZZLE' | 'SHOOTER' | 'VERSUS';
export type GameColor = 'cyan' | 'magenta' | 'yellow' | 'green';
export interface Game {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: Category;
  cover: string;
  color: GameColor;
}
export const CATS: ('TODOS' | Category)[] = ['TODOS', 'ARCADE', 'PUZZLE', 'SHOOTER', 'VERSUS'];
